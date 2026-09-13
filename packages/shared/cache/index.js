/**
 * Small read-through JSON cache on Redis.
 *
 * Opt-in like the queues: active when REDIS_URL is set (never in tests unless
 * CACHE_ENABLED=true). Every call degrades to "no cache" on any Redis error so
 * a Redis outage costs latency, not availability.
 *
 *   const { value, hit } = await cache.remember('course:list:1:20', 60, () => load());
 *   await cache.invalidatePrefix('course:');   // after any write
 */

const IORedis = require('ioredis');
const { createLogger } = require('../utils/logger');

const log = createLogger('cache');

let client = null;

const isCacheEnabled = () => {
  if (process.env.CACHE_ENABLED === 'false') return false;
  if (!process.env.REDIS_URL) return false;
  if (process.env.CACHE_ENABLED === 'true') return true;
  return process.env.NODE_ENV !== 'test';
};

const getClient = () => {
  if (!client) {
    client = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
    });
    client.on('error', (error) => log.warn('Redis cache error', { message: error.message }));
  }
  return client;
};

const keyPrefix = () => process.env.CACHE_KEY_PREFIX || 'eduelderly:';

const fullKey = (key) => `${keyPrefix()}${key}`;

const get = async (key) => {
  if (!isCacheEnabled()) return null;
  try {
    const raw = await getClient().get(fullKey(key));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    log.warn('cache get failed', { key, message: error.message });
    return null;
  }
};

const set = async (key, value, ttlSeconds) => {
  if (!isCacheEnabled()) return false;
  try {
    await getClient().set(fullKey(key), JSON.stringify(value), 'EX', ttlSeconds);
    return true;
  } catch (error) {
    log.warn('cache set failed', { key, message: error.message });
    return false;
  }
};

/**
 * Read-through helper. Returns `{ value, hit }` so callers can expose an
 * `X-Cache: HIT|MISS` header.
 */
const remember = async (key, ttlSeconds, loader) => {
  const cached = await get(key);
  if (cached !== null) return { value: cached, hit: true };
  const value = await loader();
  if (value !== undefined && value !== null) await set(key, value, ttlSeconds);
  return { value, hit: false };
};

/** Delete every key under a prefix using SCAN, never KEYS. */
const invalidatePrefix = async (prefix) => {
  if (!isCacheEnabled()) return 0;
  try {
    const redis = getClient();
    let cursor = '0';
    let deleted = 0;
    const pattern = `${fullKey(prefix)}*`;
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = next;
      if (keys.length) deleted += await redis.del(...keys);
    } while (cursor !== '0');
    return deleted;
  } catch (error) {
    log.warn('cache invalidate failed', { prefix, message: error.message });
    return 0;
  }
};

const closeCache = async () => {
  if (client) {
    const c = client;
    client = null;
    try {
      await c.quit();
    } catch {
      /* already closed */
    }
  }
};

module.exports = { isCacheEnabled, get, set, remember, invalidatePrefix, closeCache };
