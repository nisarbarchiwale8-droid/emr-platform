import { body, param, query } from 'express-validator';

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const BLOOD_GROUPS = [
  'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN',
];

export const createPatientValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 100 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 100 }),
  body('phone').trim().notEmpty().withMessage('Phone is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number'),
  body('alternatePhone').optional({ values: 'falsy' }).matches(/^[6-9]\d{9}$/).withMessage('Invalid alternate phone'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email').normalizeEmail(),
  body('gender').notEmpty().withMessage('Gender is required').isIn(GENDERS).withMessage('Invalid gender'),
  body('dateOfBirth').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date of birth'),
  body('age').optional({ values: 'falsy' }).isInt({ min: 0, max: 150 }).withMessage('Invalid age'),
  body('bloodGroup').optional({ values: 'falsy' }).isIn(BLOOD_GROUPS).withMessage('Invalid blood group'),
  body('pincode').optional({ values: 'falsy' }).matches(/^\d{6}$/).withMessage('Invalid pincode'),
  body('emergencyPhone').optional({ values: 'falsy' }).matches(/^[6-9]\d{9}$/).withMessage('Invalid emergency phone'),
];

export const updatePatientValidator = [
  param('id').isUUID().withMessage('Invalid patient id'),
  body('firstName').optional().trim().notEmpty().isLength({ max: 100 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 100 }),
  body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Invalid phone'),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('gender').optional().isIn(GENDERS),
  body('bloodGroup').optional().isIn(BLOOD_GROUPS),
];

export const patientIdValidator = [param('id').isUUID().withMessage('Invalid patient id')];

export const listPatientsValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 100 }),
];
