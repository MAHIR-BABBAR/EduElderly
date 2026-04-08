/**
 * @param {Object} userDoc - Mongoose User document or plain object
 * @returns {Object} Safe user shape — no passHash, no internal fields
 */
const toPublicUserDTO = (userDoc) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  return {
    userId:       user.userId || user._id.toString(),
    name:         user.name,
    email:        user.email,
    role:         user.role,
    isVerified:   user.isVerified,
    avatarUrl:    user.avatarUrl || null,
    totalXP:      user.totalXP || 0,
    createdAt:    user.createdAt,
    // passHash, __v, _id (raw ObjectId) are intentionally omitted
  };
};

/**
 * @param {Object} userDoc - Full user document
 * @returns {Object} Shape with accessibility prefs for frontend ThemeContext
 */
const toAccessibilityDTO = (userDoc) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  return {
    userId:        user.userId || user._id.toString(),
    fontSizePref:  user.fontSizePref || 'default',
    highContrast:  user.highContrast || false,
    lang:          user.lang || 'en',
  };
};

module.exports = { toPublicUserDTO, toAccessibilityDTO };