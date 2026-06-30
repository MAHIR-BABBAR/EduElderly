const { getInternalServiceKey } = require('@eduelderly/shared');

const getBaseUrl = () => process.env.CERTIFICATE_SERVICE_URL || 'http://certificate:3009';

const issueCertificate = async ({ userId, courseId, userName, courseTitle }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}/internal/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': getInternalServiceKey(),
      },
      body: JSON.stringify({ userId, courseId, userName, courseTitle }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Certificate service responded ${response.status}: ${body}`);
    }

    const result = await response.json();
    return result.data;
  } finally {
    clearTimeout(timeout);
  }
};

const issueCertificateSafe = (payload) =>
  issueCertificate(payload).catch((error) => {
    console.error('[enrollment-certificate] issue failed:', error.message);
    return null;
  });

module.exports = { issueCertificate, issueCertificateSafe };
