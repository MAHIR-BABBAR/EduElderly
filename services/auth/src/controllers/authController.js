const { User } = require('../models/User');
const { AppError, ERROR_CODES, catchAsync } = require('@eduelderly/shared');
const { ROLES } = require('@eduelderly/shared/constants/roles');
const { generateOTP, verifyOtp: verifyOtpFromRedis } = require('../utils/otpHelper');
const bcrypt = require('bcrypt');
const {
  signAccessToken,
  signRefreshToken,
  signEmailVerificationToken,
  verifyEmailVerificationToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
  verifyRefreshToken,
  hashRefreshToken,
} = require('../utils/jwtHelper');
const { RefreshToken } = require('../models/RefreshToken');

// ─── Constants ───────────────────────────────────────────────────────────────
const VALID_OTP_TYPES = ['login'];
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const issueTokensAndRespond = async (req, res, user, message = 'Login successful', statusCode = 200) => {
  const { rawToken, tokenHash } = signRefreshToken(user.userId);

  await RefreshToken.create({
    userId: user.userId,
    tokenHash,
    userAgent: req.get('User-Agent') || null,
    ip: req.ip || null,
  });

  res.cookie('refresh_token', rawToken, COOKIE_OPTIONS);

  const accessToken = signAccessToken({ userId: user.userId, role: user.role });

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      accessToken,
      user: UserData(user),
    },
  });
};


const UserData = (user) => ({
  userId: user.userId,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
});

// ─── Controllers ─────────────────────────────────────────────────────────────

const register = catchAsync(async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already in use', 400, ERROR_CODES.E_EMAIL_TAKEN);
    }

    if (!password) {
      throw new AppError('Password is required', 400, ERROR_CODES.E_VALIDATION);
    }
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10);
    const passHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      passHash,
      role: ROLES.LEARNER,
      isVerified: false,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    if (!newUser) {
      throw new AppError('Error registering user', 500, ERROR_CODES.E_INTERNAL);
    }

    const verificationToken = signEmailVerificationToken(newUser.userId, newUser.email);

    console.log(`[DEV] Verification link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: UserData(newUser),
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    throw error;
  }
});


const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new AppError('Verification token is required', 400, ERROR_CODES.E_VALIDATION);
  }

  let decoded;
  try {
    decoded = verifyEmailVerificationToken(token);
  } catch (err) {
    throw new AppError('Invalid or expired verification link', 400, ERROR_CODES.E_AUTH_TOKEN_INVALID);
  }

  const user = await User.findOne({ userId: decoded.userId, email: decoded.email });
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  if (user.isVerified) {
    return res.status(200).json({
      success: true,
      message: 'Email is already verified. You can log in.',
      data: UserData(user),
    });
  }

  user.isVerified = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
    data: UserData(user),
  });
});


const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passHash');
  if (!user) {
    throw new AppError('Invalid email or password', 401, ERROR_CODES.E_AUTH_INVALID);
  }


  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil - new Date();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw new AppError(
      `Account locked. Try again in ${remainingMin} minute(s).`,
      423,
      ERROR_CODES.E_USER_SUSPENDED,
    );
  }

  const isMatch = await bcrypt.compare(password, user.passHash);
  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= LOCKOUT_THRESHOLD) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      user.failedLoginAttempts = 0; 
    }
    await user.save();
    throw new AppError('Invalid email or password', 401, ERROR_CODES.E_AUTH_INVALID);
  }

  if (!user.isVerified) {
    throw new AppError('Please verify your email before logging in', 401, ERROR_CODES.E_AUTH_UNVERIFIED);
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();
  }

  if (user.is2FAEnabled) {
    const [rawOtp] = await generateOTP(email, 'login');
    console.log(`[DEV] Login OTP for ${email}: ${rawOtp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete login.',
      requiresOtp: true,
    });
  }

  await issueTokensAndRespond(req, res, user, 'Login successful');
});


