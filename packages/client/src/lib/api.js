const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let accessToken = null;
let onUnauthorized = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function parseJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken && !options.skipAuth) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body:
      options.body && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  });

  const data = await parseJson(res);

  if (res.status === 401 && !options.skipAuth) {
    onUnauthorized?.();
  }

  if (!res.ok) {
    const message =
      data.message ||
      (typeof data.error === 'string' ? data.error : data.error?.message) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data.code || data.error?.code);
  }

  return data;
}

export const authApi = {
  register: (body) => apiFetch('/api/v1/auth/register', { method: 'POST', body, skipAuth: true }),
  login: (body) => apiFetch('/api/v1/auth/login', { method: 'POST', body, skipAuth: true }),
  verifyOtp: (body) => apiFetch('/api/v1/auth/verify-otp', { method: 'POST', body, skipAuth: true }),
  resendOtp: (body) => apiFetch('/api/v1/auth/resend-otp', { method: 'POST', body, skipAuth: true }),
  refresh: () => apiFetch('/api/v1/auth/refresh', { method: 'POST', skipAuth: true }),
  logout: () => apiFetch('/api/v1/auth/logout', { method: 'POST' }),
  forgotPassword: (body) =>
    apiFetch('/api/v1/auth/forgot-password', { method: 'POST', body, skipAuth: true }),
  resetPassword: (body) =>
    apiFetch('/api/v1/auth/reset-password', { method: 'POST', body, skipAuth: true }),
};

export const userApi = {
  getProfile: () => apiFetch('/api/v1/users/profile'),
  updateProfile: (body) => apiFetch('/api/v1/users/profile', { method: 'PUT', body }),
};

export const courseApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/v1/courses${qs ? `?${qs}` : ''}`, { skipAuth: true }).then((res) => ({
      ...res,
      data: Array.isArray(res.data) ? res.data : (res.data?.courses ?? []),
      pagination: res.data?.pagination,
    }));
  },
  getById: (courseId) => apiFetch(`/api/v1/courses/${courseId}`, { skipAuth: true }),
  listCategories: () => apiFetch('/api/v1/categories', { skipAuth: true }),
};

export const enrollmentApi = {
  list: () => apiFetch('/api/v1/enrollments').then((res) => ({
    ...res,
    data: res.data?.enrollments ?? res.data ?? [],
  })),
  get: (enrollmentId) => apiFetch(`/api/v1/enrollments/${enrollmentId}`),
  enroll: (courseId) => apiFetch('/api/v1/enrollments', { method: 'POST', body: { courseId } }),
  resume: (enrollmentId) => apiFetch(`/api/v1/enrollments/${enrollmentId}/resume`),
  progress: (enrollmentId, topicId) =>
    apiFetch(`/api/v1/enrollments/${enrollmentId}/progress`, {
      method: 'PATCH',
      body: { topicId },
    }),
  topicContent: (enrollmentId, topicId) =>
    apiFetch(`/api/v1/enrollments/${enrollmentId}/topics/${topicId}/content`),
  drop: (enrollmentId) => apiFetch(`/api/v1/enrollments/${enrollmentId}`, { method: 'DELETE' }),
};

export const quizApi = {
  getByCourse: (courseId) =>
    apiFetch(`/api/v1/quizzes/by-course/${courseId}`).then((res) => ({
      ...res,
      data: res.data?.quizzes ?? res.data ?? [],
    })),
  getById: (quizId) => apiFetch(`/api/v1/quizzes/${quizId}`),
  submitAttempt: (quizId, answers) =>
    apiFetch(`/api/v1/quizzes/${quizId}/attempts`, {
      method: 'POST',
      body: { answers },
    }),
  myAttempts: () => apiFetch('/api/v1/quizzes/attempts/me'),
};

export const paymentApi = {
  confirmOrder: (orderId) =>
    apiFetch(`/api/v1/payments/orders/${orderId}/confirm`, { method: 'POST' }),
  getOrder: (orderId) => apiFetch(`/api/v1/payments/orders/${orderId}`),
};

export const certificateApi = {
  verify: (certId) => apiFetch(`/api/v1/certificates/${certId}/verify`, { skipAuth: true }),
  listMine: () => apiFetch('/api/v1/certificates/me'),
};

export const statsApi = {
  /** Public platform counts for the landing page. */
  get: () => apiFetch('/api/v1/stats', { skipAuth: true }),
};

export const adminApi = {
  dashboard: () => apiFetch('/api/v1/admin/dashboard'),
  auditLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/v1/admin/audit-logs${qs ? `?${qs}` : ''}`);
  },
};

