const { query, driver } = require('../config/database');

const SELECT_FIELDS = `
  id,
  website_id,
  category_id,
  parent_category_id,
  name,
  slug,
  description,
  short_description,
  price,
  sale_price,
  stock,
  sku,
  image,
  status,
  featured,
  availability,
  created_at,
  updated_at
`;

async function countByWebsiteSlug(websiteId, slug, excludeId = null) {
  let sql = `
    SELECT COUNT(*) AS cnt
    FROM products
    WHERE deleted_at IS NULL AND website_id = :websiteId AND slug = :slug
  `;
  const params = { websiteId, slug };
  if (excludeId) {
    sql += ' AND id <> :excludeId';
    params.excludeId = excludeId;
  }
  const [rows] = await query(sql, params);
  return Number(rows[0].cnt);
}

async function findById(id) {
  const sql = `
    SELECT ${SELECT_FIELDS}
    FROM products
    WHERE deleted_at IS NULL AND id = :id
    LIMIT 1
  `;
  const [rows] = await query(sql, { id });
  return rows[0] || null;
}

async function findAllPaginated(filters) {
  const {
    page = 1,
    limit = 10,
    search,
    website_id,
    category_id,
    parent_category_id,
    status,
    featured,
    min_price,
    max_price,
    availability,
    sort = 'created_at',
    order = 'DESC',
  } = filters;

  const allowedSort = new Set(['created_at', 'updated_at', 'name', 'price', 'stock', 'featured', 'status']);
  const sortCol = allowedSort.has(sort) ? sort : 'created_at';
  const sortDir = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const where = ['deleted_at IS NULL'];
  const params = {};

  if (search) {
    where.push(
      '(name LIKE :search OR sku LIKE :search OR short_description LIKE :search OR description LIKE :search)'
    );
    params.search = `%${search}%`;
  }
  if (website_id !== undefined && website_id !== null && website_id !== '') {
    where.push('website_id = :website_id');
    params.website_id = website_id;
  }
  if (category_id !== undefined && category_id !== null && category_id !== '') {
    where.push('category_id = :category_id');
    params.category_id = category_id;
  }
  if (parent_category_id !== undefined && parent_category_id !== null && parent_category_id !== '') {
    where.push('parent_category_id = :parent_category_id');
    params.parent_category_id = parent_category_id;
  }
  if (status) {
    where.push('status = :status');
    params.status = status;
  }
  if (featured !== undefined && featured !== null && featured !== '') {
    where.push('featured = :featured');
    const on =
      featured === true || featured === 1 || featured === '1' || featured === 'true';
    params.featured = on;
  }
  if (min_price !== undefined && min_price !== null && min_price !== '') {
    where.push('price >= :min_price');
    params.min_price = min_price;
  }
  if (max_price !== undefined && max_price !== null && max_price !== '') {
    where.push('price <= :max_price');
    params.max_price = max_price;
  }
  if (availability) {
    where.push('availability = :availability');
    params.availability = availability;
  }

  const whereSql = where.join(' AND ');
  const offset = (Number(page) - 1) * Number(limit);

  const countSql = `SELECT COUNT(*) AS total FROM products WHERE ${whereSql}`;
  const [countRows] = await query(countSql, params);
  const total = Number(countRows[0].total);

  const listSql = `
    SELECT ${SELECT_FIELDS}
    FROM products
    WHERE ${whereSql}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT :limit OFFSET :offset
  `;
  const [rows] = await query(listSql, { ...params, limit: Number(limit), offset });

  return { rows, total };
}

async function insertProduct(data) {
  const sql = `
    INSERT INTO products (
      website_id, category_id, parent_category_id, name, slug, description, short_description,
      price, sale_price, stock, sku, image, status, featured
    ) VALUES (
      :website_id, :category_id, :parent_category_id, :name, :slug, :description, :short_description,
      :price, :sale_price, :stock, :sku, :image, :status, :featured
    )
    ${driver === 'postgres' ? 'RETURNING id' : ''}
  `;
  const [, meta] = await query(sql, data);
  return meta.insertId;
}

async function updateProduct(id, data) {
  const sql = `
    UPDATE products SET
      website_id = :website_id,
      category_id = :category_id,
      parent_category_id = :parent_category_id,
      name = :name,
      slug = :slug,
      description = :description,
      short_description = :short_description,
      price = :price,
      sale_price = :sale_price,
      stock = :stock,
      sku = :sku,
      image = :image,
      status = :status,
      featured = :featured
    WHERE id = :id AND deleted_at IS NULL
  `;
  const [, meta] = await query(sql, { ...data, id });
  return meta.affectedRows;
}

async function deleteById(id) {
  const sql = `DELETE FROM products WHERE id = :id`;
  const [, meta] = await query(sql, { id });
  return meta.affectedRows;
}

module.exports = {
  findById,
  findAllPaginated,
  insertProduct,
  updateProduct,
  deleteById,
  countByWebsiteSlug,
};
