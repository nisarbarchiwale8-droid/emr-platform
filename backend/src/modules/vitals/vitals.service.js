import prisma from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createAuditLog } from '../../utils/audit.js';
import { AUDIT_ACTIONS } from '../../utils/constants.js';
import { computeBmi } from '../../utils/generators.js';

/**
 * Upsert vitals for an appointment (one vitals record per appointment).
 */
export const saveVitals = async (clinicId, userId, appointmentId, data, meta) => {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId, deletedAt: null },
  });
  if (!appointment) throw new AppError('Appointment not found', 404);

  const bmi = computeBmi(data.weight, data.height);

  const payload = {
    temperature: data.temperature ?? null,
    systolicBP: data.systolicBP ?? null,
    diastolicBP: data.diastolicBP ?? null,
    pulseRate: data.pulseRate ?? null,
    respiratoryRate: data.respiratoryRate ?? null,
    oxygenSaturation: data.oxygenSaturation ?? null,
    weight: data.weight ?? null,
    height: data.height ?? null,
    bmi,
    bloodGlucose: data.bloodGlucose ?? null,
    notes: data.notes ?? null,
  };

  const vitals = await prisma.vitals.upsert({
    where: { appointmentId },
    create: { appointmentId, recordedById: userId, ...payload },
    update: payload,
  });

  await createAuditLog({
    clinicId, userId, action: AUDIT_ACTIONS.CREATE, entity: 'Vitals',
    entityId: vitals.id, newValues: { appointmentId }, ...meta,
  });

  return vitals;
};

export const getVitals = async (clinicId, appointmentId) => {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId, deletedAt: null },
    select: { id: true },
  });
  if (!appointment) throw new AppError('Appointment not found', 404);

  return prisma.vitals.findUnique({
    where: { appointmentId },
    include: { recordedBy: { select: { firstName: true, lastName: true } } },
  });
};
