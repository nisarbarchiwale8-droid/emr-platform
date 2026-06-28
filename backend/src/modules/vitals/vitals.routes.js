import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { saveVitals, getVitals } from './vitals.service.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();
router.use(authenticate);

const reqMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });

const vitalsValidator = [
  param('appointmentId').isUUID().withMessage('Invalid appointment id'),
  body('temperature').optional({ values: 'falsy' }).isFloat({ min: 30, max: 45 }),
  body('systolicBP').optional({ values: 'falsy' }).isInt({ min: 50, max: 300 }),
  body('diastolicBP').optional({ values: 'falsy' }).isInt({ min: 30, max: 200 }),
  body('pulseRate').optional({ values: 'falsy' }).isInt({ min: 20, max: 250 }),
  body('respiratoryRate').optional({ values: 'falsy' }).isInt({ min: 5, max: 80 }),
  body('oxygenSaturation').optional({ values: 'falsy' }).isFloat({ min: 50, max: 100 }),
  body('weight').optional({ values: 'falsy' }).isFloat({ min: 0.5, max: 500 }),
  body('height').optional({ values: 'falsy' }).isFloat({ min: 20, max: 280 }),
  body('bloodGlucose').optional({ values: 'falsy' }).isFloat({ min: 10, max: 1000 }),
];

router.get('/:appointmentId', param('appointmentId').isUUID(), validate, async (req, res, next) => {
  try {
    const vitals = await getVitals(req.user.clinicId, req.params.appointmentId);
    return sendSuccess(res, vitals);
  } catch (err) { next(err); }
});

router.put('/:appointmentId', vitalsValidator, validate, async (req, res, next) => {
  try {
    const vitals = await saveVitals(req.user.clinicId, req.user.id, req.params.appointmentId, req.body, reqMeta(req));
    return sendSuccess(res, vitals, 'Vitals recorded successfully');
  } catch (err) { next(err); }
});

export default router;
