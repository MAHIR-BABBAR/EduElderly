const { catchAsync } = require('@eduelderly/shared');
const transactionService = require('../services/transaction.service');

/**
 * Public, signature-verified provider webhook. Always answers 200 for
 * well-signed events (including duplicates and events we ignore) so the
 * provider stops retrying; only bad signatures and unknown orders are errors.
 */
const handleWebhook = catchAsync(async (req, res) => {
  const result = await transactionService.handleProviderWebhook({
    rawBody: req.rawBody,
    headers: req.headers,
    body: req.body,
  });
  res.status(200).json({ success: true, data: result });
});

module.exports = { handleWebhook };
