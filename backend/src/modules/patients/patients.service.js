import prisma from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createAuditLog } from '../../utils/audit.js';
import { AUDIT_ACTIONS } from '../../utils/constants.js';
import { buildUhid, computeAge } from '../../utils/generators.js';

const PATIENT_SELECT = {
  id: true,
  uhid: true,
  firstName: true,
  lastName: true,
  phone: true,
  alternatePhone: true,
  email: true,
  dateOfBirth: true,
  age: true,
  gender: true,
  bloodGroup: true,
  address: true,
  city: true,
  pincode: true,
  emergencyName: true,
  emergencyPhone: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Generate the next per-clinic UHID inside a transaction.
 */
const nextUhid = async (tx, clinicId) => {
  const count = await tx.patient.count({ where: { clinicId } });
  return buildUhid(count + 1);
};

export const createPatient = async (clinicId, userId, data, meta) => {
  const age = data.dateOfBirth ? computeAge(data.dateOfBirth) : data.age ?? null;

  const patient = await prisma.$transaction(async (tx) => {
    const uhid = await nextUhid(tx, clinicId);
    return tx.patient.create({
      data: {
        clinicId,
        uhid,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        alternatePhone: data.alternatePhone ?? null,
        email: data.email ?? null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        age,
        gender: data.gender,
        bloodGroup: data.bloodGroup ?? 'UNKNOWN',
        address: data.address ?? null,
        city: data.city ?? null,
        pincode: data.pincode ?? null,
        emergencyName: data.emergencyName ?? null,
        emergencyPhone: data.emergencyPhone ?? null,
        notes: data.notes ?? null,
      },
      select: PATIENT_SELECT,
    });
  });

  await createAuditLog({
    clinicId,
    userId,
    action: AUDIT_ACTIONS.CREATE,
    entity: 'Patient',
    entityId: patient.id,
    newValues: { uhid: patient.uhid, name: `${patient.firstName} ${patient.lastName}` },
    ...meta,
  });

  return patient;
};

export const listPatients = async (clinicId, { search, skip, limit, orderBy }) => {
  const where = {
    clinicId,
    deletedAt: null,
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { uhid: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [patients, total] = await prisma.$transaction([
    prisma.patient.findMany({ where, select: PATIENT_SELECT, skip, take: limit, orderBy }),
    prisma.patient.count({ where }),
  ]);

  return { patients, total };
};

export const getPatientById = async (clinicId, id) => {
  const patient = await prisma.patient.findFirst({
    where: { id, clinicId, deletedAt: null },
    select: {
      ...PATIENT_SELECT,
      appointments: {
        where: { deletedAt: null },
        orderBy: { scheduledAt: 'desc' },
        take: 20,
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          chiefComplaint: true,
          doctor: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!patient) throw new AppError('Patient not found', 404);
  return patient;
};

export const updatePatient = async (clinicId, userId, id, data, meta) => {
  const existing = await prisma.patient.findFirst({ where: { id, clinicId, deletedAt: null } });
  if (!existing) throw new AppError('Patient not found', 404);

  const age = data.dateOfBirth ? computeAge(data.dateOfBirth) : data.age ?? existing.age;

  const patient = await prisma.patient.update({
    where: { id },
    data: {
      firstName: data.firstName ?? existing.firstName,
      lastName: data.lastName ?? existing.lastName,
      phone: data.phone ?? existing.phone,
      alternatePhone: data.alternatePhone ?? existing.alternatePhone,
      email: data.email ?? existing.email,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : existing.dateOfBirth,
      age,
      gender: data.gender ?? existing.gender,
      bloodGroup: data.bloodGroup ?? existing.bloodGroup,
      address: data.address ?? existing.address,
      city: data.city ?? existing.city,
      pincode: data.pincode ?? existing.pincode,
      emergencyName: data.emergencyName ?? existing.emergencyName,
      emergencyPhone: data.emergencyPhone ?? existing.emergencyPhone,
      notes: data.notes ?? existing.notes,
    },
    select: PATIENT_SELECT,
  });

  await createAuditLog({
    clinicId,
    userId,
    action: AUDIT_ACTIONS.UPDATE,
    entity: 'Patient',
    entityId: id,
    oldValues: { name: `${existing.firstName} ${existing.lastName}`, phone: existing.phone },
    newValues: { name: `${patient.firstName} ${patient.lastName}`, phone: patient.phone },
    ...meta,
  });

  return patient;
};

export const deletePatient = async (clinicId, userId, id, meta) => {
  const existing = await prisma.patient.findFirst({ where: { id, clinicId, deletedAt: null } });
  if (!existing) throw new AppError('Patient not found', 404);

  await prisma.patient.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  await createAuditLog({
    clinicId,
    userId,
    action: AUDIT_ACTIONS.DELETE,
    entity: 'Patient',
    entityId: id,
    oldValues: { uhid: existing.uhid, name: `${existing.firstName} ${existing.lastName}` },
    ...meta,
  });
};
