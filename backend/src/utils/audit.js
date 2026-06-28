import prisma from '../config/database.js';
import { logger } from './logger.js';

export const createAuditLog = async ({
  clinicId,
  userId = null,
  action,
  entity,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        clinicId,
        userId,
        action,
        entity,
        entityId,
        oldValues,
        newValues,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    logger.error('Failed to create audit log:', err);
  }
};
