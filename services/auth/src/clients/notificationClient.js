const { getInternalServiceKey } = require('@eduelderly/shared');

const getBaseUrl = () => process.env.NOTIFICATION_SERVICE_URL || 'http://notification:3007';

const sendAuthEmail = async ({ email, userId, type, templateData }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}/internal/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': getInternalServiceKey(),
      },
      body: JSON.stringify({ email, userId, type, templateData }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Notification service responded ${response.status}: ${body}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { sendAuthEmail };
