const { catchAsync } = require('@eduelderly/shared');
const certificateService = require('../services/certificate.service');
const { getPdfQueueStats } = require('../queue/pdfQueue');

const issueInternal = catchAsync(async (req, res) => {
  const certificate = await certificateService.issueCertificate(req.body);

  res.status(200).json({
    success: true,
    data: {
      certId: certificate.certId,
      verifyUrl: certificate.verifyUrl,
      issuedAt: certificate.issuedAt,
      pdfStatus: certificate.pdfStatus,
    },
  });
});

const getInternalStats = catchAsync(async (_req, res) => {
  const stats = await certificateService.getCertificateStats();
  res.status(200).json({ success: true, data: stats });
});

const getQueueStats = catchAsync(async (_req, res) => {
  res.status(200).json({ success: true, data: await getPdfQueueStats() });
});

module.exports = { issueInternal, getInternalStats, getQueueStats };
