import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { getQueue } from './queue.service.js';
import { sendSuccess } from '../../utils/response.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const data = await getQueue(req.user.clinicId, {
      date: req.query.date,
      doctorId: req.query.doctorId,
    });
    return sendSuccess(res, data);
  } catch (err) { next(err); }
});

export default router;
