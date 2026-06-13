const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendTransactionalEmail = async ({ to, subject, htmlContent, textContent }) => {
  if (process.env.NODE_ENV === 'test') {
    return { messageId: 'test-message-id' };
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'EduElderly';

  if (!apiKey || !senderEmail) {
    throw new Error('Brevo is not configured (BREVO_API_KEY, BREVO_SENDER_EMAIL required)');
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent,
      textContent,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('[brevo] send failed:', response.status, body);
    throw new Error('Failed to send email via Brevo');
  }

  return response.json();
};

module.exports = { sendTransactionalEmail };
