const { buildSpec, OpenApi: S } = require('@eduelderly/shared');

const Certificate = {
  type: 'object',
  properties: {
    certId: S.id('0192b1d2-0000-7a1b-9f2e-000000000091'),
    userId: { type: 'string' },
    courseId: { type: 'string' },
    courseTitle: { type: 'string', example: 'Email Basics for Everyday Life' },
    userName: { type: 'string', example: 'Margaret Rose' },
    issuedAt: S.dateTime,
    verifyUrl: { type: 'string', format: 'uri', example: 'http://localhost:5173/verify-certificate?certId=0192b1d2-…' },
  },
};

const Verification = {
  type: 'object',
  properties: {
    valid: { type: 'boolean' },
    certId: { type: 'string' },
    courseTitle: { type: 'string' },
    userName: { type: 'string' },
    issuedAt: S.dateTime,
  },
};

module.exports = buildSpec({
  title: 'EduElderly Certificate Service',
  description:
    'Issues one certificate per learner and course when the enrollment service reports completion. ' +
    'Certificates are publicly verifiable by id without authentication.',
  gatewayPrefix: '/api/v1/certificates',
  internalUrl: 'http://certificate:3009',
  tags: [
    { name: 'Certificates', description: 'My certificates' },
    { name: 'Verify', description: 'Public verification' },
  ],
  schemas: { Certificate, Verification },
  paths: {
    '/me': {
      get: {
        tags: ['Certificates'],
        summary: 'List my certificates',
        security: S.bearer,
        responses: { 200: S.envelope({ type: 'array', items: S.ref('Certificate') }), 401: S.err('Unauthorized') },
      },
    },
    '/me/{certId}/download': {
      get: {
        tags: ['Certificates'],
        summary: 'Download my certificate PDF',
        security: S.bearer,
        parameters: [S.pathParam('certId', 'Certificate id')],
        responses: {
          200: { description: 'PDF bytes', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } },
          401: S.err('Unauthorized'),
          403: S.err('Forbidden'),
          404: S.err('NotFound'),
        },
      },
    },
    '/{certId}/verify': {
      get: {
        tags: ['Verify'],
        summary: 'Verify a certificate by id (public)',
        security: S.publicRoute,
        parameters: [S.pathParam('certId', 'Certificate id')],
        responses: {
          200: S.envelope(S.ref('Verification'), '`valid: false` when the id is unknown'),
        },
      },
    },
    '/internal/issue': {
      post: {
        tags: ['Internal'],
        summary: 'Issue a certificate (idempotent per user and course)',
        requestBody: S.body({
          type: 'object',
          required: ['userId', 'courseId', 'userName', 'courseTitle'],
          properties: {
            userId: { type: 'string' },
            courseId: { type: 'string' },
            userName: { type: 'string' },
            courseTitle: { type: 'string' },
          },
        }),
        responses: {
          200: S.envelope({
            type: 'object',
            properties: { certId: { type: 'string' }, verifyUrl: { type: 'string', format: 'uri' }, issuedAt: S.dateTime },
          }),
          400: S.err('ValidationError'),
        },
      },
    },
    '/internal/stats': {
      get: {
        tags: ['Internal'],
        summary: 'Certificate count for the admin dashboard',
        responses: { 200: S.envelope({ type: 'object', properties: { totalCertificates: { type: 'integer' } } }) },
      },
    },
  },
});
