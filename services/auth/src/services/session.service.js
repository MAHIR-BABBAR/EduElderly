const { User } = require('../models/User');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { generateOTP, verifyOtp } = require('../utils/otpHelper');
const {
  assertAccountNotLocked,
  recordFailedLogin,
  clearLoginFailures,
  passwordsMatch,
} = require('./password.service');
const { sendOtpEmail } = require('./mailService');

const VALID_OTP_TYPES = ['login'];

const findByEmail = (email, { withPassword = false } = {}) => {
  const query = User.findOne({ email });
  return withPassword ? query.select('+passHash') : query;
};

const authenticateCredentials = async (email, password) => {
  const user = await findByEmail(email, { withPassword: true });
  if (!user) {
    throw new AppError('Invalid email or password', 401, ERROR_CODES.E_AUTH_INVALID);
  }

  assertAccountNotLocked(user);

  const isMatch = await passwordsMatch(password, user.passHash);
  if (!isMatch) {
    await recordFailedLogin(user);
    throw new AppError('Invalid email or password', 401, ERROR_CODES.E_AUTH_INVALID);
  }

  if (!user.isVerified) {
    throw new AppError('Please verify your email before logging in', 401, ERROR_CODES.E_AUTH_UNVERIFIED);
  }

  await clearLoginFailures(user);

  if (user.is2FAEnabled) {
    const [rawOtp] = await generateOTP(email, 'login');
    await sendOtpEmail(user, rawOtp);
    return { user, requiresOtp: true };
  }

  return { user, requiresOtp: false };
};

const verifyLoginOtp = async (email, otp, type) => {
  if (!VALID_OTP_TYPES.includes(type)) {
    throw new AppError('Invalid OTP type', 400, ERROR_CODES.E_VALIDATION);
  }

  const user = await findByEmail(email);
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  const isValid = await verifyOtp(email, type, otp);
  if (!isValid) {
    throw new AppError('Invalid or expired OTP', 401, ERROR_CODES.E_OTP_INVALID);
  }

  return user;
};

const resendLoginOtp = async (email, type) => {
  if (!VALID_OTP_TYPES.includes(type)) {
    throw new AppError('Invalid OTP type', 400, ERROR_CODES.E_VALIDATION);
  }

  const user = await findByEmail(email);
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  const [rawOtp] = await generateOTP(email, type);
  await sendOtpEmail(user, rawOtp);

  return user;
};

const findActiveUserById = async (userId) => {
  const user = await User.findOne({ userId });
  if (!user || !user.isActive) {
    throw new AppError('User not found or suspended', 401, ERROR_CODES.E_AUTH_REFRESH_INVALID);
  }
  return user;
};

module.exports = {
  authenticateCredentials,
  verifyLoginOtp,
  resendLoginOtp,
  findActiveUserById,
};
