const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const redis = require('redis');

let mongoServer;

// Mock the App Env variables
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.BCRYPT_SALT_ROUNDS = '1';
process.env.INTERNAL_SERVICE_KEY = 'test_internal_key';
process.env.REDIS_URL = 'redis://localhost:6379';
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
}));

// Mock Redis (ioredis-mock or minimal mock since we only use hSet, expire, hGetAll, del)
jest.mock('redis', () => {
  const mRedisClient = {
    connect: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    multi: jest.fn().mockReturnThis(),
    hSet: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([1, 1]),
    hGetAll: jest.fn(),
    del: jest.fn(),
  };
  return {
    createClient: jest.fn(() => mRedisClient),
  };
});

jest.mock('uuid', () => {
  return {
    v7: jest.fn(() => 'mocked-uuid-' + Math.random().toString(36).substring(7)),
  };
});

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  const fallbackUri = process.env.TEST_MONGO_URI;

  try {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  } catch (error) {
    if (!fallbackUri) {
      throw error;
    }
    console.warn('MongoMemoryServer unavailable; using TEST_MONGO_URI fallback');
    await mongoose.connect(fallbackUri);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
  jest.clearAllMocks();
});
