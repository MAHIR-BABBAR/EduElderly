const { v7: uuidv7 } = require('uuid');
const mongoose = require('mongoose');
const { AUDIT_ACTION_VALUES } = require('@eduelderly/shared/constants/auditActions');

const AuditLogSchema = new mongoose.Schema({
  auditId: {
    type: String,
    default: uuidv7,
    unique: true,
    index: true,
  },
  actorId: {
    type: String,
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: AUDIT_ACTION_VALUES,
    required: true,
  },
  targetType: {
    type: String,
    required: true,
  },
  targetId: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ip: {
    type: String,
    default: null,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.__v;
      delete ret._id;
      return ret;
    },
  },
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
module.exports = { AuditLog };
