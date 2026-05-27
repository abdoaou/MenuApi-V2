const { query, driver } = require('../config/database');

async function get(websiteId, key) {
  const sql = `
    SELECT id, website_id, setting_key, setting_value, created_at, updated_at
    FROM website_settings
    WHERE website_id = :websiteId AND setting_key = :key
    LIMIT 1
  `;
  const [rows] = await query(sql, { websiteId, key });
  return rows[0] || null;
}

async function listAll(websiteId) {
  const sql = `
    SELECT setting_key, setting_value, updated_at
    FROM website_settings
    WHERE website_id = :websiteId
    ORDER BY setting_key ASC
  `;
  const [rows] = await query(sql, { websiteId });
  return rows;
}

async function upsert(websiteId, key, value) {
  const sql = `
    INSERT INTO website_settings (website_id, setting_key, setting_value)
    VALUES (:websiteId, :key, CAST(:value AS jsonb))
    ON CONFLICT (website_id, setting_key)
    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
    ${driver === 'postgres' ? 'RETURNING id' : ''}
  `;
  const valueJson = typeof value === 'string' ? value : JSON.stringify(value);
  const [, meta] = await query(sql, {
    websiteId,
    key,
    value: driver === 'postgres' ? valueJson : valueJson,
  });
  return meta.insertId;
}

async function remove(websiteId, key) {
  const sql = `DELETE FROM website_settings WHERE website_id = :websiteId AND setting_key = :key`;
  const [, meta] = await query(sql, { websiteId, key });
  return meta.affectedRows;
}

module.exports = { get, listAll, upsert, remove };
