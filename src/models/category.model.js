const { query, driver } = require('../config/database');

const SELECT_FIELDS = `
  id,
  parent_id,
  name,
  slug,
  image,
  description,
  status,
  created_at,
  updated_at
`;

async function findById(id) {
  const sql = `
    SELECT ${SELECT_FIELDS}
    FROM categories
    WHERE deleted_at IS NULL AND id = :id
    LIMIT 1
  `;
  const [rows] = await query(sql, { id });
  return rows[0] || null;
}

async function findAllFlat() {
  const sql = `
    SELECT ${SELECT_FIELDS}
    FROM categories
    WHERE deleted_at IS NULL
    ORDER BY parent_id IS NULL DESC, name ASC
  `;
  const [rows] = await query(sql);
  return rows;
}

/** Subcategories linked to parent_categorie.id */
async function countActiveChildren(parentId) {
  const sql = `
    SELECT COUNT(*) AS cnt
    FROM categories
    WHERE deleted_at IS NULL AND parent_id = :parentId
  `;
  const [rows] = await query(sql, { parentId });
  return Number(rows[0].cnt);
}

async function findChildren(parentId) {
  const sql = `
    SELECT ${SELECT_FIELDS}
    FROM categories
    WHERE deleted_at IS NULL AND parent_id = :parentId
    ORDER BY name ASC
  `;
  const [rows] = await query(sql, { parentId });
  return rows;
}

async function countSlugUnderParent(parentId, slug, excludeId = null) {
  const parentClause =
    parentId === null || parentId === undefined || parentId === ''
      ? 'parent_id IS NULL'
      : 'parent_id = :parent_id';

  let sql = `
    SELECT COUNT(*) AS cnt
    FROM categories
    WHERE deleted_at IS NULL AND slug = :slug AND ${parentClause}
  `;
  const params = { slug };
  if (parentId !== null && parentId !== undefined && parentId !== '') {
    params.parent_id = parentId;
  }
  if (excludeId) {
    sql += ' AND id <> :excludeId';
    params.excludeId = excludeId;
  }
  const [rows] = await query(sql, params);
  return Number(rows[0].cnt);
}

async function insertCategory(data) {
  const sql = `
    INSERT INTO categories (parent_id, name, slug, image, description, status)
    VALUES (:parent_id, :name, :slug, :image, :description, :status)
    ${driver === 'postgres' ? 'RETURNING id' : ''}
  `;
  const [, meta] = await query(sql, data);
  return meta.insertId;
}

async function updateCategory(id, data) {
  const sql = `
    UPDATE categories SET
      parent_id = :parent_id,
      name = :name,
      slug = :slug,
      image = :image,
      description = :description,
      status = :status
    WHERE id = :id AND deleted_at IS NULL
  `;
  const [, meta] = await query(sql, { ...data, id });
  return meta.affectedRows;
}

async function deleteById(id) {
  const sql = `DELETE FROM categories WHERE id = :id`;
  const [, meta] = await query(sql, { id });
  return meta.affectedRows;
}

/**
 * Returns IDs of all descendants for cycle detection when reparenting.
 */
async function getDescendantIds(rootId) {
  const collected = new Set();
  let frontier = [rootId];

  while (frontier.length) {
    const ph = frontier.map((_, i) => `:p${i}`).join(', ');
    const sql = `SELECT id FROM categories WHERE deleted_at IS NULL AND parent_id IN (${ph})`;
    const params = {};
    frontier.forEach((id, i) => {
      params[`p${i}`] = id;
    });
    const [rows] = await query(sql, params);
    frontier = [];
    for (const row of rows) {
      if (!collected.has(row.id)) {
        collected.add(row.id);
        frontier.push(row.id);
      }
    }
  }
  return [...collected];
}

module.exports = {
  findById,
  findAllFlat,
  findChildren,
  countActiveChildren,
  countSlugUnderParent,
  insertCategory,
  updateCategory,
  deleteById,
  getDescendantIds,
};
