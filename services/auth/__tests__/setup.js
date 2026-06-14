const mongoose = require('mongoose');
const { setRedisClientForTests } = require('../src/utils/otpHelper');

const TEST_DB_URI =
  process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/eduelderly-auth-test';

const otpStore = {};

const createMockRedisClient = () => ({
  isOpen: true,
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  multi: jest.fn().mockImplementation(() => {
    let key;
    let fields;
    const chain = {
      hSet: jest.fn((k, f) => {
        key = k;
        fields = Object.fromEntries(
          Object.entries(f).map(([entryKey, entryValue]) => [entryKey, String(entryValue)]),
        );
        return chain;
      }),
      expire: jest.fn(() => chain),
      exec: jest.fn(async () => {
        if (key) otpStore[key] = { ...fields };
        return [1, 1];
      }),
    };
    return chain;
  }),
  hGetAll: jest.fn((key) => Promise.resolve({ ...(otpStore[key] || {}) })),
  hSet: jest.fn(async (key, field, value) => {
    if (!otpStore[key]) otpStore[key] = {};
    if (typeof field === 'object') {
      Object.assign(otpStore[key], field);
    } else {
      otpStore[key][field] = String(value);
    }
    return 1;
  }),
  del: jest.fn(async (key) => {
    delete otpStore[key];
    return 1;
  }),
});

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.BCRYPT_SALT_ROUNDS = '1';
process.env.INTERNAL_SERVICE_KEY = 'test_internal_key';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';
process.env.NOTIFICATION_SERVICE_URL = 'http://localhost:3007';
process.env.USER_SERVICE_URL = 'http://localhost:3002';
process.env.APP_URL = 'http://localhost:5173';

jest.mock('../src/services/mailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendOtpEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/clients/userClient', () => ({
  createUserProfile: jest.fn().mockResolvedValue(undefined),
  syncUserProfile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('uuid', () => ({
  v7: jest.fn(() => `mocked-uuid-${Math.random().toString(36).substring(7)}`),
}));

beforeAll(async () => {
  setRedisClientForTests(createMockRedisClient());

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(TEST_DB_URI, { dbName: 'eduelderly-auth-test' });
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoose.disconnect();
  }
}, 30000);

afterEach(async () => {
  Object.keys(otpStore).forEach((key) => delete otpStore[key]);

  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
  jest.clearAllMocks();
});
