const { AppError, ERROR_CODES, isQueueEnabled, createLogger } = require('@eduelderly/shared');
const { Certificate } = require('../models/Certificate');
const { generateCertificatePdf } = require('../utils/pdfGenerator');
const { getStorage } = require('../storage');
const { renderAndStoreCertificate } = require('./pdf.service');
const { enqueuePdfRender } = require('../queue/pdfQueue');

const log = createLogger('certificate-service');

const getAppUrl = () => process.env.APP_URL || 'http://localhost:5173';

const buildVerifyUrl = (certId) =>
  `${getAppUrl()}/verify-certificate?certId=${encodeURIComponent(certId)}`;

/**
 * Issue (or return the existing) certificate for a learner and course, then
 * pre-render the PDF: through the queue when Redis is available, inline
 * otherwise. Issuance never fails because rendering failed — the download path
 * regenerates on demand.
 */
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

  if (isQueueEnabled()) {
    await enqueuePdfRender(certificate.certId);
    return certificate;
  }

  try {
    await renderAndStoreCertificate(certificate.certId);
  } catch (error) {
    log.warn('Inline PDF render failed; will regenerate on download', {
      certId: certificate.certId,
      message: error.message,
    });
  }
  return Certificate.findOne({ certId: certificate.certId });
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

/**
 * Serve the stored PDF when it exists; otherwise render now, store it, and
 * mark the certificate ready so the next download is instant.
 */
const downloadCertificatePdf = async (userId, certId) => {
  const certificate = await getCertificateForUser(userId, certId);
  const storage = getStorage();

  const stored = await storage.get(certId);
  if (stored) {
    return { buffer: stored, certificate };
  }

  const buffer = await generateCertificatePdf({
    userName: certificate.userName,
    courseTitle: certificate.courseTitle,
    certId: certificate.certId,
    issuedAt: certificate.issuedAt,
  });

  try {
    await storage.save(certId, buffer);
    certificate.pdfStatus = 'ready';
    certificate.pdfError = null;
    certificate.pdfGeneratedAt = new Date();
    await certificate.save();
  } catch (error) {
    log.warn('Could not persist on-demand PDF', { certId, message: error.message });
  }

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
