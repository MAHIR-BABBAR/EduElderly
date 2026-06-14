const { User } = require('../models/User');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { ROLES } = require('@eduelderly/shared/constants/roles');
const { signEmailVerificationToken, verifyEmailVerificationToken } = require('../utils/jwtHelper');
const { hashPassword } = require('./password.service');
const { sendVerificationEmail } = require('./mailService');
const { createUserProfile } = require('../clients/userClient');

const registerUser = async ({ name, email, password }) => {
  if (!password) {
    throw new AppError('Password is required', 400, ERROR_CODES.E_VALIDATION);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already in use', 400, ERROR_CODES.E_EMAIL_TAKEN);
  }

  const newUser = await User.create({
    name,
    email,
    passHash: await hashPassword(password),
    role: ROLES.LEARNER,
    isVerified: false,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
  });

  const verificationToken = signEmailVerificationToken(newUser.userId, newUser.email);
  await sendVerificationEmail(newUser, verificationToken);

  return newUser;
};

const verifyEmailWithToken = async (token) => {
  if (!token) {
    throw new AppError('Verification token is required', 400, ERROR_CODES.E_VALIDATION);
  }

  let decoded;
  try {
    decoded = verifyEmailVerificationToken(token);
  } catch {
    throw new AppError('Invalid or expired verification link', 400, ERROR_CODES.E_AUTH_TOKEN_INVALID);
  }

  const user = await User.findOne({ userId: decoded.userId, email: decoded.email });
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  if (user.isVerified) {
    return { user, alreadyVerified: true };
  }

  await createUserProfile({
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  });

  user.isVerified = true;
  await user.save();

  return { user, alreadyVerified: false };
};

const resendVerificationEmail = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404, ERROR_CODES.E_USER_NOT_FOUND);
  }

  if (user.isVerified) {
    return { user, alreadyVerified: true };
  }

  const verificationToken = signEmailVerificationToken(user.userId, user.email);
  await sendVerificationEmail(user, verificationToken);

  return { user, alreadyVerified: false };
};

module.exports = {
  registerUser,
  verifyEmailWithToken,
  resendVerificationEmail,
};
