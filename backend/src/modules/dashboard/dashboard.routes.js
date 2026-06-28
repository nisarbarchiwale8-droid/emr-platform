import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getDashboardStats, getTodaysAppointments } from './dashboard.service.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getDashboardStats(req.user.clinicId);
    return sendSuccess(res, stats);
  } catch (err) { next(err); }
});

router.get('/today-appointments', async (req, res, next) => {
  try {
    // Doctors see only their own appointments
    const doctorId = req.user.role === 'DOCTOR' ? req.user.id : req.query.doctorId;
    const appointments = await getTodaysAppointments(req.user.clinicId, doctorId);
    return sendSuccess(res, appointments);
  } catch (err) { next(err); }
});

export default router;
