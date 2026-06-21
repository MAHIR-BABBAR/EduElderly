const { v7: uuidv7 } = require('uuid');
const { Transaction } = require('../models/Transaction');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { TX_STATUS } = require('@eduelderly/shared/constants/transactionTypes');
const enrollmentClient = require('../clients/enrollmentClient');

const getCheckoutBaseUrl = () =>
  process.env.MOCK_CHECKOUT_BASE_URL || 'http://localhost:5173/#order-pending';

const ALLOWED_TRANSITIONS = {
  [TX_STATUS.PENDING]: [TX_STATUS.SUCCESS, TX_STATUS.FAILED],
  [TX_STATUS.SUCCESS]: [TX_STATUS.REFUNDED],
};

const assertValidTransition = (currentStatus, nextStatus) => {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      `Cannot transition from ${currentStatus} to ${nextStatus}`,
      400,
      ERROR_CODES.E_VALIDATION,
    );
  }
};

const createCheckout = async ({ userId, courseId, amount, currency = 'USD' }) => {
  const existingPending = await Transaction.findOne({
    userId,
    courseId,
    status: TX_STATUS.PENDING,
  });

  if (existingPending) {
    throw new AppError(
      'A pending payment already exists for this course',
      409,
      ERROR_CODES.E_PAY_FAILED,
    );
  }

  const orderId = uuidv7();
  await Transaction.create({
    orderId,
    userId,
    courseId,
    amount,
    currency: currency.toUpperCase(),
    status: TX_STATUS.PENDING,
  });

  const checkoutUrl = `${getCheckoutBaseUrl()}/${orderId}`;

  return { orderId, checkoutUrl };
};

const getOrderForUser = async (orderId, userId) => {
  const tx = await Transaction.findOne({ orderId });
  if (!tx) {
    throw new AppError('Order not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  if (tx.userId !== userId) {
    throw new AppError('Access denied', 403, ERROR_CODES.E_FORBIDDEN);
  }
  return tx;
};

const getOrderById = async (orderId) => {
  const tx = await Transaction.findOne({ orderId });
  if (!tx) {
    throw new AppError('Order not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return tx;
};

const listMyTransactions = async (userId) =>
  Transaction.find({ userId }).sort({ createdAt: -1 });

const listOrdersAdmin = async ({ status } = {}) => {
  const filter = {};
  if (status) {
    filter.status = status;
  }
  return Transaction.find(filter).sort({ createdAt: -1 });
};

const getPaymentStatus = async (userId, courseId) => {
  const successTx = await Transaction.findOne({
    userId,
    courseId,
    status: TX_STATUS.SUCCESS,
  }).sort({ confirmedAt: -1 });

  if (successTx) {
    return { paid: true, orderId: successTx.orderId };
  }

  const pendingTx = await Transaction.findOne({
    userId,
    courseId,
    status: TX_STATUS.PENDING,
  }).sort({ createdAt: -1 });

  return {
    paid: false,
    orderId: pendingTx?.orderId ?? null,
  };
};

const updateOrderStatus = async ({ orderId, status, adminUserId }) => {
  const tx = await getOrderById(orderId);

  if (tx.status === status) {
    return tx;
  }

  assertValidTransition(tx.status, status);

  tx.status = status;
  tx.statusUpdatedBy = adminUserId;
  tx.statusUpdatedAt = new Date();

  if (status === TX_STATUS.SUCCESS) {
    tx.confirmedAt = new Date();
    await tx.save();
    await enrollmentClient.enrollAfterPayment({
      userId: tx.userId,
      courseId: tx.courseId,
      paymentRef: tx.orderId,
    });
  } else {
    await tx.save();
  }

  return tx;
};

module.exports = {
  createCheckout,
  getOrderForUser,
  getOrderById,
  listMyTransactions,
  listOrdersAdmin,
  getPaymentStatus,
  updateOrderStatus,
};
