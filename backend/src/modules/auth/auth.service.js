import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { createAuditLog } from '../../utils/audit.js';
import { AUDIT_ACTIONS, TOKEN_COOKIE } from '../../utils/constants.js';

const generateTokens = (userId, clinicId, role) => {
  const accessToken = jwt.sign(
    { userId, clinicId, role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId, tokenId: uuidv4() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

const getRefreshTokenExpiry = () => {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN.replace('d', ''), 10);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

export const loginService = async ({ email, password, ipAddress, userAgent }) => {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
    include: { clinic: { select: { id: true, name: true, isActive: true } } },
  });

  if (!user) throw new AppError('Invalid email or password', 401);
  if (user.status !== 'ACTIVE') throw new AppError('Account is inactive. Contact administrator.', 403);
  if (!user.clinic.isActive) throw new AppError('Clinic is inactive. Contact administrator.', 403);

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) throw new AppError('Invalid email or password', 401);

  const { accessToken, refreshToken } = generateTokens(user.id, user.clinicId, user.role);

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: getRefreshTokenExpiry(),
        ipAddress,
        userAgent,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  await createAuditLog({
    clinicId: user.clinicId,
    userId: user.id,
    action: AUDIT_ACTIONS.LOGIN,
    entity: 'User',
    entityId: user.id,
    ipAddress,
    userAgent,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      clinicName: user.clinic.name,
    },
  };
};

export const refreshTokenService = async (token, ipAddress, userAgent) => {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.userId, deletedAt: null, status: 'ACTIVE' },
  });
  if (!user) throw new AppError('User not found', 401);

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.clinicId, user.role);

  await prisma.$transaction([
    prisma.refreshToken.update({ where: { token }, data: { isRevoked: true } }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: newRefreshToken,
        expiresAt: getRefreshTokenExpiry(),
        ipAddress,
        userAgent,
      },
    }),
  ]);

  return { accessToken, refreshToken: newRefreshToken };
};

export const logoutService = async (token, userId, clinicId, ipAddress, userAgent) => {
  if (token) {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { isRevoked: true },
    });
  }

  await createAuditLog({
    clinicId,
    userId,
    action: AUDIT_ACTIONS.LOGOUT,
    entity: 'User',
    entityId: userId,
    ipAddress,
    userAgent,
  });
};

export const changePasswordService = async (userId, clinicId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatch) throw new AppError('Current password is incorrect', 400);

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } }),
  ]);

  await createAuditLog({
    clinicId,
    userId,
    action: AUDIT_ACTIONS.UPDATE,
    entity: 'User',
    entityId: userId,
    newValues: { passwordChanged: true },
  });
};

export const getMeService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatarUrl: true,
      lastLoginAt: true,
      clinicId: true,
      clinic: {
        select: { id: true, name: true, logoUrl: true, timezone: true, currency: true },
      },
      doctorProfile: {
        select: { specialization: true, qualification: true, registrationNo: true, consultationFee: true },
      },
    },
  });

  if (!user) throw new AppError('User not found', 404);
  return user;
};
