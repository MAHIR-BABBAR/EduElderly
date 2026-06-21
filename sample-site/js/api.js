const API_BASE = window.EDUELDERLY_API || 'http://localhost:8080';

const getToken = () => sessionStorage.getItem('accessToken');
const setToken = (token) => sessionStorage.setItem('accessToken', token);
const clearToken = () => sessionStorage.removeItem('accessToken');

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || data.error?.message || `Request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.code = data.code || data.error?.code;
    throw err;
  }

  return data;
}

export const authApi = {
  register: (payload) => api('/api/v1/auth/register', { method: 'POST', body: payload, auth: false }),
  verifyEmail: (token) =>
    api(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      auth: false,
    }),
  login: (payload) => api('/api/v1/auth/login', { method: 'POST', body: payload, auth: false }),
  verifyOtp: (payload) =>
    api('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: { ...payload, type: 'login' },
      auth: false,
    }),
};

export const courseApi = {
  list: () => api('/api/v1/courses', { auth: false }),
  get: (courseId) => api(`/api/v1/courses/${courseId}`, { auth: false }),
};

export const enrollmentApi = {
  list: () => api('/api/v1/enrollments'),
  enroll: async (courseId) => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/api/v1/enrollments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ courseId }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.message || data.error?.message || `Request failed (${response.status})`;
      const err = new Error(message);
      err.status = response.status;
      err.code = data.code || data.error?.code;
      throw err;
    }

    return { ...data, httpStatus: response.status };
  },
};

export const paymentApi = {
  myTransactions: () => api('/api/v1/payments/transactions/me'),
  myOrder: (orderId) => api(`/api/v1/payments/orders/${orderId}`),
  adminOrders: (status = 'pending') =>
    api(`/api/v1/payments/admin/orders?status=${encodeURIComponent(status)}`),
  updateOrderStatus: (orderId, status) =>
    api(`/api/v1/payments/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { status },
    }),
};

export const quizApi = {
  byCourse: (courseId) => api(`/api/v1/quizzes/by-course/${courseId}`),
  get: (quizId) => api(`/api/v1/quizzes/${quizId}`),
  submit: (quizId, answers) =>
    api(`/api/v1/quizzes/${quizId}/attempts`, { method: 'POST', body: { answers } }),
  myAttempts: () => api('/api/v1/quizzes/attempts/me'),
};

export { getToken, setToken, clearToken, API_BASE };
