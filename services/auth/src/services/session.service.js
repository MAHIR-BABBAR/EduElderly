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
const { signOtpPendingToken, verifyOtpPendingToken } = require('../utils/jwtHelper');

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
    const [rawOtp] = await generateOTP(user.userId, 'login');
    await sendOtpEmail(user, rawOtp);
    // The pending token is the only way to reach the OTP endpoints (SEC-3).
    return { user, requiresOtp: true, otpToken: signOtpPendingToken(user.userId, user.email) };
  }

  return { user, requiresOtp: false };
};

/**
 * Resolve the account an OTP step is for, from the pending token issued by
 * /login — never from the email alone — and re-check everything the password
 * step checked, since state can change in the five-minute window.
 */
const resolveOtpAccount = async (email, otpToken, type) => {
  if (!VALID_OTP_TYPES.includes(type)) {
    throw new AppError('Invalid OTP type', 400, ERROR_CODES.E_VALIDATION);
  }
  let claims;
  try {
    claims = verifyOtpPendingToken(otpToken);
  } catch {
    throw new AppError('Please sign in with your password first', 401, ERROR_CODES.E_AUTH_INVALID);
  }
  const user = await User.findOne({ userId: claims.userId });
  if (!user || user.email !== email || claims.email !== email) {
    throw new AppError('Please sign in with your password first', 401, ERROR_CODES.E_AUTH_INVALID);
  }
  if (!user.isActive || !user.isVerified || !user.is2FAEnabled) {
    throw new AppError('Please sign in with your password first', 401, ERROR_CODES.E_AUTH_INVALID);
  }
  assertAccountNotLocked(user);
  return user;
};

const verifyLoginOtp = async (email, otp, type, otpToken) => {
  const user = await resolveOtpAccount(email, otpToken, type);

  let isValid;
  try {
    isValid = await verifyOtp(user.userId, type, otp);
  } catch (error) {
    // Exhausting the code's guesses counts against the account like a bad
    // password does, so requesting a fresh code does not reset the budget.
    await recordFailedLogin(user);
    throw error;
  }
  if (!isValid) {
    await recordFailedLogin(user);
    throw new AppError('Invalid or expired OTP', 401, ERROR_CODES.E_OTP_INVALID);
  }

  await clearLoginFailures(user);
  return user;
};

const resendLoginOtp = async (email, type, otpToken) => {
  const user = await resolveOtpAccount(email, otpToken, type);
  const [rawOtp] = await generateOTP(user.userId, type);
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
