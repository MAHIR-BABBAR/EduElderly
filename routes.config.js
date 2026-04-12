/**
 * Gateway Master Route Configuration
 */

const ROUTES_CONFIG = {
  // --- HEALTH CHECKS (Gateway Level) ---
  health: {
    prefix: '/health',
    public: [
      { method: 'GET', match: 'prefix', path: '/' } // Allows /health and /health/:service
    ]
  },

  // --- DOWNSTREAM SERVICES ---
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
    ]
  },
  
  courses: {
    prefix: '/api/v1/courses',
    target: process.env.COURSE_SERVICE_URL || 'http://course:3003',
    public: [
      { method: 'GET', match: 'exact', path: '' }, // Matches exact /api/v1/courses
      { method: 'GET', match: 'regex', pattern: /^\/[\w-]+$/ } // Matches /api/v1/courses/:id
    ]
  },

  users: {
    prefix: '/api/v1/users',
    target: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    public: [] // Strictly protected
  },

  // Add the remaining 6 services following this exact pattern...
};

module.exports = { ROUTES_CONFIG };