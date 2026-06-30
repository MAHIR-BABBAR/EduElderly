const mongoose = require('mongoose');

const TEST_DB_URI =
  process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/eduelderly-payment-test';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test_internal_key';
process.env.GATEWAY_TRUST_DISABLED = 'true';
process.env.ENROLLMENT_SERVICE_URL = 'http://enrollment:3004';
process.env.COURSE_SERVICE_URL = 'http://course:3003';
process.env.MOCK_CHECKOUT_BASE_URL = 'http://localhost:5173/#order-pending';

jest.mock('../src/clients/enrollmentClient');

jest.mock('../src/clients/adminClient', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  logAuditSafe: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/clients/courseClient', () => ({
  getCourse: jest.fn().mockResolvedValue({
    courseId: 'course-paid-1',
    isPublished: true,
    isDeleted: false,
    isPaid: true,
    price: 9.99,
  }),
}));

jest.mock('uuid', () => ({
  v7: jest.fn(() => `mocked-uuid-${Math.random().toString(36).substring(7)}`),
}));

const { Transaction } = require('../src/models/Transaction');

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(TEST_DB_URI, { dbName: 'eduelderly-payment-test' });
  await Transaction.syncIndexes();
}, 30000);

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
  await Transaction.syncIndexes();
  jest.clearAllMocks();
});
