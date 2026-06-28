import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/response.js';
import {
  listPlansService,
  createOrderService,
  verifyAndActivateService,
} from './registration.service.js';

const router = Router();

// GET /api/v1/registration/plans — public
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await listPlansService();
    return sendSuccess(res, plans);
  } catch (err) { next(err); }
});

// POST /api/v1/registration/create-order — public
router.post(
  '/create-order',
  [
    body('planId').notEmpty().withMessage('Plan is required'),
    body('clinicName').trim().notEmpty().withMessage('Clinic name is required'),
    body('adminEmail').isEmail().normalizeEmail().withMessage('Valid email required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await createOrderService(req.body);
      return sendSuccess(res, result, 'Order created');
    } catch (err) { next(err); }
  }
);

// POST /api/v1/registration/verify-payment — public
router.post(
  '/verify-payment',
  [
    body('razorpayOrderId').notEmpty().withMessage('Order ID required'),
    body('razorpayPaymentId').notEmpty().withMessage('Payment ID required'),
    body('razorpaySignature').notEmpty().withMessage('Signature required'),
    body('planId').notEmpty().withMessage('Plan required'),
    body('clinicName').trim().notEmpty().withMessage('Clinic name required'),
    body('adminFirstName').trim().notEmpty().withMessage('First name required'),
    body('adminLastName').trim().notEmpty().withMessage('Last name required'),
    body('adminEmail').isEmail().normalizeEmail().withMessage('Valid email required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await verifyAndActivateService(req.body);
      return sendSuccess(res, result, 'Clinic registered successfully');
    } catch (err) { next(err); }
  }
);

export default router;
