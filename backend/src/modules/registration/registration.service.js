import Razorpay from 'razorpay';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { sendClinicWelcomeEmail } from '../../utils/mailer.js';
import { logger } from '../../utils/logger.js';

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

const generateClinicCode = (name) => {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${suffix}`;
};

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const listPlansService = async () => {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: 'asc' },
  });
};

export const createOrderService = async ({ planId, clinicName, adminEmail }) => {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new AppError('Plan not found', 404);

  // Check email not already registered
  const existing = await prisma.user.findFirst({ where: { email: adminEmail.toLowerCase() } });
  if (existing) throw new AppError('An account with this email already exists', 409);

  const amountPaise = Math.round(Number(plan.price) * 100);

  let order;
  if (env.RAZORPAY_KEY_ID && !env.RAZORPAY_KEY_ID.includes('XXXX')) {
    order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `clinic_${Date.now()}`,
      notes: { planId, clinicName, adminEmail },
    });
  } else {
    // Dev mode — skip real Razorpay call
    order = {
      id: `dev_order_${Date.now()}`,
      amount: amountPaise,
      currency: 'INR',
      status: 'created',
    };
    logger.warn('[Registration] Razorpay not configured — using dev order');
  }

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
    plan: { id: plan.id, name: plan.name, price: plan.price },
  };
};

export const verifyAndActivateService = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  planId,
  clinicName,
  adminFirstName,
  adminLastName,
  adminEmail,
  adminPhone,
  address,
  city,
  state,
  pincode,
  gstin,
}) => {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new AppError('Plan not found', 404);

  // Verify Razorpay signature (skip in dev mode)
  const isDevMode = !env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET.includes('XXXX');
  if (!isDevMode) {
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new AppError('Payment verification failed', 400);
    }
  }

  // Check email not taken
  const existing = await prisma.user.findFirst({ where: { email: adminEmail.toLowerCase() } });
  if (existing) throw new AppError('An account with this email already exists', 409);

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);
  const clinicCode = generateClinicCode(clinicName);

  const now = new Date();
  const periodEnd = new Date(now);
  if (plan.billingCycle === 'MONTHLY') periodEnd.setMonth(periodEnd.getMonth() + 1);
  else if (plan.billingCycle === 'QUARTERLY') periodEnd.setMonth(periodEnd.getMonth() + 3);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  // Create clinic + admin user + subscription in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({
      data: {
        name: clinicName,
        code: clinicCode,
        address,
        city,
        state,
        pincode,
        gstin,
        email: adminEmail,
        isActive: true,
      },
    });

    const user = await tx.user.create({
      data: {
        clinicId: clinic.id,
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail.toLowerCase(),
        phone: adminPhone,
        passwordHash,
        role: 'ADMINISTRATOR',
        status: 'ACTIVE',
      },
    });

    const subscription = await tx.subscription.create({
      data: {
        clinicId: clinic.id,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        amount: plan.price,
      },
    });

    return { clinic, user, subscription };
  });

  // Send welcome email (non-blocking)
  sendClinicWelcomeEmail({
    to: adminEmail,
    firstName: adminFirstName,
    clinicName,
    email: adminEmail,
    password: tempPassword,
    planName: plan.name,
  }).catch((err) => logger.error(`Welcome email failed: ${err.message}`));

  return {
    clinicId: result.clinic.id,
    clinicName: result.clinic.name,
    clinicCode: result.clinic.code,
    adminEmail,
    message: 'Clinic registered successfully. Login credentials sent to your email.',
  };
};
