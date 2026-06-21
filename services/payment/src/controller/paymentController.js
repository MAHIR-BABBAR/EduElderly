const { catchAsync, toPublicTransactionDTO } = require('@eduelderly/shared');
const transactionService = require('../services/transaction.service');

const listMyTransactions = catchAsync(async (req, res) => {
  const transactions = await transactionService.listMyTransactions(req.user.userId);
  res.status(200).json({
    success: true,
    data: {
      transactions: transactions.map(toPublicTransactionDTO),
    },
  });
});

const getMyOrder = catchAsync(async (req, res) => {
  const tx = await transactionService.getOrderForUser(req.params.orderId, req.user.userId);
  res.status(200).json({
    success: true,
    data: toPublicTransactionDTO(tx),
  });
});

module.exports = {
  listMyTransactions,
  getMyOrder,
};
