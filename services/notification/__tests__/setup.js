const path = require('path');
const mongoose = require('mongoose');

const TEST_DB_URI =
  process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/eduelderly-notification-test';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test_internal_key';
process.env.GATEWAY_TRUST_DISABLED = 'true';

jest.mock('uuid', () => ({
  v7: jest.fn(() => `mocked-uuid-${Math.random().toString(36).substring(7)}`),
}));

// One database per test file. The queue test polls Mongo while a BullMQ
// worker runs; sharing a database let another file's cleanup delete the
// notification it was waiting for.
const dbNameFor = (testPath = '') => {
  const file = path.basename(testPath, '.test.js').replace(/[^\w-]/g, '-') || 'shared';
  return `eduelderly-notification-test-${file}`;
};

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(TEST_DB_URI, { dbName: dbNameFor(expect.getState().testPath) });
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

// Isolate test queues from any live worker sharing this Redis.
process.env.QUEUE_PREFIX = process.env.QUEUE_PREFIX || 'test-notification';
