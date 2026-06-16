const { AppError, ERROR_CODES } = require('@eduelderly/shared');

const getBaseUrl = () => process.env.USER_SERVICE_URL || 'http://user:3002';

const internalRequest = async (path, { method = 'GET', body } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': process.env.INTERNAL_SERVICE_KEY || '',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(
        `User service responded ${response.status}: ${text}`,
        503,
        ERROR_CODES.E_SERVICE_UNAVAILABLE,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error(`[enrollment-user] ${method} ${path} failed:`, error.message);
    throw new AppError('User service unavailable', 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }
};

const incrementXP = (userId, amount) =>
  internalRequest(`/internal/${userId}/xp`, { method: 'PATCH', body: { amount } });

module.exports = { incrementXP };
