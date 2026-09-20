const { createLogger } = require('@eduelderly/shared');
const { Certificate } = require('../models/Certificate');
const { generateCertificatePdf } = require('../utils/pdfGenerator');
const { getStorage } = require('../storage');

const log = createLogger('certificate-pdf');

/**
 * Render a certificate PDF and persist it. This is the queue processor; it
 * has no BullMQ dependency so it can also run inline and be unit tested.
 *
 * Idempotent: a certificate whose PDF is already stored is skipped. On failure
 * the error is recorded and rethrown so the queue retries; `pdfStatus` only
 * becomes `failed` on the final attempt. Downloads still work in that case
 * because the download path regenerates on demand.
 *
 * @param {string} certId
 * @param {{ attempt?: number, maxAttempts?: number }} [context]
 */
const renderAndStoreCertificate = async (certId, { attempt = 1, maxAttempts = 1 } = {}) => {
  const certificate = await Certificate.findOne({ certId });
  if (!certificate) {
    log.warn('Certificate not found, skipping render', { certId });
    return { skipped: true, reason: 'not_found' };
  }

  const storage = getStorage();
  if (certificate.pdfStatus === 'ready' && (await storage.exists?.(certId))) {
    return { skipped: true, reason: 'already_ready' };
  }

  try {
    const buffer = await generateCertificatePdf({
      userName: certificate.userName,
      courseTitle: certificate.courseTitle,
      certId: certificate.certId,
      issuedAt: certificate.issuedAt,
    });
    await storage.save(certId, buffer);
  } catch (error) {
    certificate.pdfError = error.message;
    if (attempt >= maxAttempts) certificate.pdfStatus = 'failed';
    await certificate.save();
    throw error;
  }

  certificate.pdfStatus = 'ready';
  certificate.pdfError = null;
  certificate.pdfGeneratedAt = new Date();
  await certificate.save();
  return { rendered: true };
};

module.exports = { renderAndStoreCertificate };
