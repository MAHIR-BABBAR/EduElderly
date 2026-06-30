const { v7: uuidv7 } = require('uuid');
const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  certId: {
    type: String,
    default: uuidv7,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  courseId: {
    type: String,
    required: true,
    index: true,
  },
  courseTitle: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  issuedAt: {
    type: Date,
    default: Date.now,
  },
  verifyUrl: {
    type: String,
    required: true,
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

CertificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const Certificate = mongoose.model('Certificate', CertificateSchema);
module.exports = { Certificate };
