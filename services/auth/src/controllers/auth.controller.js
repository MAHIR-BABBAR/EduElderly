const { catchAsync, extractUser, createLogger } = require('@eduelderly/shared');
const {
  registerUser,
  verifyEmailWithToken,
  resendVerificationEmail,
} = require('../services/registration.service');
const {
  authenticateCredentials,
  verifyLoginOtp,
  resendLoginOtp,
  findActiveUserById,
} = require('../services/session.service');
const {
  requestPasswordReset,
  resetPasswordWithToken,
  changePassword,
} = require('../services/password.service');
const {
  issueAuthSession,
  rotateRefreshSession,
  readRefreshTokenFromRequest,
  verifyRefreshTokenPayload,
  revokeRefreshSession,
  clearRefreshCookie,
  toPublicUser,
} = require('../services/token.service');

const log = createLogger('auth-service');

const GENERIC_RESET_MESSAGE =
  'If an account with that email exists, a password reset link has been sent.';

const register = catchAsync(async (req, res) => {
  const user = await registerUser(req.body);

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email to verify your account.',
    data: toPublicUser(user),
  });
});

const verifyEmail = catchAsync(async (req, res) => {
  const { user, alreadyVerified } = await verifyEmailWithToken(req.query.token);

  res.status(200).json({
    success: true,
    message: alreadyVerified
      ? 'Email is already verified. You can log in.'
      : 'Email verified successfully. You can now log in.',
    data: toPublicUser(user),
  });
});

const resendVerificationEmailHandler = catchAsync(async (req, res) => {
  const { alreadyVerified } = await resendVerificationEmail(req.body.email);

  res.status(200).json({
    success: true,
    message: alreadyVerified
      ? 'Email is already verified. You can log in.'
      : 'Verification email has been resent. Please check your inbox.',
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, requiresOtp } = await authenticateCredentials(email, password);

  if (requiresOtp) {
    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete login.',
      requiresOtp: true,
    });
  }

  await issueAuthSession(req, res, user, { message: 'Login successful' });
  log.info('User login successful', { userId: user.userId, requestId: req.requestId });
});

const verifyOtpHandler = catchAsync(async (req, res) => {
  const { email, otp, type } = req.body;
  const user = await verifyLoginOtp(email, otp, type);
  await issueAuthSession(req, res, user, { message: 'Login successful' });
});

const resendOtp = catchAsync(async (req, res) => {
  await resendLoginOtp(req.body.email, req.body.type);

  res.status(200).json({
    success: true,
    message: 'OTP has been resent to your email',
  });
});

const refresh = catchAsync(async (req, res) => {
  const rawToken = readRefreshTokenFromRequest(req);
  const decoded = verifyRefreshTokenPayload(rawToken);
  const user = await findActiveUserById(decoded.userId);
  await rotateRefreshSession(req, res, user, rawToken);
});

const logout = catchAsync(async (req, res) => {
  await revokeRefreshSession(req.cookies?.refresh_token);
  clearRefreshCookie(res);

  res.json({ success: true, message: 'Logged out successfully' });
});

const forgotPassword = catchAsync(async (req, res) => {
  await requestPasswordReset(req.body.email);

  res.status(200).json({
    success: true,
    message: GENERIC_RESET_MESSAGE,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  await resetPasswordWithToken(req.body.token, req.body.newPassword);

  res.status(200).json({
    success: true,
    message: 'Password reset successful. Please log in with your new password.',
  });
});

const changePasswordHandler = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await changePassword(req.user.userId, currentPassword, newPassword);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
    data: toPublicUser(user),
  });
});

module.exports = {
  register,
  verifyEmail,
  resendVerificationEmail: resendVerificationEmailHandler,
  login,
  verifyOtpHandler,
  resendOtp,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword: changePasswordHandler,
};
