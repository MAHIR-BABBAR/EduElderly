const { v7: uuidv7 } = require('uuid');
const mongoose = require('mongoose');
const {
  NOTIFICATION_TYPE_VALUES,
  NOTIFICATION_CHANNEL_VALUES,
  NOTIFICATION_STATUS_VALUES,
} = require('@eduelderly/shared/constants/notificationTypes');

const NotificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    default: uuidv7,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    default: null,
    index: true,
  },
  type: {
    type: String,
    enum: NOTIFICATION_TYPE_VALUES,
    required: true,
  },
  channel: {
    type: String,
    enum: NOTIFICATION_CHANNEL_VALUES,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    enum: NOTIFICATION_STATUS_VALUES,
    default: 'pending',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  sentAt: {
    type: Date,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.__v;
      delete ret._id;
      return ret;
    },
  },
});

NotificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);
module.exports = { Notification };
