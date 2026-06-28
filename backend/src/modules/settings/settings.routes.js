import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as service from './settings.service.js';
import { sendSuccess, sendPaginated, buildPagination } from '../../utils/response.js';
import { parsePagination } from '../../utils/query.js';

const router = Router();
router.use(authenticate);

const reqMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });

// Clinic profile — all roles can read, admin can edit
router.get('/clinic', async (req, res, next) => {
  try {
    const clinic = await service.getClinic(req.user.clinicId);
    return sendSuccess(res, clinic);
  } catch (err) { next(err); }
});

router.put('/clinic', authorize('ADMINISTRATOR'),
  [
    body('name').trim().notEmpty().withMessage('Clinic name is required'),
    body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
    body('phone').optional({ values: 'falsy' }).matches(/^[6-9]\d{9}$/),
    body('pincode').optional({ values: 'falsy' }).matches(/^\d{6}$/),
  ], validate,
  async (req, res, next) => {
    try {
      const clinic = await service.updateClinic(req.user.clinicId, req.user.id, req.body, reqMeta(req));
      return sendSuccess(res, clinic, 'Clinic settings updated');
    } catch (err) { next(err); }
  });

// Audit logs — admin only
router.get('/audit-logs', authorize('ADMINISTRATOR'), async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { logs, total } = await service.listAuditLogs(req.user.clinicId, {
      entity: req.query.entity, action: req.query.action, skip, limit,
    });
    return sendPaginated(res, logs, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

export default router;
