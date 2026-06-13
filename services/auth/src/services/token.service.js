const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { RefreshToken } = require('../models/RefreshToken');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
} = require('../utils/jwtHelper');

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const toPublicUser = (user) => ({
  userId: user.userId,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  is2FAEnabled: user.is2FAEnabled,
});

const persistRefreshToken = async (req, userId, tokenHash) =>
  RefreshToken.create({
    userId,
    tokenHash,
    userAgent: req.get('User-Agent') || null,
    ip: req.ip || null,
  });

const issueAuthSession = async (req, res, user, { message = 'Login successful', statusCode = 200 } = {}) => {
  const { rawToken, tokenHash } = signRefreshToken(user.userId);
  await persistRefreshToken(req, user.userId, tokenHash);

  res.cookie(REFRESH_COOKIE_NAME, rawToken, REFRESH_COOKIE_OPTIONS);

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      accessToken: signAccessToken({ userId: user.userId, role: user.role }),
      user: toPublicUser(user),
    },
  });
};

const rotateRefreshSession = async (req, res, user, rawToken) => {
  const tokenHash = hashRefreshToken(rawToken);
  const storedToken = await RefreshToken.findOne({ tokenHash, userId: user.userId });

  if (!storedToken) {
    console.warn(`[SECURITY] Refresh token reuse detected for userId: ${user.userId}`);
    await RefreshToken.deleteMany({ userId: user.userId });
    throw new AppError('Session expired. Please log in again.', 401, ERROR_CODES.E_AUTH_REFRESH_INVALID);
  }

  await storedToken.deleteOne();

  const { rawToken: newRaw, tokenHash: newHash } = signRefreshToken(user.userId);
  await persistRefreshToken(req, user.userId, newHash);

  res.cookie(REFRESH_COOKIE_NAME, newRaw, REFRESH_COOKIE_OPTIONS);

  res.json({
    success: true,
    data: { accessToken: signAccessToken({ userId: user.userId, role: user.role }) },
  });
};

const readRefreshTokenFromRequest = (req) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawToken) {
    throw new AppError('Refresh token missing', 401, ERROR_CODES.E_AUTH_REFRESH_INVALID);
  }
  return rawToken;
};

const verifyRefreshTokenPayload = (rawToken) => {
  try {
    return verifyRefreshToken(rawToken);
  } catch {
    throw new AppError('Invalid refresh token', 401, ERROR_CODES.E_AUTH_REFRESH_INVALID);
  }
};

const revokeRefreshSession = async (rawToken) => {
  if (!rawToken) return;
  const tokenHash = hashRefreshToken(rawToken);
  await RefreshToken.deleteOne({ tokenHash });
};

const revokeAllUserSessions = (userId) => RefreshToken.deleteMany({ userId });

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

module.exports = {
  issueAuthSession,
  rotateRefreshSession,
  readRefreshTokenFromRequest,
  verifyRefreshTokenPayload,
  revokeRefreshSession,
  revokeAllUserSessions,
  clearRefreshCookie,
  toPublicUser,
};
