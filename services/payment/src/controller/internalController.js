const { catchAsync } = require('@eduelderly/shared');
const transactionService = require('../services/transaction.service');

const checkout = catchAsync(async (req, res) => {
  const result = await transactionService.createCheckout(req.body);
  res.status(200).json({
    success: true,
    data: result,
  });
});

const getStatus = catchAsync(async (req, res) => {
  const result = await transactionService.getPaymentStatus(
    req.query.userId,
    req.query.courseId,
  );
  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  checkout,
  getStatus,
};
