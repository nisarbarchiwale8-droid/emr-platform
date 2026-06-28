import prisma from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createAuditLog } from '../../utils/audit.js';
import { AUDIT_ACTIONS } from '../../utils/constants.js';

export const getClinic = async (clinicId) => {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) throw new AppError('Clinic not found', 404);
  return clinic;
};

export const updateClinic = async (clinicId, userId, data, meta) => {
  const clinic = await prisma.clinic.update({
    where: { id: clinicId },
    data: {
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      phone: data.phone,
      email: data.email,
      gstin: data.gstin,
    },
  });

  await createAuditLog({
    clinicId, userId, action: AUDIT_ACTIONS.UPDATE, entity: 'Clinic', entityId: clinicId, ...meta,
  });

  return clinic;
};

/**
 * Paginated audit-log viewer for administrators.
 */
export const listAuditLogs = async (clinicId, { entity, action, skip, limit }) => {
  const where = {
    clinicId,
    ...(entity && { entity }),
    ...(action && { action }),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
};
