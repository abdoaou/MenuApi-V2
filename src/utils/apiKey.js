const crypto = require('crypto');

const PREFIX = 'mk_';

function generateApiKey() {
  const secret = crypto.randomBytes(32).toString('base64url');
  const full = `${PREFIX}${secret}`;
  const prefix = full.slice(0, 12);
  const hash = hashApiKey(full);
  return { full, prefix, hash };
}

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

module.exports = { generateApiKey, hashApiKey, hashRefreshToken, generateRefreshToken, PREFIX };
