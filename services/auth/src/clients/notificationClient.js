const getBaseUrl = () => process.env.NOTIFICATION_SERVICE_URL || 'http://notification:3007';

const sendAuthEmail = async ({ email, type, templateData }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}/internal/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': process.env.INTERNAL_SERVICE_KEY || '',
      },
      body: JSON.stringify({ email, type, templateData }),
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
