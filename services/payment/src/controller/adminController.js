const { catchAsync, toAdminTransactionDTO } = require('@eduelderly/shared');
const transactionService = require('../services/transaction.service');

const listOrders = catchAsync(async (req, res) => {
  const { orders, pagination } = await transactionService.listOrdersAdmin(req.query);
  res.status(200).json({
    success: true,
    data: {
      orders: orders.map(toAdminTransactionDTO),
      pagination,
    },
  });
});

const getOrder = catchAsync(async (req, res) => {
  const tx = await transactionService.getOrderById(req.params.orderId);
  res.status(200).json({
    success: true,
    data: toAdminTransactionDTO(tx),
  });
});

const updateOrderStatus = catchAsync(async (req, res) => {
  const tx = await transactionService.updateOrderStatus({
    orderId: req.params.orderId,
    status: req.body.status,
    adminUserId: req.user.userId,
  });
  res.status(200).json({
    success: true,
    data: toAdminTransactionDTO(tx),
  });
});

module.exports = {
  listOrders,
  getOrder,
  updateOrderStatus,
};
