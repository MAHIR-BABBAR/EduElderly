const { buildSpec, OpenApi: S } = require('@eduelderly/shared');

const Dashboard = {
  type: 'object',
  description: 'Fan-out aggregation over user, course, enrollment, payment, and certificate internal stats. Partial failures are reported, not fatal.',
  properties: {
    users: { type: 'object', nullable: true, properties: { totalUsers: { type: 'integer' }, activeUsers: { type: 'integer' } } },
    courses: { type: 'object', nullable: true, properties: { totalCourses: { type: 'integer' }, publishedCourses: { type: 'integer' } } },
    enrollments: {
      type: 'object',
      nullable: true,
      properties: { totalEnrollments: { type: 'integer' }, activeEnrollments: { type: 'integer' }, completedEnrollments: { type: 'integer' } },
    },
    revenue: {
      type: 'object',
      nullable: true,
      properties: {
        totalOrders: { type: 'integer' },
        successfulOrders: { type: 'integer' },
        pendingOrders: { type: 'integer' },
        revenueTotal: { type: 'number' },
        currency: { type: 'string' },
      },
    },
    completions: { type: 'integer' },
    certificates: { type: 'integer' },
    partialErrors: { type: 'array', items: { type: 'string' }, description: 'Services that did not respond' },
  },
};

const AuditLog = {
  type: 'object',
  properties: {
    auditId: S.id('0192b1d2-0000-7a1b-9f2e-0000000000a1'),
    actorId: { type: 'string' },
    action: { type: 'string', example: 'CONFIRM_PAYMENT' },
    targetType: { type: 'string', example: 'order' },
    targetId: { type: 'string' },
    metadata: { type: 'object', additionalProperties: true },
    ip: { type: 'string', nullable: true },
    createdAt: S.dateTime,
  },
};

module.exports = buildSpec({
  title: 'EduElderly Admin Service',
  description: 'Operational dashboard and an append-only audit log written by other services for privileged actions.',
  gatewayPrefix: '/api/v1/admin',
  internalUrl: 'http://admin:3008',
  tags: [{ name: 'Admin', description: 'Requires the admin role' }],
  schemas: { Dashboard, AuditLog },
  paths: {
    '/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Platform counts and revenue',
        security: S.bearer,
        responses: { 200: S.envelope(S.ref('Dashboard')), 401: S.err('Unauthorized'), 403: S.err('Forbidden') },
      },
    },
    '/audit-logs': {
      get: {
        tags: ['Admin'],
        summary: 'List audit log entries, newest first',
        security: S.bearer,
        parameters: [
          ...S.PAGINATION_QUERY,
          S.query('action', { type: 'string' }, 'Filter by action'),
          S.query('actorId', { type: 'string' }, 'Filter by actor'),
        ],
        responses: { 200: S.envelope(S.paginated('logs', S.ref('AuditLog'))), 403: S.err('Forbidden') },
      },
    },
    '/internal/audit-logs': {
      post: {
        tags: ['Internal'],
        summary: 'Append an audit entry (payment, course publish, …)',
        requestBody: S.body({
          type: 'object',
          required: ['actorId', 'action', 'targetType', 'targetId'],
          properties: {
            actorId: { type: 'string' },
            action: { type: 'string' },
            targetType: { type: 'string' },
            targetId: { type: 'string' },
            metadata: { type: 'object', additionalProperties: true },
          },
        }),
        responses: { 201: S.envelope(S.ref('AuditLog')), 400: S.err('ValidationError') },
      },
    },
  },
});
