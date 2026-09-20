const ROUTES_CONFIG = {
  health: {
    prefix: '/health',
    public: [{ method: 'GET', match: 'prefix', path: '/' }],
  },

  auth: {
    prefix: '/api/v1/auth',
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    public: [
      { method: 'POST', match: 'exact', path: '/register' },
      { method: 'POST', match: 'exact', path: '/login' },
      { method: 'POST', match: 'exact', path: '/verify-email' },
      { method: 'POST', match: 'exact', path: '/forgot-password' },
      { method: 'POST', match: 'exact', path: '/reset-password' },
      { method: 'POST', match: 'exact', path: '/resend-verification' },
      { method: 'POST', match: 'exact', path: '/refresh' },
      { method: 'POST', match: 'exact', path: '/logout' },
      { method: 'POST', match: 'exact', path: '/verify-otp' },
      { method: 'POST', match: 'exact', path: '/resend-otp' },
    ],
  },

  courses: {
    prefix: '/api/v1/courses',
    target: process.env.COURSE_SERVICE_URL || 'http://localhost:3003',
    public: [
      { method: 'GET', match: 'exact', path: '' },
      { method: 'GET', match: 'regex', pattern: /^\/[\w-]+$/ },
    ],
  },

  // Categories live under /categories on the course service, so the gateway
  // prefix maps onto a sub-path rather than the service root.
  categories: {
    prefix: '/api/v1/categories',
    target: process.env.COURSE_SERVICE_URL || 'http://localhost:3003',
    targetBasePath: '/categories',
    public: [
      { method: 'GET', match: 'prefix', path: '/' },
    ],
  },

  users: {
    prefix: '/api/v1/users',
    target: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    public: [],
  },

  enrollments: {
    prefix: '/api/v1/enrollments',
    target: process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:3004',
    public: [],
  },

  quizzes: {
    prefix: '/api/v1/quizzes',
    target: process.env.QUIZ_SERVICE_URL || 'http://localhost:3005',
    public: [],
  },

  payments: {
    prefix: '/api/v1/payments',
    target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
    // Provider webhooks carry no user JWT; the payment service verifies the HMAC signature.
    public: [{ method: 'POST', match: 'exact', path: '/webhook' }],
  },

  notifications: {
    prefix: '/api/v1/notifications',
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
    public: [],
  },

  certificates: {
    prefix: '/api/v1/certificates',
    target: process.env.CERTIFICATE_SERVICE_URL || 'http://localhost:3009',
    public: [
      { method: 'GET', match: 'regex', pattern: /^\/[\w-]+\/verify$/ },
    ],
  },

  // Public platform counts for the landing page. Proxied to the admin
  // service's unauthenticated /public-stats route.
  stats: {
    prefix: '/api/v1/stats',
    target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3008',
    targetBasePath: '/public-stats',
    public: [{ method: 'GET', match: 'prefix', path: '/' }],
  },

  admin: {
    prefix: '/api/v1/admin',
    target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3008',
    public: [],
  },
};

module.exports = { ROUTES_CONFIG };
