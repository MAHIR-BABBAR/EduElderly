/**
 * @param {Object} certDoc - Mongoose Certificate document or plain object
 * @returns {Object} Safe public certificate metadata (no PDF bytes)
 */
const toPublicCertificateDTO = (certDoc) => {
  const c = certDoc.toObject ? certDoc.toObject() : { ...certDoc };
  return {
    certId: c.certId,
    userId: c.userId,
    courseId: c.courseId,
    courseTitle: c.courseTitle,
    userName: c.userName,
    issuedAt: c.issuedAt,
    verifyUrl: c.verifyUrl,
  };
};

/**
 * @param {Object|null} certDoc
 * @returns {Object} Public verify response shape
 */
const toCertificateVerifyDTO = (certDoc) => {
  if (!certDoc) {
    return { valid: false };
  }
  const c = certDoc.toObject ? certDoc.toObject() : { ...certDoc };
  return {
    valid: true,
    certId: c.certId,
    courseTitle: c.courseTitle,
    userName: c.userName,
    issuedAt: c.issuedAt,
  };
};

module.exports = { toPublicCertificateDTO, toCertificateVerifyDTO };
