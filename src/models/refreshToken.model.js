const { query } = require('../config/database');

async function insert({ adminId, tokenHash, expiresAt }) {
  const sql = `
    INSERT INTO refresh_tokens (admin_id, token_hash, expires_at)
    VALUES (:adminId, :tokenHash, :expiresAt)
  `;
  await query(sql, { adminId, tokenHash, expiresAt });
}

async function findValid(tokenHash) {
  const sql = `
    SELECT id, admin_id, expires_at
    FROM refresh_tokens
    WHERE token_hash = :tokenHash AND revoked_at IS NULL AND expires_at > NOW()
    LIMIT 1
  `;
  const [rows] = await query(sql, { tokenHash });
  return rows[0] || null;
}

async function revoke(tokenHash) {
  const sql = `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = :tokenHash`;
  const [, meta] = await query(sql, { tokenHash });
  return meta.affectedRows;
}

async function revokeAllForAdmin(adminId) {
  const sql = `
    UPDATE refresh_tokens SET revoked_at = NOW()
    WHERE admin_id = :adminId AND revoked_at IS NULL
  `;
  await query(sql, { adminId });
}

module.exports = { insert, findValid, revoke, revokeAllForAdmin };
