process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test_internal_key';
process.env.GATEWAY_TRUST_DISABLED = 'true';
process.env.ENROLLMENT_SERVICE_URL = 'http://enrollment:3004';

jest.mock('../src/clients/enrollmentClient');

jest.mock('uuid', () => ({
  v7: jest.fn(() => `mocked-uuid-${Math.random().toString(36).substring(7)}`),
}));
