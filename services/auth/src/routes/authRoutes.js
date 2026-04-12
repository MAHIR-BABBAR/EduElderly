const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/authController');

// ─── Public routes (no auth required) ────────────────────────────────────────

// Registration & email verification
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Login & 2FA
router.post('/login', login);
router.post('/verify-otp', verifyOtpHandler);
router.post('/resend-otp', resendOtp);

// Token management
router.post('/refresh', refresh);
router.post('/logout', logout);

// Password management
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', changePassword);

module.exports = router;