export const userAdminApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/v1/users${qs ? `?${qs}` : ''}`).then((res) => ({
      ...res,
      data: res.data?.users ?? res.data ?? [],
      pagination: res.data?.pagination,
    }));
  },
  getById: (userId) => apiFetch(`/api/v1/users/${userId}`),
};

export const courseAdminApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/v1/courses/admin/courses${qs ? `?${qs}` : ''}`).then((res) => ({
      ...res,
      data: res.data?.courses ?? res.data ?? [],
      pagination: res.data?.pagination,
    }));
  },
  getById: (courseId) => apiFetch(`/api/v1/courses/admin/courses/${courseId}`),
  create: (body) => apiFetch('/api/v1/courses', { method: 'POST', body }),
  update: (courseId, body) => apiFetch(`/api/v1/courses/${courseId}`, { method: 'PUT', body }),
  publish: (courseId, isPublished) =>
    apiFetch(`/api/v1/courses/${courseId}/publish`, { method: 'PATCH', body: { isPublished } }),
  delete: (courseId) => apiFetch(`/api/v1/courses/${courseId}`, { method: 'DELETE' }),
  createModule: (courseId, body) =>
    apiFetch(`/api/v1/courses/${courseId}/modules`, { method: 'POST', body }),
  updateModule: (moduleId, body) =>
    apiFetch(`/api/v1/courses/modules/${moduleId}`, { method: 'PUT', body }),
  deleteModule: (moduleId) =>
    apiFetch(`/api/v1/courses/modules/${moduleId}`, { method: 'DELETE' }),
  createTopic: (moduleId, body) =>
    apiFetch(`/api/v1/courses/modules/${moduleId}/topics`, { method: 'POST', body }),
  updateTopic: (topicId, body) =>
    apiFetch(`/api/v1/courses/topics/${topicId}`, { method: 'PUT', body }),
  deleteTopic: (topicId) =>
    apiFetch(`/api/v1/courses/topics/${topicId}`, { method: 'DELETE' }),
};

export const categoryAdminApi = {
  list: () => courseApi.listCategories(),
  create: (body) => apiFetch('/api/v1/categories', { method: 'POST', body }),
  update: (categoryId, body) =>
    apiFetch(`/api/v1/categories/${categoryId}`, { method: 'PUT', body }),
  delete: (categoryId) => apiFetch(`/api/v1/categories/${categoryId}`, { method: 'DELETE' }),
};

export const quizAdminApi = {
  create: (body) => apiFetch('/api/v1/quizzes', { method: 'POST', body }),
  addQuestion: (quizId, body) =>
    apiFetch(`/api/v1/quizzes/${quizId}/questions`, { method: 'POST', body }),
};

export const paymentAdminApi = {
  listOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/v1/payments/admin/orders${qs ? `?${qs}` : ''}`).then((res) => ({
      ...res,
      data: res.data?.orders ?? res.data ?? [],
      pagination: res.data?.pagination,
    }));
  },
  getOrder: (orderId) => apiFetch(`/api/v1/payments/admin/orders/${orderId}`),
  updateStatus: (orderId, status) =>
    apiFetch(`/api/v1/payments/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { status },
    }),
};

export { ApiError };
