const { query } = require('../config/database');

async function findRoleByAdminId(adminId) {
  const sql = `
    SELECT r.id, r.name, r.description, a.website_id
    FROM admins a
    LEFT JOIN roles r ON r.id = a.role_id
    WHERE a.id = :adminId AND a.deleted_at IS NULL
    LIMIT 1
  `;
  const [rows] = await query(sql, { adminId });
  return rows[0] || null;
}

async function adminHasPermission(adminId, resource, action) {
  const sql = `
    SELECT 1
    FROM admins a
    JOIN roles ro ON ro.id = a.role_id
    JOIN role_permissions rp ON rp.role_id = ro.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE a.id = :adminId
      AND a.is_active = TRUE
      AND (a.deleted_at IS NULL)
      AND p.resource = :resource
      AND p.action = :action
    LIMIT 1
  `;
  const [rows] = await query(sql, { adminId, resource, action });
  return rows.length > 0;
}

module.exports = { findRoleByAdminId, adminHasPermission };
