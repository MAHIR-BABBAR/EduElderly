/**
 * @param {Object} auditDoc - Mongoose AuditLog document or plain object
 * @returns {Object} Safe public audit log shape
 */
const toPublicAuditLogDTO = (auditDoc) => {
  const a = auditDoc.toObject ? auditDoc.toObject() : { ...auditDoc };
  return {
    auditId: a.auditId,
    actorId: a.actorId,
    action: a.action,
    targetType: a.targetType,
    targetId: a.targetId,
    metadata: a.metadata || {},
    ip: a.ip ?? null,
    createdAt: a.createdAt,
  };
};

module.exports = { toPublicAuditLogDTO };
