const settingsModel = require('../models/settings.model');
const cache = require('../utils/cache');

async function list(websiteId) {
  const rows = await settingsModel.listAll(websiteId);
  return rows.reduce((acc, row) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {});
}

async function get(websiteId, key) {
  const row = await settingsModel.get(websiteId, key);
  if (!row) {
    const err = new Error('Setting not found');
    err.statusCode = 404;
    throw err;
  }
  return { key: row.setting_key, value: row.setting_value };
}

async function upsert(websiteId, key, value) {
  await settingsModel.upsert(websiteId, key, value);
  await cache.del(cache.tenantCacheKey(websiteId, 'settings'));
  return { key, value };
}

async function remove(websiteId, key) {
  const affected = await settingsModel.remove(websiteId, key);
  if (!affected) {
    const err = new Error('Setting not found');
    err.statusCode = 404;
    throw err;
  }
  await cache.del(cache.tenantCacheKey(websiteId, 'settings'));
}

module.exports = { list, get, upsert, remove };
