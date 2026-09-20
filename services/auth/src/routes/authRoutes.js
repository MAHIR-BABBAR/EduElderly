const express = require('express');
const { extractUser } = require('@eduelderly/shared');
const V = require('../validators/authValidators');
const { authSensitiveLimiter } = require('../middleware/rateLimiter');
const {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  verifyOtpHandler,
  resendOtp,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', authSensitiveLimiter, V.registerRules, register);
router.post('/verify-email', V.verifyEmailRules, verifyEmail);
router.post('/resend-verification', authSensitiveLimiter, V.emailOnlyRules, resendVerificationEmail);

router.post('/login', authSensitiveLimiter, V.loginRules, login);
router.post('/verify-otp', authSensitiveLimiter, V.otpRules, verifyOtpHandler);
router.post('/resend-otp', authSensitiveLimiter, V.emailOnlyRules, resendOtp);

router.post('/refresh', refresh);
router.post('/logout', logout);

router.post('/forgot-password', authSensitiveLimiter, V.emailOnlyRules, forgotPassword);
router.post('/reset-password', V.resetPasswordRules, resetPassword);
router.post('/change-password', extractUser, V.changePasswordRules, changePassword);

module.exports = router;
