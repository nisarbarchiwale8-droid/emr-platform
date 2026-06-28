import prisma from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createAuditLog } from '../../utils/audit.js';
import { AUDIT_ACTIONS } from '../../utils/constants.js';

const APPOINTMENT_INCLUDE = {
  patient: { select: { id: true, uhid: true, firstName: true, lastName: true, phone: true, gender: true, age: true } },
  doctor: { select: { id: true, firstName: true, lastName: true } },
};

const dayBounds = (dateStr) => {
  const base = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(base); start.setHours(0, 0, 0, 0);
  const end = new Date(base); end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const createAppointment = async (clinicId, userId, data, meta) => {
  const patient = await prisma.patient.findFirst({ where: { id: data.patientId, clinicId, deletedAt: null } });
  if (!patient) throw new AppError('Patient not found', 404);

  const doctor = await prisma.user.findFirst({ where: { id: data.doctorId, clinicId, role: 'DOCTOR', deletedAt: null } });
  if (!doctor) throw new AppError('Doctor not found', 404);

  const scheduledAt = new Date(data.scheduledAt);

  // Prevent double-booking the exact same slot for a doctor
  const clash = await prisma.appointment.findFirst({
    where: {
      doctorId: data.doctorId,
      scheduledAt,
      status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
      deletedAt: null,
    },
  });
  if (clash) throw new AppError('Doctor already has an appointment at this time', 409);

  const appointment = await prisma.appointment.create({
    data: {
      clinicId,
      patientId: data.patientId,
      doctorId: data.doctorId,
      scheduledAt,
      type: data.type || 'CONSULTATION',
      chiefComplaint: data.chiefComplaint ?? null,
      notes: data.notes ?? null,
      status: 'SCHEDULED',
    },
    include: APPOINTMENT_INCLUDE,
  });

  await createAuditLog({
    clinicId, userId, action: AUDIT_ACTIONS.CREATE, entity: 'Appointment',
    entityId: appointment.id, newValues: { patientId: data.patientId, scheduledAt }, ...meta,
  });

  return appointment;
};

export const listAppointments = async (clinicId, filters) => {
  const { date, doctorId, patientId, status, skip, limit, orderBy } = filters;
  const where = { clinicId, deletedAt: null };

  if (date) {
    const { start, end } = dayBounds(date);
    where.scheduledAt = { gte: start, lte: end };
  }
  if (doctorId) where.doctorId = doctorId;
  if (patientId) where.patientId = patientId;
  if (status) where.status = status;

  const [appointments, total] = await prisma.$transaction([
    prisma.appointment.findMany({ where, include: APPOINTMENT_INCLUDE, skip, take: limit, orderBy }),
    prisma.appointment.count({ where }),
  ]);

  return { appointments, total };
};

export const getAppointmentById = async (clinicId, id) => {
  const appointment = await prisma.appointment.findFirst({
    where: { id, clinicId, deletedAt: null },
    include: {
      ...APPOINTMENT_INCLUDE,
      vitals: true,
      soapNote: { include: { diagnoses: true, prescriptions: true } },
      bill: { select: { id: true, billNumber: true, totalAmount: true, paymentStatus: true } },
    },
  });
  if (!appointment) throw new AppError('Appointment not found', 404);
  return appointment;
};

export const updateAppointment = async (clinicId, userId, id, data, meta) => {
  const existing = await prisma.appointment.findFirst({ where: { id, clinicId, deletedAt: null } });
  if (!existing) throw new AppError('Appointment not found', 404);

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : existing.scheduledAt,
      doctorId: data.doctorId ?? existing.doctorId,
      type: data.type ?? existing.type,
      chiefComplaint: data.chiefComplaint ?? existing.chiefComplaint,
      notes: data.notes ?? existing.notes,
    },
    include: APPOINTMENT_INCLUDE,
  });

  await createAuditLog({
    clinicId, userId, action: AUDIT_ACTIONS.UPDATE, entity: 'Appointment', entityId: id, ...meta,
  });

  return appointment;
};

const VALID_TRANSITIONS = {
  SCHEDULED: ['CONFIRMED', 'IN_QUEUE', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['IN_QUEUE', 'CANCELLED', 'NO_SHOW'],
  IN_QUEUE: ['IN_CONSULTATION', 'CANCELLED', 'NO_SHOW'],
  IN_CONSULTATION: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const updateStatus = async (clinicId, userId, id, status, meta) => {
  const existing = await prisma.appointment.findFirst({ where: { id, clinicId, deletedAt: null } });
  if (!existing) throw new AppError('Appointment not found', 404);

  const allowed = VALID_TRANSITIONS[existing.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(`Cannot change status from ${existing.status} to ${status}`, 422);
  }

  const data = { status };

  // Assign a queue token number when entering the queue
  if (status === 'IN_QUEUE') {
    const { start, end } = dayBounds(existing.scheduledAt);
    const todaysQueueCount = await prisma.appointment.count({
      where: {
        clinicId, doctorId: existing.doctorId,
        scheduledAt: { gte: start, lte: end },
        tokenNumber: { not: null }, deletedAt: null,
      },
    });
    data.tokenNumber = todaysQueueCount + 1;
  }

  const appointment = await prisma.appointment.update({
    where: { id }, data, include: APPOINTMENT_INCLUDE,
  });

  await createAuditLog({
    clinicId, userId, action: AUDIT_ACTIONS.UPDATE, entity: 'Appointment',
    entityId: id, oldValues: { status: existing.status }, newValues: { status }, ...meta,
  });

  return appointment;
};

export const cancelAppointment = async (clinicId, userId, id, meta) => {
  return updateStatus(clinicId, userId, id, 'CANCELLED', meta);
};

export const listDoctors = async (clinicId) => {
  return prisma.user.findMany({
    where: { clinicId, role: 'DOCTOR', status: 'ACTIVE', deletedAt: null },
    select: {
      id: true, firstName: true, lastName: true,
      doctorProfile: { select: { specialization: true, consultationFee: true, followUpFee: true } },
    },
    orderBy: { firstName: 'asc' },
  });
};
