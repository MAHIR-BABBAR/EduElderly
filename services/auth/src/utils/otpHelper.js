const redis = require('redis');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');

const MAX_OTP_ATTEMPTS = 3;

let redisClient = null;
let redisReady = false;

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  throw new AppError('REDIS_URL is not configured', 500, ERROR_CODES.E_INTERNAL);
};

const initRedis = async () => {
  if (process.env.NODE_ENV === 'test') {
    redisReady = true;
    return null;
  }

  if (redisClient?.isOpen) {
    redisReady = true;
    return redisClient;
  }

  redisClient = redis.createClient({ url: getRedisUrl() });
  redisClient.on('error', (err) => {
    redisReady = false;
    console.error('Redis Client Error', err.message);
  });

  await redisClient.connect();
  redisReady = true;
  return redisClient;
};

const getRedisClient = () => {
  if (process.env.NODE_ENV === 'test') {
    if (!redisClient) {
      throw new AppError('Redis not initialized for tests', 500, ERROR_CODES.E_INTERNAL);
    }
    return redisClient;
  }
  if (!redisClient?.isOpen) {
    throw new AppError('Redis is not connected', 503, ERROR_CODES.E_INTERNAL);
  }
  return redisClient;
};

const isRedisReady = () => {
  if (process.env.NODE_ENV === 'test') {
    return Boolean(redisClient);
  }
  return redisReady && Boolean(redisClient?.isOpen);
};

const closeRedis = async () => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
  redisClient = null;
  redisReady = false;
};

/** @internal Test-only: inject a mock redis client */
const setRedisClientForTests = (client) => {
  redisClient = client;
  redisReady = Boolean(client);
};

const generateOTP = async (userId, type) => {
  if (!userId || !type) {
    throw new AppError('Error Generating Otp , please try again later', 400, ERROR_CODES.E_VALIDATION);
  }

  const client = getRedisClient();
  const redisKey = `otp:${userId}:${type}`;

  const rawOtp = crypto.randomInt(100000, 999999).toString();
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10);
  const hashedOtp = await bcrypt.hash(rawOtp, salt);

  const redisResult = await client
    .multi()
    .hSet(redisKey, {
      hashedOtp,
      attempts: 0,
      lastSent: Date.now(),
    })
    .expire(redisKey, 180)
    .exec();

  if (!redisResult || redisResult.length !== 2) {
    throw new AppError(
      'OTP Generation Error: Failed to save to cache',
      500,
      ERROR_CODES.E_OTP_GENERATION_ERROR,
    );
  }

  return [rawOtp, hashedOtp];
};

const verifyOtp = async (userId, type, otp) => {
  if (!userId || !type || !otp) {
    throw new AppError('Error Verifying Otp , please try again later', 400, ERROR_CODES.E_VALIDATION);
  }

  const client = getRedisClient();
  const redisKey = `otp:${userId}:${type}`;
  const value = await client.hGetAll(redisKey);

  if (!value || Object.keys(value).length === 0) {
    throw new AppError('OTP expired or not found', 404, ERROR_CODES.E_OTP_NOT_FOUND);
  }

  const attempts = parseInt(value.attempts, 10) || 0;

  const isMatch = await bcrypt.compare(otp, value.hashedOtp);

  if (isMatch) {
    await client.del(redisKey);
    return true;
  }

  const nextAttempts = attempts + 1;
  if (nextAttempts >= MAX_OTP_ATTEMPTS) {
    await client.del(redisKey);
    throw new AppError('Too many OTP attempts. Please request a new code.', 401, ERROR_CODES.E_OTP_INVALID);
  }

  await client.hSet(redisKey, 'attempts', nextAttempts);
  return false;
};

module.exports = {
  initRedis,
  getRedisClient,
  isRedisReady,
  closeRedis,
  setRedisClientForTests,
  generateOTP,
  verifyOtp,
};
