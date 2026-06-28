import { body, param, query } from 'express-validator';

const STATUSES = ['SCHEDULED', 'CONFIRMED', 'IN_QUEUE', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export const createAppointmentValidator = [
  body('patientId').isUUID().withMessage('Valid patient is required'),
  body('doctorId').isUUID().withMessage('Valid doctor is required'),
  body('scheduledAt').isISO8601().withMessage('Valid date/time is required'),
  body('type').optional().trim().isLength({ max: 50 }),
  body('chiefComplaint').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
];

export const updateAppointmentValidator = [
  param('id').isUUID(),
  body('scheduledAt').optional().isISO8601(),
  body('doctorId').optional().isUUID(),
];

export const statusValidator = [
  param('id').isUUID(),
  body('status').isIn(STATUSES).withMessage('Invalid status'),
];

export const idValidator = [param('id').isUUID().withMessage('Invalid appointment id')];

export const listValidator = [
  query('date').optional().isISO8601(),
  query('doctorId').optional().isUUID(),
  query('patientId').optional().isUUID(),
  query('status').optional().isIn(STATUSES),
];
