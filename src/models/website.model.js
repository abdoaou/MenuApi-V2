const { query, driver } = require('../config/database');

const SELECT_FIELDS = `
  id,
  name,
  slug,
  domain,
  config,
  is_active,
  deleted_at,
  created_at,
  updated_at
`;

async function findBySlug(slug, excludeId = null) {
  let sql = `SELECT ${SELECT_FIELDS} FROM websites WHERE slug = :slug`;
  const params = { slug };
  if (excludeId) {
    sql += ' AND id <> :excludeId';
    params.excludeId = excludeId;
  }
  sql += ' LIMIT 1';
  const [rows] = await query(sql, params);
  return rows[0] || null;
}

async function findById(id) {
  const sql = `SELECT ${SELECT_FIELDS} FROM websites WHERE id = :id LIMIT 1`;
  const [rows] = await query(sql, { id });
  return rows[0] || null;
}

async function listAll() {
  const sql = `SELECT ${SELECT_FIELDS} FROM websites ORDER BY id ASC`;
  const [rows] = await query(sql);
  return rows;
}

async function countProducts(websiteId) {
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM products
    WHERE deleted_at IS NULL AND website_id = :websiteId
  `;
  const [rows] = await query(sql, { websiteId });
  return Number(rows[0].cnt);
}

async function insertWebsite(data) {
  const sql = `
    INSERT INTO websites (name, slug)
    VALUES (:name, :slug)
    ${driver === 'postgres' ? 'RETURNING id' : ''}
  `;
  const [, meta] = await query(sql, data);
  return meta.insertId;
}

async function updateWebsite(id, data) {
  const sql = `
    UPDATE websites SET
      name = :name,
      slug = :slug
    WHERE id = :id
  `;
  const [, meta] = await query(sql, { ...data, id });
  return meta.affectedRows;
}

async function deleteWebsite(id) {
  const sql = `DELETE FROM websites WHERE id = :id`;
  const [, meta] = await query(sql, { id });
  return meta.affectedRows;
}

module.exports = {
  findBySlug,
  findById,
  listAll,
  countProducts,
  insertWebsite,
  updateWebsite,
  deleteWebsite,
};
