const crypto = require('crypto');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { PaymentProvider } = require('./PaymentProvider');

const SIGNATURE_HEADER = 'x-webhook-signature';

/**
 * Development provider. No money moves, but the integration surface is the
 * same as a real provider: it hands back a checkout URL and it accepts
 * HMAC-SHA256 signed webhooks, so the webhook path is exercised end to end in
 * tests and demos. It is also the only provider that lets a learner confirm
 * their own order from the checkout page.
 */
class MockProvider extends PaymentProvider {
  get name() {
    return 'mock';
  }

  get supportsLearnerConfirm() {
    return true;
  }

  get webhookSecret() {
    return process.env.MOCK_WEBHOOK_SECRET || 'mock-webhook-secret';
  }

  get checkoutBaseUrl() {
    return process.env.MOCK_CHECKOUT_BASE_URL || 'http://localhost:5173/#order-pending';
  }

  async createOrder({ orderId }) {
    return {
      checkoutUrl: `${this.checkoutBaseUrl}/${orderId}`,
      providerOrderId: `mock_${orderId}`,
    };
  }

  /** Helper for tests and demo scripts: sign a payload the way a provider would. */
  sign(rawBody) {
    return crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
  }

  verifyWebhook({ rawBody, headers, body }) {
    const provided = headers[SIGNATURE_HEADER];
    if (!provided || typeof rawBody !== 'string') {
      throw new AppError('Missing webhook signature', 401, ERROR_CODES.E_PAY_SIGNATURE);
    }

    const expected = this.sign(rawBody);
    const providedBuf = Buffer.from(String(provided));
    const expectedBuf = Buffer.from(expected);
    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      throw new AppError('Invalid webhook signature', 401, ERROR_CODES.E_PAY_SIGNATURE);
    }

    const type = body?.event === 'payment.captured' || body?.event === 'payment.failed' ? body.event : 'ignored';
    return {
      type,
      orderId: body?.orderId,
      providerPaymentId: body?.paymentId || null,
      eventId: body?.eventId || null,
    };
  }
}

module.exports = { MockProvider, SIGNATURE_HEADER };
