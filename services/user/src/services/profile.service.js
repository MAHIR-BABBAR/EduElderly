const { UserProfile } = require('../models/UserProfile');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');

const ALLOWED_UPDATE_FIELDS = ['avatarUrl', 'fontSizePref', 'highContrast', 'lang', 'bio'];

const getProfileByUserId = async (userId) => {
  const profile = await UserProfile.findOne({ userId });
  if (!profile) {
    throw new AppError('User not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return profile;
};

const updateProfile = async (userId, body) => {
  const updates = {};
  ALLOWED_UPDATE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new AppError('No updates provided', 400, ERROR_CODES.E_VALIDATION);
  }

  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!profile) {
    throw new AppError('User not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return profile;
};

const createProfile = async ({ userId, name, email, role, isActive = true }) => {
  if (!userId) {
    throw new AppError('userId is required', 400, ERROR_CODES.E_VALIDATION);
  }

  const existing = await UserProfile.findOne({ userId });
  if (existing) {
    return { profile: existing, created: false };
  }

  const profile = await UserProfile.create({ userId, name, email, role, isActive });
  return { profile, created: true };
};

const listProfiles = async ({ page = 1, limit = 20, q }) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const filter = q ? { $text: { $search: q } } : {};

  const [users, total] = await Promise.all([
    UserProfile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    UserProfile.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

const syncProfile = async ({ userId, name, email, role, isActive }) => {
  if (!userId) {
    throw new AppError('userId is required', 400, ERROR_CODES.E_VALIDATION);
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;

  if (Object.keys(updates).length === 0) {
    throw new AppError('No sync fields provided', 400, ERROR_CODES.E_VALIDATION);
  }

  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!profile) {
    throw new AppError('User not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return profile;
};

const incrementXP = async (userId, amount) => {
  const profile = await UserProfile.findOne({ userId });
  if (!profile) {
    throw new AppError('User not found', 404, ERROR_CODES.E_NOT_FOUND);
  }

  if (profile.totalXP + amount < 0) {
    throw new AppError('XP cannot be negative', 400, ERROR_CODES.E_VALIDATION);
  }

  profile.totalXP += amount;
  await profile.save();
  return profile;
};

module.exports = {
  getProfileByUserId,
  updateProfile,
  createProfile,
  listProfiles,
  syncProfile,
  incrementXP,
};
