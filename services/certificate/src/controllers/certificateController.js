const {
  catchAsync,
  toPublicCertificateDTO,
  toCertificateVerifyDTO,
} = require('@eduelderly/shared');
const certificateService = require('../services/certificate.service');

const listMyCertificates = catchAsync(async (req, res) => {
  const certificates = await certificateService.listForUser(req.user.userId);

  res.status(200).json({
    success: true,
    data: certificates.map(toPublicCertificateDTO),
  });
});

const verifyCertificate = catchAsync(async (req, res) => {
  const certificate = await certificateService.verifyCertificate(req.params.certId);

  res.status(200).json({
    success: true,
    data: toCertificateVerifyDTO(certificate),
  });
});

const downloadCertificate = catchAsync(async (req, res) => {
  const { buffer, certificate } = await certificateService.downloadCertificatePdf(
    req.user.userId,
    req.params.certId,
  );

  const filename = `certificate-${certificate.certId}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});

module.exports = { listMyCertificates, verifyCertificate, downloadCertificate };
