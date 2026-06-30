const { AppError, ERROR_CODES, getInternalServiceKey } = require('@eduelderly/shared');

const getBaseUrl = () => process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:3004';

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
      throw new AppError(
        `Enrollment service responded ${response.status}: ${text}`,
        503,
        ERROR_CODES.E_SERVICE_UNAVAILABLE,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error(`[quiz-enrollment] ${method} ${path} failed:`, error.message);
    throw new AppError('Enrollment service unavailable', 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }
};

const getEnrollment = async (userId, courseId) => {
  const result = await internalRequest(`/internal/users/${userId}/courses/${courseId}`);
  return result.data;
};

module.exports = { getEnrollment };
