const { buildSpec, OpenApi: S } = require('@eduelderly/shared');

const Profile = {
  type: 'object',
  properties: {
    userId: S.id('0192b1d2-7c3e-7a1b-9f2e-1a2b3c4d5e6f'),
    name: { type: 'string', example: 'Margaret Rose' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['learner', 'admin'] },
    isActive: { type: 'boolean' },
    avatarUrl: { ...S.url, nullable: true },
    fontSizePref: {
      type: 'string',
      enum: ['default', 'large', 'xl', 'huge'],
      description: 'Drives `data-font-size` on the client `<html>` element',
    },
    highContrast: { type: 'boolean', description: 'Drives `data-high-contrast` on the client' },
    lang: { type: 'string', enum: ['en'] },
    totalXP: { type: 'integer', example: 120 },
    bio: { type: 'string', maxLength: 300 },
    createdAt: S.dateTime,
    updatedAt: S.dateTime,
  },
};

module.exports = buildSpec({
  title: 'EduElderly User Service',
  description:
    'Learner profiles and accessibility preferences. Profiles are created by the auth service after email verification; ' +
    'XP is awarded by the enrollment service.',
  gatewayPrefix: '/api/v1/users',
  internalUrl: 'http://user:3002',
  tags: [
    { name: 'Profile', description: 'The signed-in learner' },
    { name: 'Admin', description: 'User management (admin role)' },
  ],
  schemas: { Profile },
  paths: {
    '/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get my profile',
        security: S.bearer,
        responses: { 200: S.envelope(S.ref('Profile')), 401: S.err('Unauthorized'), 404: S.err('NotFound') },
      },
      put: {
        tags: ['Profile'],
        summary: 'Update my profile and accessibility preferences',
        security: S.bearer,
        requestBody: S.body(
          {
            type: 'object',
            properties: {
              avatarUrl: { type: 'string', format: 'uri', nullable: true, description: 'https only' },
              fontSizePref: { type: 'string', enum: ['default', 'large', 'xl', 'huge'] },
              highContrast: { type: 'boolean' },
              lang: { type: 'string', enum: ['en'] },
              bio: { type: 'string', maxLength: 300 },
            },
          },
          true,
          { fontSizePref: 'xl', highContrast: true },
        ),
        responses: { 200: S.envelope(S.ref('Profile')), 400: S.err('ValidationError'), 401: S.err('Unauthorized') },
      },
    },
    '/': {
      get: {
        tags: ['Admin'],
        summary: 'List users',
        security: S.bearer,
        parameters: [...S.PAGINATION_QUERY, S.query('q', { type: 'string', maxLength: 100 }, 'Search by name or email')],
        responses: {
          200: S.envelope(S.paginated('users', S.ref('Profile'))),
          401: S.err('Unauthorized'),
          403: S.err('Forbidden'),
        },
      },
    },
    '/{userId}': {
      get: {
        tags: ['Admin'],
        summary: 'Get a user by id',
        security: S.bearer,
        parameters: [S.pathParam('userId', 'User id')],
        responses: { 200: S.envelope(S.ref('Profile')), 403: S.err('Forbidden'), 404: S.err('NotFound') },
      },
    },
    '/internal/stats': {
      get: {
        tags: ['Internal'],
        summary: 'User counts for the admin dashboard',
        responses: {
          200: S.envelope({
            type: 'object',
            properties: { totalUsers: { type: 'integer' }, activeUsers: { type: 'integer' } },
          }),
        },
      },
    },
    '/internal/profile': {
      post: {
        tags: ['Internal'],
        summary: 'Create a profile (called by auth after verification)',
        requestBody: S.body({
          type: 'object',
          required: ['userId', 'name', 'email'],
          properties: {
            userId: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['learner', 'admin'] },
          },
        }),
        responses: { 200: S.envelope(S.ref('Profile')), 400: S.err('ValidationError') },
      },
    },
    '/internal/sync': {
      patch: {
        tags: ['Internal'],
        summary: 'Sync name, email, role, or active flag from auth',
        requestBody: S.body({
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        }),
        responses: { 200: S.envelope(S.ref('Profile')), 404: S.err('NotFound') },
      },
    },
    '/internal/{userId}/profile': {
      get: {
        tags: ['Internal'],
        summary: 'Get a profile by id (used for emails and certificates)',
        parameters: [S.pathParam('userId', 'User id')],
        responses: { 200: S.envelope(S.ref('Profile')), 404: S.err('NotFound') },
      },
    },
    '/internal/{userId}/xp': {
      patch: {
        tags: ['Internal'],
        summary: 'Increment XP (topic and course completion rewards)',
        parameters: [S.pathParam('userId', 'User id')],
        requestBody: S.body({
          type: 'object',
          required: ['amount'],
          properties: { amount: { type: 'integer', example: 10 } },
        }),
        responses: { 200: S.envelope(S.ref('Profile')), 404: S.err('NotFound') },
      },
    },
  },
});
