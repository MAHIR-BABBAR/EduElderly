const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { Certificate } = require('../models/Certificate');
const { generateCertificatePdf } = require('../utils/pdfGenerator');
const { NullStorage } = require('../storage/NullStorage');

const storage = new NullStorage();

const getAppUrl = () => process.env.APP_URL || 'http://localhost:8080';

const buildVerifyUrl = (certId) => `${getAppUrl()}/api/v1/certificates/${certId}/verify`;

const issueCertificate = async ({ userId, courseId, userName, courseTitle }) => {
  if (!userId || !courseId || !userName || !courseTitle) {
    throw new AppError(
      'userId, courseId, userName, and courseTitle are required',
      400,
      ERROR_CODES.E_VALIDATION,
    );
  }

  const existing = await Certificate.findOne({ userId, courseId });
  if (existing) {
    return existing;
  }

  const certificate = new Certificate({
    userId,
    courseId,
    userName,
    courseTitle,
    verifyUrl: 'pending',
  });

  certificate.verifyUrl = buildVerifyUrl(certificate.certId);
  await certificate.save();

  return certificate;
};

const listForUser = async (userId) =>
  Certificate.find({ userId }).sort({ issuedAt: -1 });

const verifyCertificate = async (certId) => {
  const certificate = await Certificate.findOne({ certId });
  return certificate;
};

const getCertificateForUser = async (userId, certId) => {
  const certificate = await Certificate.findOne({ certId, userId });
  if (!certificate) {
    throw new AppError('Certificate not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return certificate;
};

const downloadCertificatePdf = async (userId, certId) => {
  const certificate = await getCertificateForUser(userId, certId);

  const cached = await storage.get(certId);
  if (cached) {
    return { buffer: cached, certificate };
  }

  const buffer = await generateCertificatePdf({
    userName: certificate.userName,
    courseTitle: certificate.courseTitle,
    certId: certificate.certId,
    issuedAt: certificate.issuedAt,
  });

  await storage.save(certId, buffer);

  return { buffer, certificate };
};

const getCertificateStats = async () => ({
  totalCertificates: await Certificate.countDocuments(),
});

module.exports = {
  issueCertificate,
  listForUser,
  verifyCertificate,
  downloadCertificatePdf,
  getCertificateStats,
};
