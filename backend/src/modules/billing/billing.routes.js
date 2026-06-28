import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as service from './billing.service.js';
import { sendSuccess, sendCreated, sendPaginated, buildPagination } from '../../utils/response.js';
import { parsePagination, parseSort } from '../../utils/query.js';

const router = Router();
router.use(authenticate);

const reqMeta = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE'];
const PAYMENT_STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'WAIVED'];

const createBillValidator = [
  body('patientId').isUUID().withMessage('Valid patient is required'),
  body('appointmentId').optional({ values: 'falsy' }).isUUID(),
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lineItems.*.description').trim().notEmpty().withMessage('Item description is required'),
  body('lineItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('lineItems.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
  body('discountAmount').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('discountPercent').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100 }),
  body('taxPercent').optional({ values: 'falsy' }).isFloat({ min: 0, max: 100 }),
];

const paymentValidator = [
  param('id').isUUID(),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
  body('method').isIn(PAYMENT_METHODS).withMessage('Invalid payment method'),
];

router.get('/', [query('paymentStatus').optional().isIn(PAYMENT_STATUSES)], validate, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const orderBy = parseSort(req.query, ['billDate', 'createdAt', 'totalAmount'], 'createdAt');
    const { bills, total } = await service.listBills(req.user.clinicId, {
      search: req.query.search?.trim(),
      paymentStatus: req.query.paymentStatus,
      patientId: req.query.patientId,
      skip, limit, orderBy,
    });
    return sendPaginated(res, bills, buildPagination(page, limit, total));
  } catch (err) { next(err); }
});

router.post('/', authorize('ADMINISTRATOR', 'RECEPTIONIST'), createBillValidator, validate, async (req, res, next) => {
  try {
    const bill = await service.createBill(req.user.clinicId, req.user.id, req.body, reqMeta(req));
    return sendCreated(res, bill, 'Bill created successfully');
  } catch (err) { next(err); }
});

router.get('/:id', param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const bill = await service.getBillById(req.user.clinicId, req.params.id);
    return sendSuccess(res, bill);
  } catch (err) { next(err); }
});

router.post('/:id/payments', authorize('ADMINISTRATOR', 'RECEPTIONIST'), paymentValidator, validate, async (req, res, next) => {
  try {
    const bill = await service.recordPayment(req.user.clinicId, req.user.id, req.params.id, req.body, reqMeta(req));
    return sendSuccess(res, bill, 'Payment recorded successfully');
  } catch (err) { next(err); }
});

router.patch('/:id/cancel', authorize('ADMINISTRATOR'), param('id').isUUID(), validate, async (req, res, next) => {
  try {
    const bill = await service.cancelBill(req.user.clinicId, req.user.id, req.params.id, reqMeta(req));
    return sendSuccess(res, bill, 'Bill cancelled');
  } catch (err) { next(err); }
});

export default router;
