const { getInternalServiceKey } = require('@eduelderly/shared');

const getBaseUrl = () => process.env.NOTIFICATION_SERVICE_URL || 'http://notification:3007';

const sendNotification = async ({ userId, email, type, templateData }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}/internal/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': getInternalServiceKey(),
      },
      body: JSON.stringify({ userId, email, type, templateData }),
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

const notifyEnroll = ({ userId, email, name, courseTitle }) => {
  sendNotification({
    userId,
    email,
    type: 'enroll',
    templateData: { name, courseTitle },
  }).catch((error) => {
    console.error('[enrollment-notification] enroll notify failed:', error.message);
  });
};

const notifyCompletion = ({ userId, email, name, courseTitle, certId, verifyUrl }) => {
  sendNotification({
    userId,
    email,
    type: 'completion',
    templateData: { name, courseTitle, certId, verifyUrl },
  }).catch((error) => {
    console.error('[enrollment-notification] completion notify failed:', error.message);
  });
};

module.exports = { sendNotification, notifyEnroll, notifyCompletion };
