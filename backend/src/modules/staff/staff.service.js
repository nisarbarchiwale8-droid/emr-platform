import bcrypt from 'bcryptjs';
import prisma from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createAuditLog } from '../../utils/audit.js';
import { AUDIT_ACTIONS } from '../../utils/constants.js';

const STAFF_SELECT = {
  id: true, firstName: true, lastName: true, email: true, phone: true,
  role: true, status: true, lastLoginAt: true, createdAt: true,
  doctorProfile: {
    select: { specialization: true, qualification: true, registrationNo: true, consultationFee: true, followUpFee: true },
  },
};

export const listStaff = async (clinicId, { search, role, skip, limit, orderBy }) => {
  const where = {
    clinicId,
    deletedAt: null,
    ...(role && { role }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [staff, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: STAFF_SELECT, skip, take: limit, orderBy }),
    prisma.user.count({ where }),
  ]);

  return { staff, total };
};

export const createStaff = async (clinicId, actorId, data, meta) => {
  const email = data.email.toLowerCase();
  const existing = await prisma.user.findFirst({ where: { email, clinicId } });
  if (existing) throw new AppError('A user with this email already exists', 409);

  const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      clinicId,
      firstName: data.firstName,
      lastName: data.lastName,
      email,
      phone: data.phone ?? null,
      passwordHash,
      role: data.role,
      ...(data.role === 'DOCTOR' && {
        doctorProfile: {
          create: {
            specialization: data.specialization ?? null,
            qualification: data.qualification ?? null,
            registrationNo: data.registrationNo ?? null,
            consultationFee: data.consultationFee ?? 0,
            followUpFee: data.followUpFee ?? 0,
          },
        },
      }),
    },
    select: STAFF_SELECT,
  });

  await createAuditLog({
    clinicId, userId: actorId, action: AUDIT_ACTIONS.CREATE, entity: 'User',
    entityId: user.id, newValues: { email, role: data.role }, ...meta,
  });

  return user;
};

export const updateStaff = async (clinicId, actorId, id, data, meta) => {
  const existing = await prisma.user.findFirst({ where: { id, clinicId, deletedAt: null } });
  if (!existing) throw new AppError('Staff member not found', 404);

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        firstName: data.firstName ?? existing.firstName,
        lastName: data.lastName ?? existing.lastName,
        phone: data.phone ?? existing.phone,
        status: data.status ?? existing.status,
      },
    });

    if (existing.role === 'DOCTOR' && (data.specialization !== undefined || data.consultationFee !== undefined)) {
      await tx.doctorProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          specialization: data.specialization ?? null,
          qualification: data.qualification ?? null,
          registrationNo: data.registrationNo ?? null,
          consultationFee: data.consultationFee ?? 0,
          followUpFee: data.followUpFee ?? 0,
        },
        update: {
          specialization: data.specialization,
          qualification: data.qualification,
          registrationNo: data.registrationNo,
          consultationFee: data.consultationFee,
          followUpFee: data.followUpFee,
        },
      });
    }

    return updated;
  });

  await createAuditLog({
    clinicId, userId: actorId, action: AUDIT_ACTIONS.UPDATE, entity: 'User', entityId: id, ...meta,
  });

  return prisma.user.findUnique({ where: { id }, select: STAFF_SELECT });
};

export const deactivateStaff = async (clinicId, actorId, id, meta) => {
  if (id === actorId) throw new AppError('You cannot deactivate your own account', 422);

  const existing = await prisma.user.findFirst({ where: { id, clinicId, deletedAt: null } });
  if (!existing) throw new AppError('Staff member not found', 404);

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { status: 'INACTIVE', deletedAt: new Date() } }),
    prisma.refreshToken.updateMany({ where: { userId: id }, data: { isRevoked: true } }),
  ]);

  await createAuditLog({
    clinicId, userId: actorId, action: AUDIT_ACTIONS.DELETE, entity: 'User', entityId: id, ...meta,
  });
};

export const resetStaffPassword = async (clinicId, actorId, id, newPassword, meta) => {
  const existing = await prisma.user.findFirst({ where: { id, clinicId, deletedAt: null } });
  if (!existing) throw new AppError('Staff member not found', 404);

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId: id }, data: { isRevoked: true } }),
  ]);

  await createAuditLog({
    clinicId, userId: actorId, action: AUDIT_ACTIONS.UPDATE, entity: 'User',
    entityId: id, newValues: { passwordReset: true }, ...meta,
  });
};
