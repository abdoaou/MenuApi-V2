const { query, driver } = require('../config/database');

const SELECT_FIELDS = `
  id,
  username,
  email,
  created_at,
  updated_at
`;

async function findByEmailOrUsername(identifier) {
  const sql = `
    SELECT id, username, email, password, role_id, website_id, is_active, created_at, updated_at
    FROM admins
    WHERE (email = :identifier OR username = :identifier)
      AND (deleted_at IS NULL)
    LIMIT 1
  `;
  const [rows] = await query(sql, { identifier });
  return rows[0] || null;
}

async function findById(id) {
  const sql = `SELECT ${SELECT_FIELDS} FROM admins WHERE id = :id LIMIT 1`;
  const [rows] = await query(sql, { id });
  return rows[0] || null;
}

async function findByIdWithPassword(id) {
  const sql = `
    SELECT id, username, email, password, created_at, updated_at
    FROM admins
    WHERE id = :id
    LIMIT 1
  `;
  const [rows] = await query(sql, { id });
  return rows[0] || null;
}

async function listAll() {
  const sql = `SELECT ${SELECT_FIELDS} FROM admins ORDER BY id ASC`;
  const [rows] = await query(sql);
  return rows;
}

async function countByUsername(username, excludeId = null) {
  let sql = `SELECT COUNT(*) AS cnt FROM admins WHERE username = :username`;
  const params = { username };
  if (excludeId) {
    sql += ' AND id <> :excludeId';
    params.excludeId = excludeId;
  }
  const [rows] = await query(sql, params);
  return Number(rows[0].cnt);
}

async function countByEmail(email, excludeId = null) {
  let sql = `SELECT COUNT(*) AS cnt FROM admins WHERE email = :email`;
  const params = { email };
  if (excludeId) {
    sql += ' AND id <> :excludeId';
    params.excludeId = excludeId;
  }
  const [rows] = await query(sql, params);
  return Number(rows[0].cnt);
}

async function insertAdmin(data) {
  const sql = `
    INSERT INTO admins (username, email, password)
    VALUES (:username, :email, :password)
    ${driver === 'postgres' ? 'RETURNING id' : ''}
  `;
  const [, meta] = await query(sql, data);
  return meta.insertId;
}

async function updateAdmin(id, data) {
  const sql = `
    UPDATE admins SET
      username = :username,
      email = :email,
      password = :password
    WHERE id = :id
  `;
  const [, meta] = await query(sql, { ...data, id });
  return meta.affectedRows;
}

async function deleteAdmin(id) {
  const sql = `DELETE FROM admins WHERE id = :id`;
  const [, meta] = await query(sql, { id });
  return meta.affectedRows;
}

async function countAll() {
  const sql = `SELECT COUNT(*) AS cnt FROM admins`;
  const [rows] = await query(sql);
  return Number(rows[0].cnt);
}

module.exports = {
  findByEmailOrUsername,
  findById,
  findByIdWithPassword,
  listAll,
  countByUsername,
  countByEmail,
  insertAdmin,
  updateAdmin,
  deleteAdmin,
  countAll,
};
