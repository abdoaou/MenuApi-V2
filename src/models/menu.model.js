const { query, driver } = require('../config/database');

async function findById(id, websiteId = null) {
  let sql = `
    SELECT id, website_id, name, slug, description, sort_order, is_active, created_at, updated_at
    FROM menus
    WHERE deleted_at IS NULL AND id = :id
  `;
  const params = { id };
  if (websiteId != null) {
    sql += ' AND website_id = :websiteId';
    params.websiteId = websiteId;
  }
  sql += ' LIMIT 1';
  const [rows] = await query(sql, params);
  return rows[0] || null;
}

async function findBySlug(websiteId, slug, excludeId = null) {
  let sql = `
    SELECT id, website_id, name, slug, description, sort_order, is_active, created_at, updated_at
    FROM menus
    WHERE deleted_at IS NULL AND website_id = :websiteId AND slug = :slug
  `;
  const params = { websiteId, slug };
  if (excludeId) {
    sql += ' AND id <> :excludeId';
    params.excludeId = excludeId;
  }
  sql += ' LIMIT 1';
  const [rows] = await query(sql, params);
  return rows[0] || null;
}

async function listByWebsite(websiteId, { page = 1, limit = 50, is_active } = {}) {
  const where = ['deleted_at IS NULL', 'website_id = :websiteId'];
  const params = { websiteId };
  if (is_active !== undefined && is_active !== '') {
    where.push('is_active = :is_active');
    params.is_active = is_active === 'true' || is_active === true;
  }
  const whereSql = where.join(' AND ');
  const offset = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const lim = Math.min(100, Math.max(1, limit));

  const [countRows] = await query(`SELECT COUNT(*) AS cnt FROM menus WHERE ${whereSql}`, params);
  const total = Number(countRows[0].cnt);

  const [rows] = await query(
    `
    SELECT id, website_id, name, slug, description, sort_order, is_active, created_at, updated_at
    FROM menus WHERE ${whereSql}
    ORDER BY sort_order ASC, id ASC
    LIMIT :lim OFFSET :offset
    `,
    { ...params, lim, offset }
  );
  return { rows, total };
}

async function insert(data) {
  const sql = `
    INSERT INTO menus (website_id, name, slug, description, sort_order, is_active)
    VALUES (:website_id, :name, :slug, :description, :sort_order, :is_active)
    ${driver === 'postgres' ? 'RETURNING id' : ''}
  `;
  const [, meta] = await query(sql, data);
  return meta.insertId;
}

async function update(id, websiteId, data) {
  const sql = `
    UPDATE menus SET
      name = :name,
      slug = :slug,
      description = :description,
      sort_order = :sort_order,
      is_active = :is_active
    WHERE id = :id AND website_id = :websiteId AND deleted_at IS NULL
  `;
  const [, meta] = await query(sql, { ...data, id, websiteId });
  return meta.affectedRows;
}

async function softDelete(id, websiteId) {
  const sql = `
    UPDATE menus SET deleted_at = NOW()
    WHERE id = :id AND website_id = :websiteId AND deleted_at IS NULL
  `;
  const [, meta] = await query(sql, { id, websiteId });
  return meta.affectedRows;
}

async function listItems(menuId) {
  const sql = `
    SELECT mi.id, mi.menu_id, mi.product_id, mi.category_id, mi.label, mi.sort_order, mi.is_featured,
           p.name AS product_name, p.slug AS product_slug, p.price, p.image AS product_image
    FROM menu_items mi
    LEFT JOIN products p ON p.id = mi.product_id AND p.deleted_at IS NULL
    WHERE mi.deleted_at IS NULL AND mi.menu_id = :menuId
    ORDER BY mi.sort_order ASC, mi.id ASC
  `;
  const [rows] = await query(sql, { menuId });
  return rows;
}

async function insertItem(data) {
  const sql = `
    INSERT INTO menu_items (menu_id, product_id, category_id, label, sort_order, is_featured)
    VALUES (:menu_id, :product_id, :category_id, :label, :sort_order, :is_featured)
    ${driver === 'postgres' ? 'RETURNING id' : ''}
  `;
  const [, meta] = await query(sql, data);
  return meta.insertId;
}

async function deleteItem(itemId, menuId) {
  const sql = `
    UPDATE menu_items SET deleted_at = NOW()
    WHERE id = :itemId AND menu_id = :menuId AND deleted_at IS NULL
  `;
  const [, meta] = await query(sql, { itemId, menuId });
  return meta.affectedRows;
}

module.exports = {
  findById,
  findBySlug,
  listByWebsite,
  insert,
  update,
  softDelete,
  listItems,
  insertItem,
  deleteItem,
};
