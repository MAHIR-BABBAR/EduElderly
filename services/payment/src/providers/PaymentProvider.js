/**
 * Contract every payment provider implements.
 *
 * The transaction service owns the order state machine and the
 * enroll-before-mark-paid rule; providers only know how to (1) create an order
 * with the external system and (2) verify and normalise incoming webhooks.
 *
 * Normalised webhook event shape:
 *   { type: 'payment.captured' | 'payment.failed' | 'ignored',
 *     orderId?: string,           // our orderId when the provider echoes it back
 *     providerOrderId?: string,   // the provider's order reference
 *     providerPaymentId?: string,
 *     eventId?: string }          // provider event id, used for idempotency
 */
class PaymentProvider {
  /** Short provider name recorded on each transaction (`mock`, `razorpay`). */
  get name() {
    throw new Error('PaymentProvider.name must be implemented');
  }

  /** Whether a learner may confirm their own order (only true for the mock). */
  get supportsLearnerConfirm() {
    return false;
  }

  /**
   * @param {{ orderId: string, amount: number, currency: string, userId: string, courseId: string }} _order
   * @returns {Promise<{ checkoutUrl: string, providerOrderId: string|null }>}
   */
  async createOrder(_order) {
    throw new Error('PaymentProvider.createOrder() must be implemented');
  }

  /**
   * Verify the webhook signature against the raw request body and return a
   * normalised event. Throw an AppError(401, E_PAY_SIGNATURE) when invalid.
   *
   * @param {{ rawBody: string, headers: Record<string, string|undefined>, body: any }} _request
   * @returns {{ type: string, orderId?: string, providerOrderId?: string, providerPaymentId?: string, eventId?: string }}
   */
  verifyWebhook(_request) {
    throw new Error('PaymentProvider.verifyWebhook() must be implemented');
  }
}

module.exports = { PaymentProvider };
