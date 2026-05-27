const { query, driver } = require('../config/database');

async function findByPrefix(prefix) {
  const sql = `
    SELECT id, website_id, name, key_prefix, key_hash, scopes, is_active, expires_at
    FROM api_keys
    WHERE deleted_at IS NULL AND is_active = TRUE AND key_prefix = :prefix
    LIMIT 1
  `;
  const [rows] = await query(sql, { prefix });
  return rows[0] || null;
}

async function listByWebsite(websiteId) {
  const sql = `
    SELECT id, website_id, name, key_prefix, scopes, is_active, last_used_at, expires_at, created_at
    FROM api_keys
    WHERE deleted_at IS NULL AND website_id = :websiteId
    ORDER BY created_at DESC
  `;
  const [rows] = await query(sql, { websiteId });
  return rows;
}

async function insert(data) {
  const sql = `
    INSERT INTO api_keys (website_id, name, key_prefix, key_hash, scopes, expires_at)
    VALUES (:website_id, :name, :key_prefix, :key_hash, :scopes, :expires_at)
    ${driver === 'postgres' ? 'RETURNING id' : ''}
  `;
  const [, meta] = await query(sql, data);
  return meta.insertId;
}

async function touchLastUsed(id) {
  await query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = :id`, { id });
}

async function revoke(id, websiteId) {
  const sql = `
    UPDATE api_keys SET deleted_at = NOW(), is_active = FALSE
    WHERE id = :id AND website_id = :websiteId AND deleted_at IS NULL
  `;
  const [, meta] = await query(sql, { id, websiteId });
  return meta.affectedRows;
}

module.exports = { findByPrefix, listByWebsite, insert, touchLastUsed, revoke };
