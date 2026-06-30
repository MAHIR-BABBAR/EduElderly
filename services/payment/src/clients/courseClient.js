const { AppError, ERROR_CODES, getInternalServiceKey } = require('@eduelderly/shared');

const getBaseUrl = () => process.env.COURSE_SERVICE_URL || 'http://course:3003';

const getCourse = async (courseId) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}/internal/courses/${courseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': getInternalServiceKey(),
      },
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new AppError('Course not found', 404, ERROR_CODES.E_COURSE_NOT_FOUND);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(
        `Course service responded ${response.status}: ${text}`,
        503,
        ERROR_CODES.E_SERVICE_UNAVAILABLE,
      );
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error(`[payment-course] GET /internal/courses/${courseId} failed:`, error.message);
    throw new AppError('Course service unavailable', 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { getCourse };
