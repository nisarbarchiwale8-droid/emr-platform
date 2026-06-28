import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { revenueReport, patientReport, doctorPerformance } from './reports.service.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();
router.use(authenticate, authorize('ADMINISTRATOR'));

router.get('/revenue', async (req, res, next) => {
  try {
    const data = await revenueReport(req.user.clinicId, req.query.from, req.query.to);
    return sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.get('/patients', async (req, res, next) => {
  try {
    const data = await patientReport(req.user.clinicId, req.query.from, req.query.to);
    return sendSuccess(res, data);
  } catch (err) { next(err); }
});

router.get('/doctor-performance', async (req, res, next) => {
  try {
    const data = await doctorPerformance(req.user.clinicId, req.query.from, req.query.to);
    return sendSuccess(res, data);
  } catch (err) { next(err); }
});

export default router;
