const express = require('express');
const { extractUser } = require('@eduelderly/shared');
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

router.post('/register', authSensitiveLimiter, register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', authSensitiveLimiter, resendVerificationEmail);

router.post('/login', authSensitiveLimiter, login);
router.post('/verify-otp', authSensitiveLimiter, verifyOtpHandler);
router.post('/resend-otp', authSensitiveLimiter, resendOtp);

router.post('/refresh', refresh);
router.post('/logout', logout);

router.post('/forgot-password', authSensitiveLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', extractUser, changePassword);

module.exports = router;
