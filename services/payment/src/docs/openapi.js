const { buildSpec, OpenApi: S } = require('@eduelderly/shared');

const Transaction = {
  type: 'object',
  properties: {
    orderId: S.id('0192b1d2-0000-7a1b-9f2e-000000000071'),
    userId: { type: 'string' },
    courseId: { type: 'string' },
    amount: { type: 'number', example: 499 },
    currency: { type: 'string', example: 'INR' },
    status: { type: 'string', enum: ['pending', 'success', 'failed', 'refunded'] },
    type: { type: 'string', enum: ['purchase', 'refund'] },
    confirmedAt: { ...S.dateTime, nullable: true },
    createdAt: S.dateTime,
    updatedAt: S.dateTime,
  },
};

const AdminTransaction = {
  allOf: [
    S.ref('Transaction'),
    {
      type: 'object',
      properties: {
        statusUpdatedBy: { type: 'string', nullable: true, description: 'Admin user id, or `mock-provider` for learner self-confirm' },
        statusUpdatedAt: { ...S.dateTime, nullable: true },
      },
    },
  ],
};

const orderParam = S.pathParam('orderId', 'Order id');

module.exports = buildSpec({
  title: 'EduElderly Payment Service',
  description:
    'Orders for paid courses with a strict state machine (pending → success | failed, success → refunded). ' +
    'Confirming an order enrolls the learner **before** the order is marked paid, so a failed enrollment leaves the order pending and retryable. ' +
    'The mock provider lets a learner confirm their own order in development; production expects a real provider.',
  gatewayPrefix: '/api/v1/payments',
  internalUrl: 'http://payment:3006',
  tags: [
    { name: 'Orders', description: 'My orders' },
    { name: 'Payment admin', description: 'Order management (admin role)' },
  ],
  schemas: { Transaction, AdminTransaction },
  paths: {
    '/transactions/me': {
      get: {
        tags: ['Orders'],
        summary: 'List my transactions',
        security: S.bearer,
        responses: {
          200: S.envelope({ type: 'object', properties: { transactions: { type: 'array', items: S.ref('Transaction') } } }),
          401: S.err('Unauthorized'),
        },
      },
    },
    '/orders/{orderId}': {
      get: {
        tags: ['Orders'],
        summary: 'Get one of my orders',
        security: S.bearer,
        parameters: [orderParam],
        responses: { 200: S.envelope(S.ref('Transaction')), 403: S.err('Forbidden'), 404: S.err('NotFound') },
      },
    },
    '/orders/{orderId}/confirm': {
      post: {
        tags: ['Orders'],
        summary: 'Mock provider only: confirm my pending order',
        description:
          'Available when `PAYMENT_PROVIDER=mock` (the default outside production). Enrolls the learner, then marks the order paid. ' +
          'Returns 404 when another provider is configured.',
        security: S.bearer,
        parameters: [orderParam],
        responses: {
          200: S.envelope(S.ref('Transaction'), 'Order paid and learner enrolled'),
          400: S.err('ValidationError'),
          403: S.err('Forbidden'),
          404: S.err('NotFound'),
          503: S.err('ServiceUnavailable'),
        },
      },
    },
    '/admin/orders': {
      get: {
        tags: ['Payment admin'],
        summary: 'List orders',
        security: S.bearer,
        parameters: [
          S.query('status', { type: 'string', enum: ['pending', 'success', 'failed', 'refunded'] }, 'Filter by status'),
          ...S.PAGINATION_QUERY,
        ],
        responses: { 200: S.envelope(S.paginated('orders', S.ref('AdminTransaction'))), 403: S.err('Forbidden') },
      },
    },
    '/admin/orders/{orderId}': {
      get: {
        tags: ['Payment admin'],
        summary: 'Get an order',
        security: S.bearer,
        parameters: [orderParam],
        responses: { 200: S.envelope(S.ref('AdminTransaction')), 403: S.err('Forbidden'), 404: S.err('NotFound') },
      },
    },
    '/admin/orders/{orderId}/status': {
      patch: {
        tags: ['Payment admin'],
        summary: 'Transition an order (confirm, fail, refund)',
        description: 'Invalid transitions are rejected with 400. Confirmations and refunds are written to the admin audit log.',
        security: S.bearer,
        parameters: [orderParam],
        requestBody: S.body(
          { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['success', 'failed', 'refunded'] } } },
          true,
          { status: 'success' },
        ),
        responses: {
          200: S.envelope(S.ref('AdminTransaction')),
          400: S.err('ValidationError'),
          403: S.err('Forbidden'),
          404: S.err('NotFound'),
          503: S.err('ServiceUnavailable'),
        },
      },
    },
    '/internal/checkout': {
      post: {
        tags: ['Internal'],
        summary: 'Create a pending order (called by enrollment for paid courses)',
        description: 'The amount is validated against the course price in the course service; one pending order per user and course.',
        requestBody: S.body({
          type: 'object',
          required: ['userId', 'courseId', 'amount'],
          properties: {
            userId: { type: 'string' },
            courseId: { type: 'string' },
            amount: { type: 'number', minimum: 0 },
            currency: { type: 'string', minLength: 3, maxLength: 3, default: 'USD' },
          },
        }),
        responses: {
          200: S.envelope({ type: 'object', properties: { orderId: { type: 'string' }, checkoutUrl: { type: 'string', format: 'uri' } } }),
          400: S.err('ValidationError'),
          404: S.err('NotFound'),
          409: S.err('Conflict'),
        },
      },
    },
    '/internal/status': {
      get: {
        tags: ['Internal'],
        summary: 'Has a learner paid for a course?',
        parameters: [S.query('userId', { type: 'string' }, 'User id', true), S.query('courseId', { type: 'string' }, 'Course id', true)],
        responses: {
          200: S.envelope({ type: 'object', properties: { paid: { type: 'boolean' }, orderId: { type: 'string', nullable: true } } }),
        },
      },
    },
    '/internal/stats': {
      get: {
        tags: ['Internal'],
        summary: 'Order counts and revenue for the admin dashboard',
        responses: {
          200: S.envelope({
            type: 'object',
            properties: {
              totalOrders: { type: 'integer' },
              successfulOrders: { type: 'integer' },
              pendingOrders: { type: 'integer' },
              revenueTotal: { type: 'number' },
              currency: { type: 'string' },
            },
          }),
        },
      },
    },
  },
});
