import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(err);

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      return sendError(res, `${field} already exists`, 409);
    }
    if (err.code === 'P2025') {
      return sendError(res, 'Record not found', 404);
    }
    if (err.code === 'P2003') {
      return sendError(res, 'Referenced record not found', 400);
    }
    return sendError(res, 'Database error', 500);
  }

  // Validation errors from express-validator (already handled in validate middleware)
  if (err.type === 'validation') {
    return sendError(res, 'Validation failed', 422, err.errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401);
  }

  // Operational errors
  if (err.isOperational) {
    return sendError(res, err.message, err.statusCode || 400);
  }

  // Unknown errors
  const message = env.isDevelopment ? err.message : 'Internal server error';
  return sendError(res, message, 500);
};

export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
