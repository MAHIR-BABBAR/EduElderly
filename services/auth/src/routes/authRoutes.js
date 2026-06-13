const express = require('express');
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

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

router.post('/login', login);
router.post('/verify-otp', verifyOtpHandler);
router.post('/resend-otp', resendOtp);

router.post('/refresh', refresh);
router.post('/logout', logout);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', changePassword);

module.exports = router;
