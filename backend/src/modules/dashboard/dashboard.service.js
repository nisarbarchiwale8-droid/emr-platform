import prisma from '../../config/database.js';

const todayBounds = () => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
};

const monthBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

/**
 * Aggregated KPI snapshot for the dashboard, scoped to a clinic.
 */
export const getDashboardStats = async (clinicId) => {
  const { start: todayStart, end: todayEnd } = todayBounds();
  const { start: monthStart, end: monthEnd } = monthBounds();

  const [
    todaysPatients,
    todaysAppointments,
    queueLength,
    todaysRevenue,
    monthlyRevenue,
    pendingPaymentsAgg,
    totalActivePatients,
  ] = await prisma.$transaction([
    prisma.appointment.count({
      where: { clinicId, deletedAt: null, scheduledAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.appointment.count({
      where: { clinicId, deletedAt: null, scheduledAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.appointment.count({
      where: { clinicId, deletedAt: null, status: { in: ['IN_QUEUE', 'IN_CONSULTATION'] }, scheduledAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { bill: { clinicId, deletedAt: null }, paidAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { bill: { clinicId, deletedAt: null }, paidAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.bill.aggregate({
      _sum: { dueAmount: true },
      _count: true,
      where: { clinicId, deletedAt: null, paymentStatus: { in: ['PENDING', 'PARTIAL'] } },
    }),
    prisma.patient.count({ where: { clinicId, deletedAt: null } }),
  ]);

  return {
    todaysPatients,
    todaysAppointments,
    queueLength,
    todaysRevenue: Number(todaysRevenue._sum.amount || 0),
    monthlyRevenue: Number(monthlyRevenue._sum.amount || 0),
    pendingAmount: Number(pendingPaymentsAgg._sum.dueAmount || 0),
    pendingBillsCount: pendingPaymentsAgg._count,
    totalActivePatients,
  };
};

/**
 * Today's appointment list for the dashboard panel.
 */
export const getTodaysAppointments = async (clinicId, doctorId) => {
  const { start, end } = todayBounds();
  return prisma.appointment.findMany({
    where: {
      clinicId, deletedAt: null,
      scheduledAt: { gte: start, lte: end },
      ...(doctorId && { doctorId }),
    },
    orderBy: { scheduledAt: 'asc' },
    take: 10,
    select: {
      id: true, scheduledAt: true, status: true, tokenNumber: true, chiefComplaint: true,
      patient: { select: { firstName: true, lastName: true, uhid: true } },
      doctor: { select: { firstName: true, lastName: true } },
    },
  });
};
