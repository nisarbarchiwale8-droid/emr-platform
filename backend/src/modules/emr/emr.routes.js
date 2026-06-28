import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { saveSoapNote, getSoapNote, getPatientTimeline } from './emr.service.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();
router.use(authenticate);

const reqMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });

const soapValidator = [
  param('appointmentId').isUUID().withMessage('Invalid appointment id'),
  body('subjective').optional({ values: 'falsy' }).isString(),
  body('objective').optional({ values: 'falsy' }).isString(),
  body('assessment').optional({ values: 'falsy' }).isString(),
  body('plan').optional({ values: 'falsy' }).isString(),
  body('followUpDays').optional({ values: 'falsy' }).isInt({ min: 0, max: 365 }),
  body('diagnoses').optional().isArray(),
  body('diagnoses.*.description').optional().trim().notEmpty().withMessage('Diagnosis description required'),
  body('prescriptions').optional().isArray(),
  body('prescriptions.*.medicineName').optional().trim().notEmpty().withMessage('Medicine name required'),
];

// SOAP notes — doctors and administrators can read and write
router.get('/soap/:appointmentId', param('appointmentId').isUUID(), validate, async (req, res, next) => {
  try {
    const note = await getSoapNote(req.user.clinicId, req.params.appointmentId);
    return sendSuccess(res, note);
  } catch (err) { next(err); }
});

router.put('/soap/:appointmentId', authorize('DOCTOR', 'ADMINISTRATOR'), soapValidator, validate, async (req, res, next) => {
  try {
    const note = await saveSoapNote(req.user.clinicId, req.user.id, req.params.appointmentId, req.body, reqMeta(req));
    return sendSuccess(res, note, 'Consultation notes saved');
  } catch (err) { next(err); }
});

// Patient medical timeline
router.get('/timeline/:patientId', param('patientId').isUUID(), validate, async (req, res, next) => {
  try {
    const timeline = await getPatientTimeline(req.user.clinicId, req.params.patientId);
    return sendSuccess(res, timeline);
  } catch (err) { next(err); }
});

export default router;
