/**
 * @param {Object} txDoc - Mongoose Transaction document or plain object
 * @returns {Object} Safe transaction shape for learners
 */
const toPublicTransactionDTO = (txDoc) => {
  const tx = txDoc.toObject ? txDoc.toObject() : { ...txDoc };
  return {
    orderId: tx.orderId,
    userId: tx.userId,
    courseId: tx.courseId,
    amount: tx.amount,
    currency: tx.currency,
    status: tx.status,
    type: tx.type,
    confirmedAt: tx.confirmedAt ?? null,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
};

/**
 * @param {Object} txDoc
 * @returns {Object} Admin view with audit fields
 */
const toAdminTransactionDTO = (txDoc) => {
  const base = toPublicTransactionDTO(txDoc);
  const tx = txDoc.toObject ? txDoc.toObject() : { ...txDoc };
  return {
    ...base,
    statusUpdatedBy: tx.statusUpdatedBy ?? null,
    statusUpdatedAt: tx.statusUpdatedAt ?? null,
  };
};

module.exports = {
  toPublicTransactionDTO,
  toAdminTransactionDTO,
};
