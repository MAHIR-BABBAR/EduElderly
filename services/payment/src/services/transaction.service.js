const { v7: uuidv7 } = require('uuid');
const { Transaction } = require('../models/Transaction');
const { AppError, ERROR_CODES, createLogger } = require('@eduelderly/shared');
const { TX_STATUS } = require('@eduelderly/shared/constants/transactionTypes');
const enrollmentClient = require('../clients/enrollmentClient');
const adminClient = require('../clients/adminClient');
const courseClient = require('../clients/courseClient');
const { AUDIT_ACTION } = require('@eduelderly/shared/constants/auditActions');

const log = createLogger('payment-service');

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
  const course = await courseClient.getCourse(courseId);

  if (!course.isPublished || course.isDeleted) {
    throw new AppError('Course not found', 404, ERROR_CODES.E_COURSE_NOT_FOUND);
  }

  if (!course.isPaid) {
    throw new AppError('Course does not require payment', 400, ERROR_CODES.E_VALIDATION);
  }

  if (typeof amount !== 'number' || amount !== course.price) {
    throw new AppError('Invalid payment amount', 400, ERROR_CODES.E_VALIDATION);
  }

  let orderId;
  try {
    const orderIdCandidate = uuidv7();
    await Transaction.create({
      orderId: orderIdCandidate,
      userId,
      courseId,
      amount,
      currency: currency.toUpperCase(),
      status: TX_STATUS.PENDING,
    });
    orderId = orderIdCandidate;
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(
        'A pending payment already exists for this course',
        409,
        ERROR_CODES.E_PAY_FAILED,
      );
    }
    throw error;
  }

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

const listOrdersAdmin = async ({ status, page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const filter = {};
  if (status) {
    filter.status = status;
  }

  const [orders, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Transaction.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
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

  const previousStatus = tx.status;
  assertValidTransition(tx.status, status);

  tx.statusUpdatedBy = adminUserId;
  tx.statusUpdatedAt = new Date();

  if (status === TX_STATUS.SUCCESS) {
    await enrollmentClient.enrollAfterPayment({
      userId: tx.userId,
      courseId: tx.courseId,
      paymentRef: tx.orderId,
    });

    tx.status = status;
    tx.confirmedAt = new Date();
    await tx.save();

    log.info('Payment confirmed and enrollment completed', {
      orderId,
      userId: tx.userId,
      courseId: tx.courseId,
      adminUserId,
    });

    adminClient.logAuditSafe({
      actorId: adminUserId,
      action: AUDIT_ACTION.CONFIRM_PAYMENT,
      targetType: 'order',
      targetId: orderId,
      metadata: { previousStatus, courseId: tx.courseId, userId: tx.userId },
    });
  } else {
    tx.status = status;
    await tx.save();
    if (status === TX_STATUS.REFUNDED) {
      adminClient.logAuditSafe({
        actorId: adminUserId,
        action: AUDIT_ACTION.REFUND_PAYMENT,
        targetType: 'order',
        targetId: orderId,
        metadata: { previousStatus, courseId: tx.courseId, userId: tx.userId },
      });
    }
  }

  return tx;
};

const getPaymentStats = async () => {
  const [totalOrders, successfulOrders, pendingOrders, revenueAgg] = await Promise.all([
    Transaction.countDocuments(),
    Transaction.countDocuments({ status: TX_STATUS.SUCCESS }),
    Transaction.countDocuments({ status: TX_STATUS.PENDING }),
    Transaction.aggregate([
      { $match: { status: TX_STATUS.SUCCESS } },
      { $group: { _id: null, total: { $sum: '$amount' }, currency: { $first: '$currency' } } },
    ]),
  ]);

  const revenue = revenueAgg[0] || { total: 0, currency: 'USD' };

  return {
    totalOrders,
    successfulOrders,
    pendingOrders,
    revenueTotal: revenue.total,
    currency: revenue.currency || 'USD',
  };
};

module.exports = {
  createCheckout,
  getOrderForUser,
  getOrderById,
  listMyTransactions,
  listOrdersAdmin,
  getPaymentStatus,
  updateOrderStatus,
  getPaymentStats,
};
