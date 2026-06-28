import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.js';
import prisma from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, env.JWT_SECRET);

    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        clinicId: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return sendError(res, 'User not found or inactive', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Token expired', 401);
    }
    return sendError(res, 'Invalid token', 401);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Insufficient permissions', 403);
    }
    next();
  };
};

export const requireSameClinic = (paramKey = 'clinicId') => {
  return (req, res, next) => {
    const clinicId = req.params[paramKey] || req.body[paramKey] || req.query[paramKey];
    if (clinicId && clinicId !== req.user.clinicId) {
      return sendError(res, 'Access denied to this clinic', 403);
    }
    next();
  };
};
