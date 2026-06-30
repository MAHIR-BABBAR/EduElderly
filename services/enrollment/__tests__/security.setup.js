process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test_internal_key';
process.env.GATEWAY_TRUST_DISABLED = 'true';
process.env.COURSE_SERVICE_URL = 'http://course:3003';
process.env.USER_SERVICE_URL = 'http://user:3002';
process.env.PAYMENT_SERVICE_URL = 'http://payment:3006';
process.env.NOTIFICATION_SERVICE_URL = 'http://notification:3007';
process.env.CERTIFICATE_SERVICE_URL = 'http://certificate:3009';

jest.mock('../src/clients/courseClient');
jest.mock('../src/clients/userClient');
jest.mock('../src/clients/paymentClient');
jest.mock('../src/clients/notificationClient');
jest.mock('../src/clients/certificateClient');

jest.mock('uuid', () => ({
  v7: jest.fn(() => `mocked-uuid-${Math.random().toString(36).substring(7)}`),
}));
