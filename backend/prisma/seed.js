import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Subscription Plans
  const plans = [
    {
      name: 'Starter',
      slug: 'starter',
      description: 'Perfect for solo practitioners',
      price: 999,
      billingCycle: 'MONTHLY',
      maxDoctors: 1,
      maxPatients: 500,
      features: ['EMR & SOAP Notes', 'Patient Management', 'Appointment Queue', 'Basic Reports', 'Email Support'],
    },
    {
      name: 'Growth',
      slug: 'growth',
      description: 'Ideal for small clinics with 2-3 doctors',
      price: 2499,
      billingCycle: 'MONTHLY',
      maxDoctors: 3,
      maxPatients: 2000,
      features: ['Everything in Starter', 'Billing & Invoicing', 'Prescription Management', 'Advanced Reports', 'Priority Support', 'Multi-doctor Queue'],
    },
    {
      name: 'Pro',
      slug: 'pro',
      description: 'For established clinics scaling up',
      price: 4999,
      billingCycle: 'MONTHLY',
      maxDoctors: 5,
      maxPatients: 10000,
      features: ['Everything in Growth', 'Voice-to-Text EMR', 'Audit Logs', 'API Access', 'Dedicated Support', 'Custom Branding'],
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: { price: plan.price, features: plan.features },
      create: plan,
    });
  }
  console.log('✅ Subscription plans seeded');

  const clinic = await prisma.clinic.upsert({
    where: { code: 'CLINIC001' },
    update: {},
    create: {
      name: 'Demo Clinic',
      code: 'CLINIC001',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '9999999999',
      email: 'clinic@demo.com',
    },
  });

  const passwordHash = await bcrypt.hash('Admin@1234', 12);

  const admin = await prisma.user.upsert({
    where: { email_clinicId: { email: 'admin@demo.com', clinicId: clinic.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@demo.com',
      passwordHash,
      role: 'ADMINISTRATOR',
    },
  });

  const doctorHash = await bcrypt.hash('Doctor@1234', 12);

  const doctor = await prisma.user.upsert({
    where: { email_clinicId: { email: 'doctor@demo.com', clinicId: clinic.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'doctor@demo.com',
      passwordHash: doctorHash,
      role: 'DOCTOR',
      doctorProfile: {
        create: {
          specialization: 'General Physician',
          qualification: 'MBBS, MD',
          registrationNo: 'MH12345',
          consultationFee: 500,
          followUpFee: 300,
        },
      },
    },
  });

  const receptionistHash = await bcrypt.hash('Staff@1234', 12);

  await prisma.user.upsert({
    where: { email_clinicId: { email: 'receptionist@demo.com', clinicId: clinic.id } },
    update: {},
    create: {
      clinicId: clinic.id,
      firstName: 'Meena',
      lastName: 'Patel',
      email: 'receptionist@demo.com',
      passwordHash: receptionistHash,
      role: 'RECEPTIONIST',
    },
  });

  console.log('✅ Seed complete');
  console.log('─────────────────────────────────');
  console.log('Clinic   :', clinic.name);
  console.log('Admin    : admin@demo.com / Admin@1234');
  console.log('Doctor   : doctor@demo.com / Doctor@1234');
  console.log('Staff    : receptionist@demo.com / Staff@1234');
  console.log('─────────────────────────────────');
}

main()
  .catch((e) => { console.error('Seed failed (non-fatal):', e.message); })
  .finally(() => prisma.$disconnect());
