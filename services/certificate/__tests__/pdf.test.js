const fs = require('fs');
const path = require('path');
const { Certificate } = require('../src/models/Certificate');
const { getStorage } = require('../src/storage');

jest.mock('../src/utils/pdfGenerator', () => ({
  generateCertificatePdf: jest.fn(),
}));

const { generateCertificatePdf } = require('../src/utils/pdfGenerator');
const { renderAndStoreCertificate } = require('../src/services/pdf.service');

const createCert = () =>
  Certificate.create({
    certId: `cert-${Math.random().toString(36).slice(2)}`,
    userId: 'learner-1',
    courseId: 'course-1',
    userName: 'Jane Learner',
    courseTitle: 'Wellness Basics',
    verifyUrl: 'http://localhost:5173/verify-certificate?certId=x',
  });

describe('renderAndStoreCertificate (queue processor)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders, stores atomically, and marks the certificate ready', async () => {
    generateCertificatePdf.mockResolvedValueOnce(Buffer.from('%PDF-1.4 test'));
    const cert = await createCert();

    const result = await renderAndStoreCertificate(cert.certId, { attempt: 1, maxAttempts: 5 });

    expect(result).toEqual({ rendered: true });
    const saved = await Certificate.findOne({ certId: cert.certId });
    expect(saved.pdfStatus).toBe('ready');
    expect(saved.pdfGeneratedAt).toBeTruthy();

    const filePath = path.join(process.env.CERT_STORAGE_DIR, `${cert.certId}.pdf`);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readdirSync(process.env.CERT_STORAGE_DIR).some((f) => f.endsWith('.tmp'))).toBe(false);
    expect((await getStorage().get(cert.certId)).toString()).toContain('%PDF');
  });

  it('records the error and keeps pending when retries remain', async () => {
    generateCertificatePdf.mockRejectedValueOnce(new Error('font missing'));
    const cert = await createCert();

    await expect(
      renderAndStoreCertificate(cert.certId, { attempt: 1, maxAttempts: 5 }),
    ).rejects.toThrow('font missing');

    const saved = await Certificate.findOne({ certId: cert.certId });
    expect(saved.pdfStatus).toBe('pending');
    expect(saved.pdfError).toBe('font missing');
  });

  it('marks failed on the final attempt', async () => {
    generateCertificatePdf.mockRejectedValueOnce(new Error('disk full'));
    const cert = await createCert();

    await expect(
      renderAndStoreCertificate(cert.certId, { attempt: 5, maxAttempts: 5 }),
    ).rejects.toThrow('disk full');

    const saved = await Certificate.findOne({ certId: cert.certId });
    expect(saved.pdfStatus).toBe('failed');
  });

  it('skips certificates that are already rendered', async () => {
    generateCertificatePdf.mockResolvedValueOnce(Buffer.from('%PDF-1.4 once'));
    const cert = await createCert();
    await renderAndStoreCertificate(cert.certId);

    const result = await renderAndStoreCertificate(cert.certId);

    expect(result).toEqual({ skipped: true, reason: 'already_ready' });
    expect(generateCertificatePdf).toHaveBeenCalledTimes(1);
  });
});
