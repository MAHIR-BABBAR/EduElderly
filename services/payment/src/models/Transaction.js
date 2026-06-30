const mongoose = require('mongoose');
const { TX_STATUS, TX_TYPE } = require('@eduelderly/shared/constants/transactionTypes');

const transactionSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true },
    status: {
      type: String,
      enum: Object.values(TX_STATUS),
      default: TX_STATUS.PENDING,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TX_TYPE),
      default: TX_TYPE.PURCHASE,
    },
    statusUpdatedBy: { type: String, default: null },
    statusUpdatedAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, courseId: 1 });
transactionSchema.index(
  { userId: 1, courseId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: TX_STATUS.PENDING },
    name: 'unique_pending_checkout',
  },
);

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = { Transaction };
