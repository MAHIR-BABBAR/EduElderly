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
      { method: 'POST', match: 'exact', path: '/change-password' },
    ],
  },

  courses: {
    prefix: '/api/v1/courses',
    target: process.env.COURSE_SERVICE_URL || 'http://course:3003',
    public: [
      { method: 'GET', match: 'exact', path: '' },
      { method: 'GET', match: 'regex', pattern: /^\/[\w-]+$/ },
    ],
  },

  categories: {
    prefix: '/api/v1/categories',
    target: process.env.COURSE_SERVICE_URL || 'http://course:3003',
    pathRewrite: { '^/api/v1/categories': '/categories' },
    public: [
      { method: 'GET', match: 'prefix', path: '/' },
    ],
  },

  users: {
    prefix: '/api/v1/users',
    target: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    public: [],
  },
};

module.exports = { ROUTES_CONFIG };
