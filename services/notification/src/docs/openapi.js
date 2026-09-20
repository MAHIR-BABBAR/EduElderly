const { buildSpec, OpenApi: S } = require('@eduelderly/shared');

const Notification = {
  type: 'object',
  properties: {
    notificationId: S.id('0192b1d2-0000-7a1b-9f2e-000000000081'),
    userId: { type: 'string', nullable: true },
    type: {
      type: 'string',
      enum: ['otp', 'email_verification', 'password_reset', 'welcome', 'enroll', 'quiz_result', 'completion'],
    },
    channel: { type: 'string', enum: ['email', 'in_app', 'both'] },
    subject: { type: 'string', example: 'Certificate ready: Email Basics' },
    body: { type: 'string' },
    status: { type: 'string', enum: ['pending', 'sent', 'failed'] },
    isRead: { type: 'boolean' },
    sentAt: { ...S.dateTime, nullable: true },
    createdAt: S.dateTime,
  },
};

module.exports = buildSpec({
  title: 'EduElderly Notification Service',
  description:
    'Transactional email through Brevo plus an in-app inbox. Other services never talk to Brevo directly; they post to ' +
    '`/internal/send` with a template type and data, and this service renders branded, accessible HTML with a plain-text fallback.',
  gatewayPrefix: '/api/v1/notifications',
  internalUrl: 'http://notification:3007',
  tags: [{ name: 'Inbox', description: 'In-app notifications for the signed-in learner' }],
  schemas: {
    Notification,
    SendResult: {
      type: 'object',
      properties: {
        notificationId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'sent', 'failed'] },
      },
    },
    QueueStats: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'False when the service runs without Redis' },
        name: { type: 'string', example: 'email' },
        waiting: { type: 'integer' },
        active: { type: 'integer' },
        completed: { type: 'integer' },
        failed: { type: 'integer' },
        delayed: { type: 'integer' },
      },
    },
  },
  paths: {
    '/me': {
      get: {
        tags: ['Inbox'],
        summary: 'List my notifications',
        security: S.bearer,
        parameters: S.PAGINATION_QUERY,
        responses: { 200: S.envelope(S.paginated('notifications', S.ref('Notification'))), 401: S.err('Unauthorized') },
      },
    },
    '/me/{notificationId}/read': {
      patch: {
        tags: ['Inbox'],
        summary: 'Mark a notification as read',
        security: S.bearer,
        parameters: [S.pathParam('notificationId', 'Notification id')],
        responses: { 200: S.envelope(S.ref('Notification')), 401: S.err('Unauthorized'), 404: S.err('NotFound') },
      },
    },
    '/internal/send': {
      post: {
        tags: ['Internal'],
        summary: 'Render a template and send it',
        description:
          'Template types and their required `templateData`: `otp` (otp), `email_verification` and `password_reset` (link), ' +
          '`enroll` (courseTitle), `completion` (courseTitle plus either certId+verifyUrl or quizzesRemaining), `welcome`, `quiz_result`.',
        requestBody: S.body(
          {
            type: 'object',
            required: ['type'],
            properties: {
              userId: { type: 'string', description: 'Also creates an in-app record when present' },
              email: { type: 'string', format: 'email' },
              type: { type: 'string', enum: ['otp', 'email_verification', 'password_reset', 'welcome', 'enroll', 'quiz_result', 'completion'] },
              templateData: { type: 'object', additionalProperties: true },
            },
          },
          true,
          {
            userId: '0192b1d2-7c3e-7a1b-9f2e-1a2b3c4d5e6f',
            email: 'margaret@example.com',
            type: 'completion',
            templateData: { name: 'Margaret', courseTitle: 'Email Basics', certId: 'cert-1', verifyUrl: 'http://localhost:5173/verify-certificate?certId=cert-1' },
          },
        ),
        responses: {
          200: S.envelope(S.ref('SendResult'), 'Sent inline (no queue configured)'),
          202: S.envelope(S.ref('SendResult'), 'Queued; a worker delivers it with up to 5 retries'),
          400: S.err('ValidationError'),
          401: S.err('Unauthorized'),
        },
      },
    },
    '/internal/queue/stats': {
      get: {
        tags: ['Internal'],
        summary: 'Email queue counts (BullMQ)',
        responses: { 200: S.envelope(S.ref('QueueStats')) },
      },
    },
  },
});
