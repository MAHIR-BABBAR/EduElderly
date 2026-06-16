const { AppError, ERROR_CODES } = require('@eduelderly/shared');

const getBaseUrl = () => process.env.COURSE_SERVICE_URL || 'http://localhost:3003';

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

    if (response.status === 404) {
      const resource = path.includes('/topics/') ? 'Topic' : 'Course';
      throw new AppError(`${resource} not found`, 404, ERROR_CODES.E_COURSE_NOT_FOUND);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(
        `Course service responded ${response.status}: ${text}`,
        503,
        ERROR_CODES.E_SERVICE_UNAVAILABLE,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error(`[enrollment-course] ${method} ${path} failed:`, error.message);
    throw new AppError('Course service unavailable', 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }
};

const getCourse = async (courseId) => {
  const result = await internalRequest(`/internal/courses/${courseId}`);
  return result.data;
};

const getCourseStats = async (courseId) => {
  const result = await internalRequest(`/internal/courses/${courseId}/stats`);
  return result.data;
};

const getTopic = async (topicId) => {
  const result = await internalRequest(`/internal/topics/${topicId}`);
  return result.data;
};

module.exports = { getCourse, getCourseStats, getTopic };
