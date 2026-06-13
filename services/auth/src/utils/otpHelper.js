const redis = require('redis');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');

const MAX_OTP_ATTEMPTS = 3;

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  throw new AppError('REDIS_URL is not configured', 500, ERROR_CODES.E_INTERNAL);
};

const redisClient = redis.createClient({ url: getRedisUrl() });

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  if (process.env.NODE_ENV !== 'test') {
    await redisClient.connect();
  }
})();

const generateOTP = async (userId, type) => {
  if (!userId || !type) {
    throw new AppError('Error Generating Otp , please try again later', 400, ERROR_CODES.E_VALIDATION);
  }

  const redisKey = `otp:${userId}:${type}`;

  const rawOtp = crypto.randomInt(100000, 999999).toString();
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10);
  const hashedOtp = await bcrypt.hash(rawOtp, salt);

  const redisResult = await redisClient
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

  const redisKey = `otp:${userId}:${type}`;
  const value = await redisClient.hGetAll(redisKey);

  if (!value || Object.keys(value).length === 0) {
    throw new AppError('OTP expired or not found', 404, ERROR_CODES.E_OTP_NOT_FOUND);
  }

  const attempts = parseInt(value.attempts, 10) || 0;
  if (attempts >= MAX_OTP_ATTEMPTS) {
    await redisClient.del(redisKey);
    throw new AppError('Too many OTP attempts. Please request a new code.', 401, ERROR_CODES.E_OTP_INVALID);
  }

  const isMatch = await bcrypt.compare(otp, value.hashedOtp);

  if (isMatch) {
    await redisClient.del(redisKey);
    return true;
  }

  const nextAttempts = attempts + 1;
  if (nextAttempts >= MAX_OTP_ATTEMPTS) {
    await redisClient.del(redisKey);
    throw new AppError('Too many OTP attempts. Please request a new code.', 401, ERROR_CODES.E_OTP_INVALID);
  }

  await redisClient.hSet(redisKey, 'attempts', nextAttempts);
  return false;
};

module.exports = {
  redisClient,
  generateOTP,
  verifyOtp,
};
