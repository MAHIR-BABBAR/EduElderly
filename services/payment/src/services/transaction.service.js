const { v7: uuidv7 } = require('uuid');
const { Transaction } = require('../models/Transaction');
const { AppError, ERROR_CODES, createLogger } = require('@eduelderly/shared');
const { TX_STATUS } = require('@eduelderly/shared/constants/transactionTypes');
const enrollmentClient = require('../clients/enrollmentClient');
const adminClient = require('../clients/adminClient');
const courseClient = require('../clients/courseClient');
const { AUDIT_ACTION } = require('@eduelderly/shared/constants/auditActions');
const { getProvider, requireProvider } = require('../providers');

const log = createLogger('payment-service');

const MOCK_PROVIDER_ACTOR = 'mock-provider';

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
  const provider = requireProvider();
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

  let tx;
  try {
    tx = await Transaction.create({
      orderId: uuidv7(),
      userId,
      courseId,
      amount,
      currency: currency.toUpperCase(),
      status: TX_STATUS.PENDING,
      provider: provider.name,
    });
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

  // Register the order with the provider. If that fails the local order is
  // marked failed so the learner can retry (a pending order would block them).
  try {
    const { checkoutUrl, providerOrderId } = await provider.createOrder({
      orderId: tx.orderId,
      amount,
      currency: tx.currency,
      userId,
      courseId,
    });
    tx.checkoutUrl = checkoutUrl;
    tx.providerOrderId = providerOrderId ?? null;
    await tx.save();
  } catch (error) {
    tx.status = TX_STATUS.FAILED;
    tx.statusUpdatedBy = `provider:${provider.name}`;
    tx.statusUpdatedAt = new Date();
    tx.metadata = { ...(tx.metadata || {}), providerError: error.message };
    await tx.save();
    log.error('Provider order creation failed', { orderId: tx.orderId, provider: provider.name, message: error.message });
    throw error;
  }

  return { orderId: tx.orderId, checkoutUrl: tx.checkoutUrl };
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

const confirmOrderForLearner = async (orderId, userId) => {
  const provider = getProvider();
  if (!provider || !provider.supportsLearnerConfirm) {
    throw new AppError('Route Not Found', 404, ERROR_CODES.E_ROUTE_NOT_FOUND);
  }
  const tx = await getOrderForUser(orderId, userId);
  if (tx.status !== TX_STATUS.PENDING) {
    throw new AppError('Order is not pending confirmation', 400, ERROR_CODES.E_VALIDATION);
  }
  return updateOrderStatus({ orderId, status: TX_STATUS.SUCCESS, adminUserId: MOCK_PROVIDER_ACTOR });
};

/**
 * Provider webhook entry point. Verifies the signature through the active
 * provider, then applies the event to the order state machine.
 *
 * Idempotency: a capture for an order that is already `success` is
 * acknowledged as a duplicate without touching enrollment; the same event id
 * seen twice is likewise a no-op. Enrollment still happens before the order is
 * marked paid, so a failed enrollment leaves the order pending and the
 * provider's retry will pick it up.
 */
const handleProviderWebhook = async ({ rawBody, headers, body }) => {
  const provider = requireProvider();
  const event = provider.verifyWebhook({ rawBody, headers, body });

  if (event.type === 'ignored') {
    return { ignored: true, type: body?.event ?? null };
  }

  const tx = event.orderId
    ? await Transaction.findOne({ orderId: event.orderId })
    : await Transaction.findOne({ providerOrderId: event.providerOrderId });
  if (!tx) {
    throw new AppError('Order not found', 404, ERROR_CODES.E_NOT_FOUND);
  }

  if (event.eventId && tx.lastWebhookEventId === event.eventId) {
    return { orderId: tx.orderId, status: tx.status, duplicate: true };
  }

  const actor = `webhook:${provider.name}`;

  // The event id is recorded only AFTER the transition succeeds. Recording it
  // first would make a provider retry (sent because we answered 5xx when
  // enrollment was down) look like a duplicate, stranding a paid order in
  // `pending` forever.
  const markProcessed = (orderId) =>
    Transaction.updateOne({ orderId }, { $set: { lastWebhookEventId: event.eventId ?? null } });

  if (event.type === 'payment.captured') {
    if (tx.status === TX_STATUS.SUCCESS) {
      return { orderId: tx.orderId, status: tx.status, duplicate: true };
    }
    if (tx.status !== TX_STATUS.PENDING) {
      return { orderId: tx.orderId, status: tx.status, ignored: true, reason: `order is ${tx.status}` };
    }
    if (event.providerPaymentId) {
      await Transaction.updateOne({ orderId: tx.orderId }, { $set: { providerPaymentId: event.providerPaymentId } });
    }
    // Throws when enrollment is unavailable; the order stays pending and the
    // event id stays unrecorded, so the provider's retry is processed normally.
    const updated = await updateOrderStatus({ orderId: tx.orderId, status: TX_STATUS.SUCCESS, adminUserId: actor });
    await markProcessed(tx.orderId);
    return { orderId: updated.orderId, status: updated.status, duplicate: false };
  }

  // payment.failed
  if (tx.status !== TX_STATUS.PENDING) {
    return { orderId: tx.orderId, status: tx.status, ignored: true, reason: `order is ${tx.status}` };
  }
  const updated = await updateOrderStatus({ orderId: tx.orderId, status: TX_STATUS.FAILED, adminUserId: actor });
  await markProcessed(tx.orderId);
  return { orderId: updated.orderId, status: updated.status, duplicate: false };
};

module.exports = {
  createCheckout,
  getOrderForUser,
  getOrderById,
  listMyTransactions,
  listOrdersAdmin,
  getPaymentStatus,
  updateOrderStatus,
  confirmOrderForLearner,
  handleProviderWebhook,
  getPaymentStats,
};
