/**
 * @param {Object} profileDoc - Mongoose UserProfile document or plain object
 * @returns {Object} Safe public profile shape
 */
const toPublicProfileDTO = (profileDoc) => {
  const profile = profileDoc.toObject ? profileDoc.toObject() : { ...profileDoc };
  return {
    userId: profile.userId,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    isActive: profile.isActive ?? true,
    avatarUrl: profile.avatarUrl ?? null,
    fontSizePref: profile.fontSizePref,
    highContrast: profile.highContrast,
    lang: profile.lang,
    totalXP: profile.totalXP ?? 0,
    bio: profile.bio ?? '',
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

module.exports = { toPublicProfileDTO };
