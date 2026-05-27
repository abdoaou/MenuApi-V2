const { query } = require('../config/database');

async function insert(entry) {
  const sql = `
    INSERT INTO api_logs (website_id, admin_id, method, path, status_code, ip_address, user_agent, duration_ms, error_message)
    VALUES (:website_id, :admin_id, :method, :path, :status_code, :ip_address, :user_agent, :duration_ms, :error_message)
  `;
  await query(sql, {
    website_id: entry.websiteId ?? null,
    admin_id: entry.adminId ?? null,
    method: entry.method,
    path: entry.path,
    status_code: entry.statusCode ?? null,
    ip_address: entry.ip ?? null,
    user_agent: entry.userAgent ?? null,
    duration_ms: entry.durationMs ?? null,
    error_message: entry.errorMessage ?? null,
  });
}

module.exports = { insert };
