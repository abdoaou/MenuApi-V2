const apiKeyModel = require('../models/apiKey.model');
const { generateApiKey } = require('../utils/apiKey');

async function list(websiteId) {
  return apiKeyModel.listByWebsite(websiteId);
}

async function create(websiteId, { name, scopes, expires_at }) {
  const { full, prefix, hash } = generateApiKey();
  const id = await apiKeyModel.insert({
    website_id: websiteId,
    name,
    key_prefix: prefix,
    key_hash: hash,
    scopes: scopes || ['read:menu'],
    expires_at: expires_at || null,
  });
  return {
    id,
    name,
    key: full,
    prefix,
    message: 'Store this key securely; it will not be shown again.',
  };
}

async function revoke(websiteId, id) {
  const affected = await apiKeyModel.revoke(id, websiteId);
  if (!affected) {
    const err = new Error('API key not found');
    err.statusCode = 404;
    throw err;
  }
}

module.exports = { list, create, revoke };
