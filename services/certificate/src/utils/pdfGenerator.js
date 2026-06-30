const PDFDocument = require('pdfkit');

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

/**
 * Generate a certificate PDF buffer from metadata.
 * @param {{ userName: string, courseTitle: string, certId: string, issuedAt: Date|string }} data
 * @returns {Promise<Buffer>}
 */
const generateCertificatePdf = ({ userName, courseTitle, certId, issuedAt }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const centerX = pageWidth / 2;

    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).lineWidth(2).stroke('#1B5E6B');

    doc.fontSize(14).fillColor('#4A6270').text('EduElderly', 0, 60, { align: 'center' });
    doc.fontSize(32).fillColor('#1B5E6B').text('Certificate of Completion', 0, 90, { align: 'center' });

    doc.moveDown(2);
    doc.fontSize(16).fillColor('#4A6270').text('This certifies that', centerX - 200, 160, {
      width: 400,
      align: 'center',
    });

    doc.fontSize(28).fillColor('#1A2B32').text(userName, 0, 200, { align: 'center' });

    doc.fontSize(16).fillColor('#4A6270').text('has successfully completed', 0, 250, { align: 'center' });
    doc.fontSize(22).fillColor('#134652').text(courseTitle, 0, 280, { align: 'center' });

    doc.fontSize(12).fillColor('#4A6270').text(`Issued on ${formatDate(issuedAt)}`, 0, 340, { align: 'center' });
    doc.fontSize(10).fillColor('#4A6270').text(`Certificate ID: ${certId}`, 0, 370, { align: 'center' });

    doc.end();
  });

module.exports = { generateCertificatePdf };
