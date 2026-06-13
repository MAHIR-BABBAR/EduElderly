const bcrypt = require('bcrypt');
const { User } = require('../models/User');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const {
  signPasswordResetToken,
  verifyPasswordResetToken,
} = require('../utils/jwtHelper');
const { revokeAllUserSessions } = require('./token.service');
const { sendPasswordResetEmail } = require('./mailService');

const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const saltRounds = () => parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(saltRounds());
  return bcrypt.hash(plainPassword, salt);
};

const passwordsMatch = (plainPassword, passHash) => bcrypt.compare(plainPassword, passHash);

const assertAccountNotLocked = (user) => {
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMin = Math.ceil((user.lockedUntil - new Date()) / 60000);
    throw new AppError(
      `Account locked. Try again in ${remainingMin} minute(s).`,
      423,
      ERROR_CODES.E_USER_SUSPENDED,
    );
  }
};

const recordFailedLogin = async (user) => {
  user.failedLoginAttempts += 1;
  if (user.failedLoginAttempts >= LOCKOUT_MAX_ATTEMPTS) {
    user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    user.failedLoginAttempts = 0;
  }
  await user.save();
};

const clearLoginFailures = async (user) => {
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();
  }
};

const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email });
  if (!user) return;

  const resetToken = signPasswordResetToken(user.userId, user.email);
  await sendPasswordResetEmail(user, resetToken);
};

const resetPasswordWithToken = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw new AppError('Reset token and new password are required', 400, ERROR_CODES.E_VALIDATION);
  }

  let decoded;
  try {
    decoded = verifyPasswordResetToken(token);
  } catch {
    throw new AppError('Invalid or expired reset link', 400, ERROR_CODES.E_AUTH_TOKEN_INVALID);
  }

  const user = await User.findOne({ userId: decoded.userId, email: decoded.email }).select('+passHash');
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  user.passHash = await hashPassword(newPassword);
  await revokeAllUserSessions(user.userId);
  await user.save();

  return user;
};

const changePassword = async (email, currentPassword, newPassword) => {
  if (!email || !currentPassword || !newPassword) {
    throw new AppError('Email, current password, and new password are required', 400, ERROR_CODES.E_VALIDATION);
  }

  const user = await User.findOne({ email }).select('+passHash');
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  const isMatch = await passwordsMatch(currentPassword, user.passHash);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401, ERROR_CODES.E_AUTH_INVALID);
  }

  user.passHash = await hashPassword(newPassword);
  await user.save();

  return user;
};

module.exports = {
  hashPassword,
  passwordsMatch,
  assertAccountNotLocked,
  recordFailedLogin,
  clearLoginFailures,
  requestPasswordReset,
  resetPasswordWithToken,
  changePassword,
};
