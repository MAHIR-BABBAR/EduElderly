const { buildSpec, OpenApi: S } = require('@eduelderly/shared');

const AuthUser = {
  type: 'object',
  properties: {
    userId: S.id('0192b1d2-7c3e-7a1b-9f2e-1a2b3c4d5e6f'),
    name: { type: 'string', example: 'Margaret Rose' },
    email: { type: 'string', format: 'email', example: 'margaret@example.com' },
    role: { type: 'string', enum: ['learner', 'admin'], example: 'learner' },
    isVerified: { type: 'boolean', example: true },
  },
};

const Session = {
  type: 'object',
  properties: {
    accessToken: {
      type: 'string',
      description: 'Short-lived JWT (issuer `eduelderly`, audience `eduelderly-client`). Send as `Authorization: Bearer`.',
    },
    user: S.ref('AuthUser'),
  },
};

const emailBody = S.body(
  {
    type: 'object',
    required: ['email'],
    properties: { email: { type: 'string', format: 'email' } },
  },
  true,
  { email: 'margaret@example.com' },
);

const sessionResponse = S.envelope(
  S.ref('Session'),
  'Session issued. A rotating `refresh_token` HttpOnly cookie is also set.',
);

module.exports = buildSpec({
  title: 'EduElderly Auth Service',
  description:
    'Registration, email verification, OTP login, JWT access/refresh sessions, and password reset. ' +
    'Emails are delivered through the notification service; on verification a profile is created in the user service.',
  gatewayPrefix: '/api/v1/auth',
  internalUrl: 'http://auth:3001',
  tags: [
    { name: 'Registration', description: 'Create and verify an account' },
    { name: 'Session', description: 'Login, OTP, refresh, logout' },
    { name: 'Password', description: 'Forgot, reset, change' },
  ],
  schemas: { AuthUser, Session },
  paths: {
    '/register': {
      post: {
        tags: ['Registration'],
        summary: 'Register a new learner',
        description: 'Creates an unverified account and emails a verification link. Rate limited.',
        security: S.publicRoute,
        requestBody: S.body(
          {
            type: 'object',
            required: ['name', 'email', 'password'],
            properties: {
              name: { type: 'string', minLength: 2, maxLength: 80 },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8, description: 'At least 8 characters with a letter and a number' },
            },
          },
          true,
          { name: 'Margaret Rose', email: 'margaret@example.com', password: 'Password123!' },
        ),
        responses: {
          201: S.envelope(S.ref('AuthUser'), 'Registered; verification email sent'),
          400: S.err('ValidationError'),
          409: S.err('Conflict'),
          429: S.err('RateLimited'),
        },
      },
    },
    '/verify-email': {
      post: {
        tags: ['Registration'],
        summary: 'Verify email with the emailed token',
        security: S.publicRoute,
        parameters: [S.query('token', { type: 'string' }, 'Verification token from the email link', true)],
        responses: {
          200: S.envelope(S.ref('AuthUser'), 'Email verified (idempotent if already verified)'),
          400: S.err('ValidationError'),
          401: S.err('Unauthorized'),
        },
      },
    },
    '/resend-verification': {
      post: {
        tags: ['Registration'],
        summary: 'Resend the verification email',
        security: S.publicRoute,
        requestBody: emailBody,
        responses: { 200: S.message('Sent (or already verified)'), 429: S.err('RateLimited') },
      },
    },
    '/login': {
      post: {
        tags: ['Session'],
        summary: 'Log in with email and password',
        description:
          'Verified accounts with OTP enabled receive `requiresOtp: true` and a one-time code by email; ' +
          'complete the login with `POST /verify-otp`. Otherwise a session is issued directly.',
        security: S.publicRoute,
        requestBody: S.body(
          {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
            },
          },
          true,
          { email: 'margaret@example.com', password: 'Password123!' },
        ),
        responses: {
          200: {
            description: 'Session issued, or OTP required',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', enum: [true] },
                        message: { type: 'string' },
                        data: S.ref('Session'),
                      },
                    },
                    {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', enum: [true] },
                        message: { type: 'string' },
                        requiresOtp: { type: 'boolean', enum: [true] },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: S.err('Unauthorized'),
          403: S.err('Forbidden'),
          429: S.err('RateLimited'),
        },
      },
    },
    '/verify-otp': {
      post: {
        tags: ['Session'],
        summary: 'Complete login with the emailed OTP',
        description: 'Codes expire after 10 minutes and lock after 5 wrong attempts. No countdown pressure is shown to learners.',
        security: S.publicRoute,
        requestBody: S.body(
          {
            type: 'object',
            required: ['email', 'otp'],
            properties: {
              email: { type: 'string', format: 'email' },
              otp: { type: 'string', pattern: '^[0-9]{6}$' },
              type: { type: 'string', enum: ['login'], default: 'login' },
            },
          },
          true,
          { email: 'margaret@example.com', otp: '482913' },
        ),
        responses: { 200: sessionResponse, 400: S.err('ValidationError'), 401: S.err('Unauthorized'), 429: S.err('RateLimited') },
      },
    },
    '/resend-otp': {
      post: {
        tags: ['Session'],
        summary: 'Resend the login OTP',
        security: S.publicRoute,
        requestBody: emailBody,
        responses: { 200: S.message('OTP resent'), 429: S.err('RateLimited') },
      },
    },
    '/refresh': {
      post: {
        tags: ['Session'],
        summary: 'Rotate the refresh token and get a new access token',
        description: 'Reads the `refresh_token` HttpOnly cookie. The old refresh token is revoked and a new one is set.',
        security: S.publicRoute,
        responses: { 200: sessionResponse, 401: S.err('Unauthorized') },
      },
    },
    '/logout': {
      post: {
        tags: ['Session'],
        summary: 'Revoke the refresh session and clear the cookie',
        security: S.publicRoute,
        responses: { 200: S.message('Logged out', 'Logged out successfully') },
      },
    },
    '/forgot-password': {
      post: {
        tags: ['Password'],
        summary: 'Request a password reset link',
        description: 'Always returns 200 with a generic message so account existence is not revealed.',
        security: S.publicRoute,
        requestBody: emailBody,
        responses: { 200: S.message('Accepted'), 429: S.err('RateLimited') },
      },
    },
    '/reset-password': {
      post: {
        tags: ['Password'],
        summary: 'Set a new password using the emailed token',
        security: S.publicRoute,
        requestBody: S.body(
          {
            type: 'object',
            required: ['token', 'newPassword'],
            properties: { token: { type: 'string' }, newPassword: { type: 'string', minLength: 8 } },
          },
        ),
        responses: { 200: S.message('Password reset'), 400: S.err('ValidationError'), 401: S.err('Unauthorized') },
      },
    },
    '/change-password': {
      post: {
        tags: ['Password'],
        summary: 'Change password while logged in',
        security: S.bearer,
        requestBody: S.body(
          {
            type: 'object',
            required: ['currentPassword', 'newPassword'],
            properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 8 } },
          },
        ),
        responses: { 200: S.envelope(S.ref('AuthUser'), 'Password changed'), 401: S.err('Unauthorized') },
      },
    },
  },
});
