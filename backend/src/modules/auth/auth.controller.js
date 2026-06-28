import {
  loginService,
  refreshTokenService,
  logoutService,
  changePasswordService,
  getMeService,
} from './auth.service.js';
import { sendSuccess } from '../../utils/response.js';
import { TOKEN_COOKIE } from '../../utils/constants.js';
import { env } from '../../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? 'strict' : 'lax', // 'lax' allows cookies in dev (localhost, http)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/', // explicit path for all routes
};

export const login = async (req, res, next) => {
  try {
    const result = await loginService({
      email: req.body.email,
      password: req.body.password,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.cookie(TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    return sendSuccess(res, {
      accessToken: result.accessToken,
      refreshToken: env.isDevelopment ? result.refreshToken : undefined,
      user: result.user,
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    // Accept token from cookie (production) or request body (dev proxy workaround)
    const token = req.cookies[TOKEN_COOKIE] || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token missing' });
    }

    const result = await refreshTokenService(token, req.ip, req.get('user-agent'));

    res.cookie(TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    return sendSuccess(res, {
      accessToken: result.accessToken,
      refreshToken: env.isDevelopment ? result.refreshToken : undefined,
    }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies[TOKEN_COOKIE];
    await logoutService(token, req.user.id, req.user.clinicId, req.ip, req.get('user-agent'));

    res.clearCookie(TOKEN_COOKIE);
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    await changePasswordService(
      req.user.id,
      req.user.clinicId,
      req.body.currentPassword,
      req.body.newPassword
    );

    res.clearCookie(TOKEN_COOKIE);
    return sendSuccess(res, null, 'Password changed successfully. Please login again.');
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await getMeService(req.user.id);
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};
