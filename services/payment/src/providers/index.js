const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { MockProvider } = require('./MockProvider');
const { RazorpayProvider } = require('./RazorpayProvider');

/**
 * Provider selection by PAYMENT_PROVIDER:
 *   mock      — default outside production; signed fake webhooks, learner self-confirm
 *   razorpay  — real Orders API + webhooks (needs RAZORPAY_* env)
 *   none      — default in production when unset; checkout is refused loudly
 *
 * Resolved lazily and cached so tests can switch providers via env.
 */
let cached = { key: null, provider: null };

const resolveProviderName = () => {
  if (process.env.PAYMENT_PROVIDER) return process.env.PAYMENT_PROVIDER.toLowerCase();
  return process.env.NODE_ENV === 'production' ? 'none' : 'mock';
};

const getProvider = () => {
  const name = resolveProviderName();
  if (cached.key === name && cached.provider) return cached.provider;

  let provider;
  switch (name) {
    case 'mock':
      // The mock provider lets a learner confirm their own order. It must never
      // run in production by accident (SEC-9).
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_PAYMENTS !== 'true') {
        throw new Error('PAYMENT_PROVIDER=mock is not allowed in production (set ALLOW_MOCK_PAYMENTS=true to override)');
      }
      provider = new MockProvider();
      break;
    case 'razorpay':
      provider = new RazorpayProvider();
      break;
    case 'none':
      provider = null;
      break;
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER '${name}' (expected mock, razorpay, or none)`);
  }

  cached = { key: name, provider };
  return provider;
};

/** Like getProvider() but turns "no provider" into a 503 the API can return. */
const requireProvider = () => {
  const provider = getProvider();
  if (!provider) {
    throw new AppError('Payment provider is not configured', 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);
  }
  return provider;
};

const resetProviderCache = () => {
  cached = { key: null, provider: null };
};

module.exports = { getProvider, requireProvider, resetProviderCache, resolveProviderName };
