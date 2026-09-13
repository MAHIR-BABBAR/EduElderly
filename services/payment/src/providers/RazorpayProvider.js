const crypto = require('crypto');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { PaymentProvider } = require('./PaymentProvider');

const RAZORPAY_API = 'https://api.razorpay.com/v1';
const SIGNATURE_HEADER = 'x-razorpay-signature';

/**
 * Razorpay Orders API + webhooks.
 *
 * Flow: we create a Razorpay order whose `receipt` and `notes.orderId` carry
 * our orderId; the client opens Razorpay Checkout with the returned
 * providerOrderId; Razorpay posts `payment.captured` / `payment.failed`
 * webhooks signed with HMAC-SHA256 over the raw body. Amounts are sent in the
 * smallest currency unit (paise for INR).
 */
class RazorpayProvider extends PaymentProvider {
  constructor({ keyId, keySecret, webhookSecret, appUrl } = {}) {
    super();
    this.keyId = keyId || process.env.RAZORPAY_KEY_ID;
    this.keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET;
    this.webhookSecret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
    this.appUrl = appUrl || process.env.APP_URL || 'http://localhost:5173';

    const missing = ['keyId', 'keySecret', 'webhookSecret'].filter((k) => !this[k]);
    if (missing.length) {
      throw new Error(
        `Razorpay provider needs RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET (missing: ${missing.join(', ')})`,
      );
    }
  }

  get name() {
    return 'razorpay';
  }

  async createOrder({ orderId, amount, currency, userId, courseId }) {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${RAZORPAY_API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency,
          receipt: orderId,
          notes: { orderId, userId, courseId },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new AppError(`Razorpay order creation failed (${response.status}): ${text}`, 502, ERROR_CODES.E_PAY_FAILED);
      }

      const order = await response.json();
      return {
        providerOrderId: order.id,
        // The client page opens Razorpay Checkout with the key id and provider order id.
        checkoutUrl: `${this.appUrl}/checkout/${orderId}?provider=razorpay&providerOrderId=${encodeURIComponent(order.id)}`,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Razorpay unreachable: ${error.message}`, 502, ERROR_CODES.E_PAY_FAILED);
    } finally {
      clearTimeout(timeout);
    }
  }

  verifyWebhook({ rawBody, headers, body }) {
    const provided = headers[SIGNATURE_HEADER];
    if (!provided || typeof rawBody !== 'string') {
      throw new AppError('Missing webhook signature', 401, ERROR_CODES.E_PAY_SIGNATURE);
    }

    const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const providedBuf = Buffer.from(String(provided));
    const expectedBuf = Buffer.from(expected);
    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      throw new AppError('Invalid webhook signature', 401, ERROR_CODES.E_PAY_SIGNATURE);
    }

    const payment = body?.payload?.payment?.entity || {};
    const type = body?.event === 'payment.captured' || body?.event === 'payment.failed' ? body.event : 'ignored';

    return {
      type,
      orderId: payment.notes?.orderId,
      providerOrderId: payment.order_id,
      providerPaymentId: payment.id,
      eventId: headers['x-razorpay-event-id'] || null,
    };
  }
}

module.exports = { RazorpayProvider, SIGNATURE_HEADER };
