const { getInternalServiceKey } = require('@eduelderly/shared');

const getBaseUrl = () => process.env.USER_SERVICE_URL || 'http://user:3002';

const internalRequest = async (path, { method = 'GET', body } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': getInternalServiceKey(),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`User service responded ${response.status}: ${text}`);
    }

    return response.json();
  } catch (error) {
    console.error(`[auth-user] ${method} ${path} failed:`, error.message);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const createUserProfile = (payload) => internalRequest('/internal/profile', { method: 'POST', body: payload });

const syncUserProfile = (payload) => internalRequest('/internal/sync', { method: 'PATCH', body: payload });

module.exports = { createUserProfile, syncUserProfile };
