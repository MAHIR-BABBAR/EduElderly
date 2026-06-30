const { AppError, ERROR_CODES, getInternalServiceKey } = require('@eduelderly/shared');

const getBaseUrl = () => process.env.PAYMENT_SERVICE_URL || 'http://payment:3006';

const initiateCheckout = async ({ userId, courseId, amount, currency = 'INR' }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}/internal/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': getInternalServiceKey(),
      },
      body: JSON.stringify({ userId, courseId, amount, currency }),
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new AppError('Payment checkout not available', 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(
        `Payment service responded ${response.status}: ${text}`,
        503,
        ERROR_CODES.E_SERVICE_UNAVAILABLE,
      );
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('[enrollment-payment] POST /internal/checkout failed:', error.message);
    throw new AppError('Payment service unavailable', 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { initiateCheckout };
