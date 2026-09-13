const { getInternalServiceKey } = require('@eduelderly/shared');

const createStatsClient = (serviceName, baseUrlEnv, defaultUrl, statsPath = '/internal/stats') => {
  const getBaseUrl = () => process.env[baseUrlEnv] || defaultUrl;

  const getStats = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${getBaseUrl()}${statsPath}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': getInternalServiceKey(),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${serviceName} responded ${response.status}: ${text}`);
      }

      const result = await response.json();
      return result.data;
    } finally {
      clearTimeout(timeout);
    }
  };

  return { getStats };
};

const userClient = createStatsClient('user-service', 'USER_SERVICE_URL', 'http://user:3002');
const courseClient = createStatsClient('course-service', 'COURSE_SERVICE_URL', 'http://course:3003');
const enrollmentClient = createStatsClient(
  'enrollment-service',
  'ENROLLMENT_SERVICE_URL',
  'http://enrollment:3004',
);
const paymentClient = createStatsClient('payment-service', 'PAYMENT_SERVICE_URL', 'http://payment:3006');
const certificateClient = createStatsClient(
  'certificate-service',
  'CERTIFICATE_SERVICE_URL',
  'http://certificate:3009',
);

// Queue health from the two services that run BullMQ workers.
const emailQueueClient = createStatsClient(
  'notification-service',
  'NOTIFICATION_SERVICE_URL',
  'http://notification:3007',
  '/internal/queue/stats',
);
const pdfQueueClient = createStatsClient(
  'certificate-service',
  'CERTIFICATE_SERVICE_URL',
  'http://certificate:3009',
  '/internal/queue/stats',
);

module.exports = {
  userClient,
  courseClient,
  enrollmentClient,
  paymentClient,
  certificateClient,
  emailQueueClient,
  pdfQueueClient,
};