const verifyOtpHandler = catchAsync(async (req, res) => {
  const { email, otp, type } = req.body;
  if (!VALID_OTP_TYPES.includes(type)) {
    throw new AppError('Invalid OTP type', 400, ERROR_CODES.E_VALIDATION);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  const isValid = await verifyOtpFromRedis(email, type, otp);
  if (!isValid) {
    throw new AppError('Invalid or expired OTP', 401, ERROR_CODES.E_OTP_INVALID);
  }

  if (type === 'login') {
    await issueTokensAndRespond(req, res, user, 'Login successful');
  }
});


const refresh = catchAsync(async (req, res) => {
  const rawToken = req.cookies?.refresh_token;
  if (!rawToken) {
    throw new AppError('Refresh token missing', 401, ERROR_CODES.E_AUTH_REFRESH_INVALID);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(rawToken);
  } catch (err) {
    throw new AppError('Invalid refresh token', 401, ERROR_CODES.E_AUTH_REFRESH_INVALID);
  }

  const tokenHash = hashRefreshToken(rawToken);
  const storedToken = await RefreshToken.findOne({ tokenHash, userId: decoded.userId });
  if (!storedToken) {
    console.warn(`[SECURITY] Refresh token reuse detected for userId: ${decoded.userId}`);
    await RefreshToken.deleteMany({ userId: decoded.userId });
    throw new AppError('Session expired. Please log in again.', 401, ERROR_CODES.E_AUTH_REFRESH_INVALID);
  }

  const user = await User.findOne({ userId: decoded.userId });
  if (!user || !user.isActive) {
    throw new AppError('User not found or suspended', 401, ERROR_CODES.E_AUTH_REFRESH_INVALID);
  }

  await storedToken.deleteOne();

  const newAccessToken = signAccessToken({ userId: user.userId, role: user.role });
  const { rawToken: newRaw, tokenHash: newHash } = signRefreshToken(user.userId);

  await RefreshToken.create({
    userId: user.userId,
    tokenHash: newHash,
    userAgent: req.get('User-Agent') || null,
    ip: req.ip || null,
  });

  res.cookie('refresh_token', newRaw, COOKIE_OPTIONS);

  res.json({
    success: true,
    data: { accessToken: newAccessToken },
  });
});


const logout = catchAsync(async (req, res) => {
  const rawToken = req.cookies?.refresh_token;

  if (rawToken) {
    const tokenHash = hashRefreshToken(rawToken);
    await RefreshToken.deleteOne({ tokenHash });
  }

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.json({ success: true, message: 'Logged out successfully' });
});


const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }

  const resetToken = signPasswordResetToken(user.userId, user.email);

  console.log(`[DEV] Reset link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);

  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});


const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new AppError('Reset token and new password are required', 400, ERROR_CODES.E_VALIDATION);
  }

  let decoded;
  try {
    decoded = verifyPasswordResetToken(token);
  } catch (err) {
    throw new AppError('Invalid or expired reset link', 400, ERROR_CODES.E_AUTH_TOKEN_INVALID);
  }

  const user = await User.findOne({ userId: decoded.userId, email: decoded.email }).select('+passHash');
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10);
  user.passHash = await bcrypt.hash(newPassword, salt);

  await RefreshToken.deleteMany({ userId: user.userId });

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful. Please log in with your new password.',
  });
});


const changePassword = catchAsync(async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    throw new AppError('Email, current password, and new password are required', 400, ERROR_CODES.E_VALIDATION);
  }

  const user = await User.findOne({ email }).select('+passHash');
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passHash);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401, ERROR_CODES.E_AUTH_INVALID);
  }

  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10);
  user.passHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
    data: UserData(user),
  });
});


const resendOtp = catchAsync(async (req, res) => {
  const { email, type } = req.body;

  if (!VALID_OTP_TYPES.includes(type)) {
    throw new AppError('Invalid OTP type', 400, ERROR_CODES.E_VALIDATION);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  const [rawOtp] = await generateOTP(email, type);
  // TODO: Send OTP via notification service
  console.log(`[DEV] Resent OTP for ${email}: ${rawOtp}`);

  res.status(200).json({
    success: true,
    message: 'OTP has been resent to your email',
  });
});


const resendVerificationEmail = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  if (user.isVerified) {
    return res.status(200).json({
      success: true,
      message: 'Email is already verified. You can log in.',
    });
  }

  const verificationToken = signEmailVerificationToken(user.userId, user.email);

  // TODO: Send verification email via notification service
  console.log(`[DEV] Verification link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`);

  res.status(200).json({
    success: true,
    message: 'Verification email has been resent. Please check your inbox.',
  });
});

module.exports = {
  register,
  verifyEmail,
  login,
  verifyOtpHandler,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  resendOtp,
  resendVerificationEmail,
};