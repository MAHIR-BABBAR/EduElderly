const crypto = require('crypto');
const { RazorpayProvider } = require('../src/providers/RazorpayProvider');
const { MockProvider } = require('../src/providers/MockProvider');
const { getProvider, resetProviderCache } = require('../src/providers');

const razorpayConfig = {
  keyId: 'rzp_test_key',
  keySecret: 'rzp_test_secret',
  webhookSecret: 'whsec_test',
  appUrl: 'http://localhost:5173',
};

describe('Payment providers', () => {
  afterEach(() => {
    delete process.env.PAYMENT_PROVIDER;
    resetProviderCache();
    jest.restoreAllMocks();
  });

  describe('factory', () => {
    it('defaults to mock outside production', () => {
      expect(getProvider()).toBeInstanceOf(MockProvider);
    });

    it('returns null for none', () => {
      process.env.PAYMENT_PROVIDER = 'none';
      expect(getProvider()).toBeNull();
    });

    it('fails fast on an unknown provider', () => {
      process.env.PAYMENT_PROVIDER = 'stripe';
      expect(() => getProvider()).toThrow(/Unknown PAYMENT_PROVIDER/);
    });

    it('fails fast when razorpay keys are missing', () => {
      process.env.PAYMENT_PROVIDER = 'razorpay';
      expect(() => getProvider()).toThrow(/RAZORPAY_KEY_ID/);
    });
  });

  describe('RazorpayProvider', () => {
    it('creates an order in the smallest currency unit and echoes our orderId in notes', async () => {
      const provider = new RazorpayProvider(razorpayConfig);
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'order_ABC' }),
      });

      const result = await provider.createOrder({
        orderId: 'our-order-1',
        amount: 499.5,
        currency: 'INR',
        userId: 'u1',
        courseId: 'c1',
      });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.razorpay.com/v1/orders');
      expect(init.headers.Authorization).toMatch(/^Basic /);
      expect(JSON.parse(init.body)).toEqual({
        amount: 49950,
        currency: 'INR',
        receipt: 'our-order-1',
        notes: { orderId: 'our-order-1', userId: 'u1', courseId: 'c1' },
      });
      expect(result.providerOrderId).toBe('order_ABC');
      expect(result.checkoutUrl).toContain('/checkout/our-order-1');
    });

    it('verifies webhook signatures over the raw body and normalises the event', () => {
      const provider = new RazorpayProvider(razorpayConfig);
      const body = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_1', order_id: 'order_ABC', notes: { orderId: 'our-order-1' } } } },
      };
      const rawBody = JSON.stringify(body);
      const signature = crypto.createHmac('sha256', 'whsec_test').update(rawBody).digest('hex');

      const event = provider.verifyWebhook({
        rawBody,
        body,
        headers: { 'x-razorpay-signature': signature, 'x-razorpay-event-id': 'evt_9' },
      });

      expect(event).toEqual({
        type: 'payment.captured',
        orderId: 'our-order-1',
        providerOrderId: 'order_ABC',
        providerPaymentId: 'pay_1',
        eventId: 'evt_9',
      });
    });

    it('rejects a tampered body', () => {
      const provider = new RazorpayProvider(razorpayConfig);
      const rawBody = JSON.stringify({ event: 'payment.captured' });
      const signature = crypto.createHmac('sha256', 'whsec_test').update(rawBody).digest('hex');

      expect(() =>
        provider.verifyWebhook({
          rawBody: rawBody.replace('captured', 'failed'),
          body: { event: 'payment.failed' },
          headers: { 'x-razorpay-signature': signature },
        }),
      ).toThrow(/Invalid webhook signature/);
    });
  });
});
