const mongoose =require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,       
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
  userAgent: {
    type: String,
    default: null,       
  },
  ip: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// TTL index — auto-deletes expired refresh tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', RefreshTokenSchema);
module.exports = { RefreshToken };