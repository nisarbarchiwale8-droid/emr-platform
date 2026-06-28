import prisma from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createAuditLog } from '../../utils/audit.js';
import { AUDIT_ACTIONS } from '../../utils/constants.js';
import { buildBillNumber } from '../../utils/generators.js';

const BILL_INCLUDE = {
  patient: { select: { id: true, uhid: true, firstName: true, lastName: true, phone: true } },
  lineItems: true,
  payments: { orderBy: { paidAt: 'desc' } },
  createdBy: { select: { firstName: true, lastName: true } },
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Compute monetary totals from line items + discount + tax.
 * All math in JS numbers, persisted as Prisma Decimal.
 */
const computeTotals = (items, discountAmount = 0, discountPercent = 0, taxPercent = 0) => {
  const subtotal = round2(items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));

  let discount = round2(Number(discountAmount) || 0);
  if (discountPercent > 0) discount = round2((subtotal * discountPercent) / 100);

  const taxable = Math.max(subtotal - discount, 0);
  const taxAmount = round2((taxable * (Number(taxPercent) || 0)) / 100);
  const totalAmount = round2(taxable + taxAmount);

  return { subtotal, discount, taxAmount, totalAmount };
};

const paymentStatusFor = (total, paid) => {
  if (paid <= 0) return 'PENDING';
  if (paid >= total) return 'PAID';
  return 'PARTIAL';
};

const billStatusFor = (total, paid) => {
  if (paid <= 0) return 'FINALIZED';
  if (paid >= total) return 'PAID';
  return 'PARTIALLY_PAID';
};

const nextBillNumber = async (tx, clinicId) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await tx.bill.count({
    where: { clinicId, createdAt: { gte: monthStart } },
  });
  return buildBillNumber(count + 1, now);
};

export const createBill = async (clinicId, userId, data, meta) => {
  const patient = await prisma.patient.findFirst({ where: { id: data.patientId, clinicId, deletedAt: null } });
  if (!patient) throw new AppError('Patient not found', 404);

  if (data.appointmentId) {
    const existing = await prisma.bill.findUnique({ where: { appointmentId: data.appointmentId } });
    if (existing) throw new AppError('A bill already exists for this appointment', 409);
  }

  const items = data.lineItems.map((i) => ({
    description: i.description,
    category: i.category || 'OTHER',
    quantity: parseInt(i.quantity, 10) || 1,
    unitPrice: round2(Number(i.unitPrice) || 0),
  }));

  const { subtotal, discount, taxAmount, totalAmount } = computeTotals(
    items, data.discountAmount, data.discountPercent, data.taxPercent
  );

  const bill = await prisma.$transaction(async (tx) => {
    const billNumber = await nextBillNumber(tx, clinicId);
    return tx.bill.create({
      data: {
        clinicId,
        patientId: data.patientId,
        appointmentId: data.appointmentId ?? null,
        billNumber,
        subtotal,
        discountAmount: discount,
        discountPercent: Number(data.discountPercent) || 0,
        taxAmount,
        totalAmount,
        dueAmount: totalAmount,
        paidAmount: 0,
        status: 'FINALIZED',
        paymentStatus: 'PENDING',
        notes: data.notes ?? null,
        createdById: userId,
        lineItems: {
          create: items.map((i) => ({
            description: i.description,
            category: i.category,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: round2(i.quantity * i.unitPrice),
          })),
        },
      },
      include: BILL_INCLUDE,
    });
  });

  await createAuditLog({
    clinicId, userId, action: AUDIT_ACTIONS.CREATE, entity: 'Bill',
    entityId: bill.id, newValues: { billNumber: bill.billNumber, totalAmount }, ...meta,
  });

  return bill;
};

export const listBills = async (clinicId, filters) => {
  const { search, paymentStatus, patientId, skip, limit, orderBy } = filters;
  const where = {
    clinicId,
    deletedAt: null,
    ...(paymentStatus && { paymentStatus }),
    ...(patientId && { patientId }),
    ...(search && {
      OR: [
        { billNumber: { contains: search, mode: 'insensitive' } },
        { patient: { firstName: { contains: search, mode: 'insensitive' } } },
        { patient: { lastName: { contains: search, mode: 'insensitive' } } },
        { patient: { phone: { contains: search } } },
      ],
    }),
  };

  const [bills, total] = await prisma.$transaction([
    prisma.bill.findMany({ where, include: BILL_INCLUDE, skip, take: limit, orderBy }),
    prisma.bill.count({ where }),
  ]);

  return { bills, total };
};

export const getBillById = async (clinicId, id) => {
  const bill = await prisma.bill.findFirst({
    where: { id, clinicId, deletedAt: null },
    include: { ...BILL_INCLUDE, clinic: { select: { name: true, address: true, city: true, phone: true, gstin: true } } },
  });
  if (!bill) throw new AppError('Bill not found', 404);
  return bill;
};

/**
 * Record a payment against a bill and recompute its paid/due status atomically.
 */
export const recordPayment = async (clinicId, userId, billId, data, meta) => {
  const bill = await prisma.bill.findFirst({ where: { id: billId, clinicId, deletedAt: null } });
  if (!bill) throw new AppError('Bill not found', 404);
  if (bill.status === 'CANCELLED') throw new AppError('Cannot pay a cancelled bill', 422);

  const amount = round2(Number(data.amount));
  if (amount <= 0) throw new AppError('Payment amount must be greater than zero', 422);

  const currentPaid = Number(bill.paidAmount);
  const total = Number(bill.totalAmount);
  if (amount > round2(total - currentPaid)) {
    throw new AppError('Payment exceeds the outstanding due amount', 422);
  }

  const newPaid = round2(currentPaid + amount);
  const newDue = round2(total - newPaid);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        billId,
        amount,
        method: data.method,
        referenceNo: data.referenceNo ?? null,
        notes: data.notes ?? null,
      },
    });

    return tx.bill.update({
      where: { id: billId },
      data: {
        paidAmount: newPaid,
        dueAmount: newDue,
        paymentStatus: paymentStatusFor(total, newPaid),
        status: billStatusFor(total, newPaid),
      },
      include: BILL_INCLUDE,
    });
  });

  await createAuditLog({
    clinicId, userId, action: AUDIT_ACTIONS.UPDATE, entity: 'Bill',
    entityId: billId, newValues: { payment: amount, method: data.method }, ...meta,
  });

  return updated;
};

export const cancelBill = async (clinicId, userId, billId, meta) => {
  const bill = await prisma.bill.findFirst({ where: { id: billId, clinicId, deletedAt: null } });
  if (!bill) throw new AppError('Bill not found', 404);
  if (Number(bill.paidAmount) > 0) throw new AppError('Cannot cancel a bill with payments. Issue a refund instead.', 422);

  const updated = await prisma.bill.update({
    where: { id: billId },
    data: { status: 'CANCELLED', paymentStatus: 'WAIVED' },
    include: BILL_INCLUDE,
  });

  await createAuditLog({
    clinicId, userId, action: AUDIT_ACTIONS.UPDATE, entity: 'Bill',
    entityId: billId, newValues: { status: 'CANCELLED' }, ...meta,
  });

  return updated;
};
