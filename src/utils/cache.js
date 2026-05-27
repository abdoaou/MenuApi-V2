/**
 * In-memory cache with optional Redis (REDIS_URL).
 * Falls back to Map when Redis is unavailable.
 */

const env = require('../config/env');

/** @type {Map<string, { value: unknown, expiresAt: number }>} */
const memory = new Map();

/** @type {import('ioredis').default | null} */
let redis = null;

function initRedis() {
  if (redis !== null || !env.redis.url) {
    return;
  }
  try {
    // eslint-disable-next-line global-require
    const Redis = require('ioredis');
    redis = new Redis(env.redis.url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redis.on('error', () => {
      redis = null;
    });
  } catch {
    redis = null;
  }
}

initRedis();

/**
 * @param {string} key
 * @returns {Promise<unknown|null>}
 */
async function get(key) {
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      /* fall through */
    }
  }
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * @param {string} key
 * @param {unknown} value
 * @param {number} [ttlSeconds=300]
 */
async function set(key, value, ttlSeconds = 300) {
  const payload = JSON.stringify(value);
  if (redis) {
    try {
      await redis.setex(key, ttlSeconds, payload);
      return;
    } catch {
      /* fall through */
    }
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/**
 * @param {string} key
 */
async function del(key) {
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      /* ignore */
    }
  }
  memory.delete(key);
}

/**
 * @param {string} prefix
 */
async function delByPrefix(prefix) {
  if (redis) {
    try {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length) await redis.del(...keys);
    } catch {
      /* ignore */
    }
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

function tenantCacheKey(websiteId, suffix) {
  return `tenant:${websiteId}:${suffix}`;
}

module.exports = { get, set, del, delByPrefix, tenantCacheKey };
