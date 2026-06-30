const { getInternalServiceKey } = require('@eduelderly/shared');

const getBaseUrl = () => process.env.ADMIN_SERVICE_URL || 'http://admin:3008';

const logAudit = async (payload) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}/internal/audit-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': getInternalServiceKey(),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Admin service responded ${response.status}: ${body}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const logAuditSafe = (payload) =>
  logAudit(payload).catch((error) => {
    console.error('[course-admin] audit log failed:', error.message);
  });

module.exports = { logAudit, logAuditSafe };
