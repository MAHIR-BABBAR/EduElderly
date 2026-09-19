const { AppError, ERROR_CODES, getInternalServiceKey } = require('@eduelderly/shared');

const getBaseUrl = () => process.env.QUIZ_SERVICE_URL || 'http://quiz:3005';

const internalRequest = async (path) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': getInternalServiceKey(),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(
        `Quiz service responded ${response.status}: ${text}`,
        503,
        ERROR_CODES.E_SERVICE_UNAVAILABLE,
      );
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error(`[enrollment-quiz] GET ${path} failed:`, error.message);
    throw new AppError('Quiz service unavailable', 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }
};

const getCourseQuizEligibility = (userId, courseId) =>
  internalRequest(`/internal/users/${encodeURIComponent(userId)}/courses/${encodeURIComponent(courseId)}/eligibility`);

module.exports = { getCourseQuizEligibility };
