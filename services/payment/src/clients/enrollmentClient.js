const { AppError, ERROR_CODES, getInternalServiceKey, createLogger } = require('@eduelderly/shared');

const log = createLogger('payment-service');

const getBaseUrl = () => process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:3004';

const enrollAfterPayment = async ({ userId, courseId, paymentRef }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}/internal/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': getInternalServiceKey(),
      },
      body: JSON.stringify({ userId, courseId, paymentRef }),
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

    const result = await response.json();
    return result.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    log.error('POST /internal/enroll failed', { error: error.message });
    throw new AppError('Enrollment service unavailable', 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { enrollAfterPayment };
