const redis = require('redis');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { AppError, ERROR_CODES, catchAsync } = require('@eduelderly/shared');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const redisClient = redis.createClient({
  url: `redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_URL}`,
});

redisClient.on('error', err => console.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();
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
      hashedOtp: hashedOtp,
      attempts: 0,
      lastSent: Date.now(),
    })
    .expire(redisKey, 180)
    .exec();
  console.log(redisResult);

  if (!redisResult || redisResult.length !== 2) {
    throw new AppError(
      'OTP Generation Error: Failed to save to cache',
      500,
      ERROR_CODES.E_OTP_GENERATION_ERROR,
    );

  }
  return [rawOtp, hashedOtp];
}



const verifyOtp = async (userId, type, otp) => {

  if (!userId || !type || !otp) {
    throw new AppError('Error Verifying Otp , please try again later', 400, ERROR_CODES.E_VALIDATION);
  }

  const redisKey = `otp:${userId}:${type}`;

  const value = await redisClient.hGetAll(redisKey);

  if (!value || Object.keys(value).length === 0) {
    throw new AppError('OTP expired or not found', 404, ERROR_CODES.E_OTP_NOT_FOUND);
  }

  const isMatch = await bcrypt.compare(otp, value.hashedOtp);

  if (isMatch) {
    await redisClient.del(redisKey);
    return true;
  }
  return false;
};

module.exports = {
  redisClient,
  generateOTP,
  verifyOtp
};