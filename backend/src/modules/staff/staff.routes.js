import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as service from './staff.service.js';
import { sendSuccess, sendCreated, sendPaginated, buildPagination } from '../../utils/response.js';
import { parsePagination, parseSort } from '../../utils/query.js';

const router = Router();
router.use(authenticate, authorize('ADMINISTRATOR'));

const reqMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
const ROLES = ['ADMINISTRATOR', 'DOCTOR', 'RECEPTIONIST'];

const createValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password needs uppercase, lowercase, and a number'),
  body('role').isIn(ROLES).withMessage('Invalid role'),
  body('phone').optional({ values: 'falsy' }).matches(/^[6-9]\d{9}$/).withMessage('Invalid phone'),
  body('consultationFee').optional({ values: 'falsy' }).isFloat({ min: 0 }),
];

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const orderBy = parseSort(req.query, ['firstName', 'createdAt', 'role'], 'createdAt');
    const { staff, total } = await service.listStaff(req.user.clinicId, {
      search: req.query.search?.trim(), role: req.query.role, skip, limit, orderBy,
    });
    return sendPaginated(res, staff, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

router.post('/', createValidator, validate, async (req, res, next) => {
  try {
    const user = await service.createStaff(req.user.clinicId, req.user.id, req.body, reqMeta(req));
    return sendCreated(res, user, 'Staff member created successfully');
  } catch (err) { next(err); }
});

router.put('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const user = await service.updateStaff(req.user.clinicId, req.user.id, req.params.id, req.body, reqMeta(req));
    return sendSuccess(res, user, 'Staff member updated');
  } catch (err) { next(err); }
});

router.patch('/:id/reset-password',
  [param('id').isUUID(), body('newPassword').isLength({ min: 8 })], validate,
  async (req, res, next) => {
    try {
      await service.resetStaffPassword(req.user.clinicId, req.user.id, req.params.id, req.body.newPassword, reqMeta(req));
      return sendSuccess(res, null, 'Password reset successfully');
    } catch (err) { next(err); }
  });

router.delete('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    await service.deactivateStaff(req.user.clinicId, req.user.id, req.params.id, reqMeta(req));
    return sendSuccess(res, null, 'Staff member deactivated');
  } catch (err) { next(err); }
});

export default router;
