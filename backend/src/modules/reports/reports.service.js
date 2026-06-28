import prisma from '../../config/database.js';

const rangeBounds = (from, to) => {
  const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Revenue report: total collected, outstanding, and payment-method breakdown.
 */
export const revenueReport = async (clinicId, from, to) => {
  const { start, end } = rangeBounds(from, to);

  const [collected, byMethod, billed, outstanding] = await prisma.$transaction([
    prisma.payment.aggregate({
      _sum: { amount: true }, _count: true,
      where: { bill: { clinicId, deletedAt: null }, paidAt: { gte: start, lte: end } },
    }),
    prisma.payment.groupBy({
      by: ['method'], _sum: { amount: true },
      where: { bill: { clinicId, deletedAt: null }, paidAt: { gte: start, lte: end } },
    }),
    prisma.bill.aggregate({
      _sum: { totalAmount: true }, _count: true,
      where: { clinicId, deletedAt: null, billDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
    }),
    prisma.bill.aggregate({
      _sum: { dueAmount: true },
      where: { clinicId, deletedAt: null, paymentStatus: { in: ['PENDING', 'PARTIAL'] } },
    }),
  ]);

  return {
    range: { from: start, to: end },
    totalCollected: Number(collected._sum.amount || 0),
    paymentCount: collected._count,
    totalBilled: Number(billed._sum.totalAmount || 0),
    billCount: billed._count,
    totalOutstanding: Number(outstanding._sum.dueAmount || 0),
    byMethod: byMethod.map((m) => ({ method: m.method, amount: Number(m._sum.amount || 0) })),
  };
};

/**
 * Patient report: new vs returning over a date range.
 */
export const patientReport = async (clinicId, from, to) => {
  const { start, end } = rangeBounds(from, to);

  const [newPatients, totalPatients, appointmentsInRange] = await prisma.$transaction([
    prisma.patient.count({ where: { clinicId, deletedAt: null, createdAt: { gte: start, lte: end } } }),
    prisma.patient.count({ where: { clinicId, deletedAt: null } }),
    prisma.appointment.groupBy({
      by: ['patientId'],
      where: { clinicId, deletedAt: null, scheduledAt: { gte: start, lte: end } },
    }),
  ]);

  const uniqueVisitors = appointmentsInRange.length;

  return {
    range: { from: start, to: end },
    newPatients,
    totalPatients,
    uniqueVisitors,
    returningPatients: Math.max(uniqueVisitors - newPatients, 0),
  };
};

/**
 * Doctor performance: appointment volume and revenue per doctor.
 */
export const doctorPerformance = async (clinicId, from, to) => {
  const { start, end } = rangeBounds(from, to);

  const doctors = await prisma.user.findMany({
    where: { clinicId, role: 'DOCTOR', deletedAt: null },
    select: { id: true, firstName: true, lastName: true },
  });

  const results = await Promise.all(
    doctors.map(async (doc) => {
      const [completed, total] = await prisma.$transaction([
        prisma.appointment.count({
          where: { clinicId, doctorId: doc.id, deletedAt: null, status: 'COMPLETED', scheduledAt: { gte: start, lte: end } },
        }),
        prisma.appointment.count({
          where: { clinicId, doctorId: doc.id, deletedAt: null, scheduledAt: { gte: start, lte: end } },
        }),
      ]);
      return {
        doctorId: doc.id,
        name: `${doc.firstName} ${doc.lastName}`,
        completedAppointments: completed,
        totalAppointments: total,
      };
    })
  );

  return { range: { from: start, to: end }, doctors: results };
};
