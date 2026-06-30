const { catchAsync } = require('@eduelderly/shared');
const certificateService = require('../services/certificate.service');

const issueInternal = catchAsync(async (req, res) => {
  const certificate = await certificateService.issueCertificate(req.body);

  res.status(200).json({
    success: true,
    data: {
      certId: certificate.certId,
      verifyUrl: certificate.verifyUrl,
      issuedAt: certificate.issuedAt,
    },
  });
});

const getInternalStats = catchAsync(async (_req, res) => {
  const stats = await certificateService.getCertificateStats();
  res.status(200).json({ success: true, data: stats });
});

module.exports = { issueInternal, getInternalStats };
