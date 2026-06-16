const mongoose = require('mongoose');

const TEST_DB_URI =
  process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/eduelderly-course-test';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test_internal_key';

jest.mock('uuid', () => ({
  v7: jest.fn(() => `mocked-uuid-${Math.random().toString(36).substring(7)}`),
}));

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(TEST_DB_URI, { dbName: 'eduelderly-course-test' });
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
});
