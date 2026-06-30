const mongoose = require('mongoose');

const TEST_DB_URI =
  process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/eduelderly-admin-test';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test_internal_key';
process.env.GATEWAY_TRUST_DISABLED = 'true';

jest.mock('uuid', () => ({
  v7: jest.fn(() => `mocked-uuid-${Math.random().toString(36).substring(7)}`),
}));

jest.mock('../src/clients/statsClients', () => ({
  userClient: { getStats: jest.fn() },
  courseClient: { getStats: jest.fn() },
  enrollmentClient: { getStats: jest.fn() },
  paymentClient: { getStats: jest.fn() },
  certificateClient: { getStats: jest.fn() },
}));

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(TEST_DB_URI, { dbName: 'eduelderly-admin-test' });
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoose.disconnect();
  }
}, 30000);

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
  jest.clearAllMocks();
});
