import { Router } from 'express';
import * as ctrl from './patients.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createPatientValidator, updatePatientValidator,
  patientIdValidator, listPatientsValidator,
} from './patients.validators.js';

const router = Router();
router.use(authenticate);

router.get('/', listPatientsValidator, validate, ctrl.list);
router.post('/', authorize('ADMINISTRATOR', 'RECEPTIONIST'), createPatientValidator, validate, ctrl.create);
router.get('/:id', patientIdValidator, validate, ctrl.getById);
router.put('/:id', authorize('ADMINISTRATOR', 'RECEPTIONIST'), updatePatientValidator, validate, ctrl.update);
router.delete('/:id', authorize('ADMINISTRATOR'), patientIdValidator, validate, ctrl.remove);

export default router;
