const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { AUDIT_ACTION_VALUES } = require('@eduelderly/shared/constants/auditActions');
const { AuditLog } = require('../models/AuditLog');

const createAuditLog = async ({
  actorId,
  action,
  targetType,
  targetId,
  metadata = {},
  ip = null,
}) => {
  if (!actorId || !action || !targetType || !targetId) {
    throw new AppError(
      'actorId, action, targetType, and targetId are required',
      400,
      ERROR_CODES.E_VALIDATION,
    );
  }

  if (!AUDIT_ACTION_VALUES.includes(action)) {
    throw new AppError('Invalid audit action', 400, ERROR_CODES.E_VALIDATION);
  }

  return AuditLog.create({
    actorId,
    action,
    targetType,
    targetId,
    metadata,
    ip,
  });
};

const listAuditLogs = async ({ page = 1, limit = 20, actorId, action } = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const filter = {};
  if (actorId) filter.actorId = actorId;
  if (action) filter.action = action;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

module.exports = { createAuditLog, listAuditLogs };
