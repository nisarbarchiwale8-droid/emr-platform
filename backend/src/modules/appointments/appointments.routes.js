import { Router } from 'express';
import * as ctrl from './appointments.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createAppointmentValidator, updateAppointmentValidator,
  statusValidator, idValidator, listValidator,
} from './appointments.validators.js';

const router = Router();
router.use(authenticate);

router.get('/doctors', ctrl.doctors);
router.get('/', listValidator, validate, ctrl.list);
router.post('/', authorize('ADMINISTRATOR', 'RECEPTIONIST'), createAppointmentValidator, validate, ctrl.create);
router.get('/:id', idValidator, validate, ctrl.getById);
router.put('/:id', authorize('ADMINISTRATOR', 'RECEPTIONIST'), updateAppointmentValidator, validate, ctrl.update);
router.patch('/:id/status', statusValidator, validate, ctrl.changeStatus);
router.patch('/:id/cancel', idValidator, validate, ctrl.cancel);

export default router;
