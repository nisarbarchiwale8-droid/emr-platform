import prisma from '../../config/database.js';

const dayBounds = (dateStr) => {
  const base = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(base); start.setHours(0, 0, 0, 0);
  const end = new Date(base); end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Live queue for a clinic/doctor on a given day.
 * Ordered by token number; patients currently IN_QUEUE or IN_CONSULTATION.
 */
export const getQueue = async (clinicId, { date, doctorId }) => {
  const { start, end } = dayBounds(date);
  const where = {
    clinicId,
    deletedAt: null,
    scheduledAt: { gte: start, lte: end },
    status: { in: ['IN_QUEUE', 'IN_CONSULTATION'] },
    ...(doctorId && { doctorId }),
  };

  const items = await prisma.appointment.findMany({
    where,
    orderBy: [{ status: 'desc' }, { tokenNumber: 'asc' }],
    select: {
      id: true,
      tokenNumber: true,
      status: true,
      chiefComplaint: true,
      scheduledAt: true,
      patient: { select: { id: true, uhid: true, firstName: true, lastName: true, age: true, gender: true } },
      doctor: { select: { id: true, firstName: true, lastName: true } },
      vitals: { select: { id: true } },
    },
  });

  const waiting = items.filter((i) => i.status === 'IN_QUEUE').length;
  const inConsultation = items.filter((i) => i.status === 'IN_CONSULTATION').length;

  return { items, summary: { total: items.length, waiting, inConsultation } };
};
