const env = require('../config/env');
const apiKeyModel = require('../models/apiKey.model');
const websiteModel = require('../models/website.model');
const { hashApiKey } = require('../utils/apiKey');
const { fail } = require('../utils/response');

/**
 * Validates X-API-Key for public read endpoints.
 */
async function authenticateApiKey(req, res, next) {
  const key =
    req.headers[env.apiKeyHeader.toLowerCase()] ||
    req.headers[env.apiKeyHeader] ||
    req.query.api_key;

  if (!key || typeof key !== 'string') {
    return fail(res, { message: 'API key required', status: 401 });
  }

  const prefix = key.slice(0, 12);
  const record = await apiKeyModel.findByPrefix(prefix);
  if (!record) {
    return fail(res, { message: 'Invalid API key', status: 401 });
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return fail(res, { message: 'API key expired', status: 401 });
  }

  const hash = hashApiKey(key);
  if (hash !== record.key_hash) {
    return fail(res, { message: 'Invalid API key', status: 401 });
  }

  const site = await websiteModel.findById(record.website_id);
  if (!site || site.is_active === false) {
    return fail(res, { message: 'Website inactive', status: 403 });
  }

  req.tenant = { id: site.id, slug: site.slug, name: site.name, domain: site.domain };
  req.websiteId = site.id;
  req.apiKey = { id: record.id, scopes: record.scopes || ['read:menu'] };

  apiKeyModel.touchLastUsed(record.id).catch(() => {});

  return next();
}

module.exports = { authenticateApiKey };
