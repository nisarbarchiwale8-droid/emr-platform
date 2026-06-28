import { Router } from 'express';
import { login, refresh, logout, changePassword, getMe } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { loginValidator, changePasswordValidator } from './auth.validators.js';

const router = Router();

router.post('/login', authLimiter, loginValidator, validate, login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.patch('/change-password', authenticate, changePasswordValidator, validate, changePassword);
router.get('/me', authenticate, getMe);

export default router;
