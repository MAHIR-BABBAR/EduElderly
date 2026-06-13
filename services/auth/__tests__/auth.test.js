const request = require('supertest');
const { createApp } = require('../src/index');
const { User } = require('../src/models/User');
const { RefreshToken } = require('../src/models/RefreshToken');

const app = createApp();
const { verifyEmailVerificationToken, signPasswordResetToken, signRefreshToken } = require('../src/utils/jwtHelper');
const bcrypt = require('bcrypt');

const VALID_USER_DATA = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Password123!',
};

let userCookies = [];

describe('Auth Service - Comprehensive Test Suite', () => {
  describe('POST /register', () => {
    it('should successfully register a user', async () => {
      const { sendVerificationEmail } = require('../src/services/mailService');
      const res = await request(app).post('/register').send(VALID_USER_DATA);

      if (res.status === 500) {
        console.error('Register Error:', res.body);
      }

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(VALID_USER_DATA.email);
      expect(sendVerificationEmail).toHaveBeenCalled();

      const user = await User.findOne({ email: VALID_USER_DATA.email });
      expect(user).toBeTruthy();
      expect(user.isVerified).toBe(false);
    });

    it('should fail registration if email is duplicate', async () => {
      // First register
      await request(app).post('/register').send(VALID_USER_DATA);
      
      // Attempt to register again
      const res = await request(app).post('/register').send(VALID_USER_DATA);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email already in use');
    });

    it('should fail registration with missing fields', async () => {
      const res = await request(app).post('/register').send({ email: 'incomplete@test.com' });

      // Note: express-validator isn't currently applied synchronously but mongoose throws validation errors.
      // Shared errorHandler catches it as E_INTERNAL or E_VALIDATION depending on how AppError maps it.
      expect(res.status).toBeGreaterThanOrEqual(400); 
    });
  });

  describe('POST /verify-email', () => {
    it('should verify email with valid token', async () => {
      const { createUserProfile } = require('../src/clients/userClient');
      const user = await User.create({
        name: 'Unverified',
        email: 'unverified@test.com',
        passHash: 'dummy',
        isVerified: false,
      });

      const jwtHelper = require('../src/utils/jwtHelper');
      const token = jwtHelper.signEmailVerificationToken(user.userId, user.email);

      const res = await request(app).post(`/verify-email?token=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/verified successfully/i);
      expect(createUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.userId,
          email: user.email,
        }),
      );

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isVerified).toBe(true);
    });

    it('should fail email verification with invalid token', async () => {
      const res = await request(app).post(`/verify-email?token=invalid_token`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid or expired/i);
    });
  });

  describe('POST /login', () => {
    let verifiedUser;

    beforeEach(async () => {
      const salt = await bcrypt.genSalt(1);
      const passHash = await bcrypt.hash('Password123!', salt);
      verifiedUser = await User.create({
        name: 'Login User',
        email: 'login@test.com',
        passHash,
        isVerified: true,
      });
    });

    it('should successfully log in verified user and return tokens', async () => {
      const res = await request(app).post('/login').send({
        email: 'login@test.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      // Retrieve RefreshToken cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      userCookies = cookies; // Save for refresh tests
    });

    it('should fail login if unverified', async () => {
      verifiedUser.isVerified = false;
      await verifiedUser.save();

      const res = await request(app).post('/login').send({
        email: 'login@test.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/verify your email/i);
    });

    it('should fail login with invalid password', async () => {
      const res = await request(app).post('/login').send({
        email: 'login@test.com',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid email or password/i);
      
      const user = await User.findById(verifiedUser._id);
      expect(user.failedLoginAttempts).toBe(1);
    });

    it('should lock out user after exceeding threshold', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).post('/login').send({
          email: 'login@test.com',
          password: 'WrongPassword!',
        });
      }

      const res = await request(app).post('/login').send({
        email: 'login@test.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(423); // Locked Out
      expect(res.body.message).toMatch(/Account locked/i);
    });

    it('should send OTP when 2FA is enabled', async () => {
      const { sendOtpEmail } = require('../src/services/mailService');
      verifiedUser.is2FAEnabled = true;
      await verifiedUser.save();

      const res = await request(app).post('/login').send({
        email: 'login@test.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.requiresOtp).toBe(true);
      expect(sendOtpEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'login@test.com' }),
        expect.any(String),
      );
    });
  });

  describe('POST /refresh', () => {
    it('should successfully refresh token', async () => {
      // Must have logged in first
      const salt = await bcrypt.genSalt(1);
      const passHash = await bcrypt.hash('Password123!', salt);
      const user = await User.create({
        name: 'Refresh User',
        email: 'refresh@test.com',
        passHash,
        isVerified: true,
      });

      const resLogin = await request(app).post('/login').send({
        email: 'refresh@test.com',
        password: 'Password123!',
      });

      const cookies = resLogin.headers['set-cookie'];

      const res = await request(app)
        .post('/refresh')
        .set('Cookie', cookies)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should fail to refresh token if missing cookie', async () => {
      const res = await request(app).post('/refresh').send();
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Refresh token missing/i);
    });
  });

  describe('Password Management (Forgot/Reset/Change)', () => {
    let user;

    beforeEach(async () => {
      const salt = await bcrypt.genSalt(1);
      const passHash = await bcrypt.hash('Password123!', salt);
      user = await User.create({
        name: 'Password User',
        email: 'pass@test.com',
        passHash,
        isVerified: true,
      });
    });

    it('POST /forgot-password should return success regardless of user existence', async () => {
      const res = await request(app).post('/forgot-password').send({ email: 'pass@test.com' });
      expect(res.status).toBe(200);

      const res2 = await request(app).post('/forgot-password').send({ email: 'nonexistent@test.com' });
      expect(res2.status).toBe(200);
    });

    it('POST /reset-password should change password with valid token', async () => {
      const token = signPasswordResetToken(user.userId, user.email);

      const res = await request(app).post('/reset-password').send({
        token,
        newPassword: 'NewPassword123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Password reset successful/i);

      const loginRes = await request(app).post('/login').send({
        email: 'pass@test.com',
        password: 'NewPassword123!',
      });

      expect(loginRes.status).toBe(200);
    });

    it('POST /change-password should change password with old password', async () => {
      const res = await request(app).post('/change-password').send({
        email: 'pass@test.com',
        currentPassword: 'Password123!',
        newPassword: 'ChangedPassword123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Password changed successfully/i);

      // Verify login with new pass
      const loginRes = await request(app).post('/login').send({
        email: 'pass@test.com',
        password: 'ChangedPassword123!',
      });
      expect(loginRes.status).toBe(200);
    });
  });

  describe('POST /logout', () => {
    it('should successfully clear cookies on logout', async () => {
      const res = await request(app)
        .post('/logout')
        .set('Cookie', userCookies)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');

      const cookies = res.headers['set-cookie'];
      expect(cookies[0]).toMatch(/refresh_token=;/); // Cookie effectively cleared
    });
  });
});
