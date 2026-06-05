const { query, driver } = require('../config/database');

const SELECT_FIELDS = `
  id,
  product_id,
  name,
  sku,
  price,
  sale_price,
  stock,
  attributes,
  status,
  created_at,
  updated_at
`;

async function findById(id) {
  const sql = `
    SELECT ${SELECT_FIELDS}
    FROM product_variants
    WHERE deleted_at IS NULL AND id = :id
    LIMIT 1
  `;
  const [rows] = await query(sql, { id });
  return rows[0] || null;
}

async function countBySku(productId, sku, excludeId = null) {
  if (!sku) return 0;
  let sql = `
    SELECT COUNT(*) AS cnt
    FROM product_variants
    WHERE deleted_at IS NULL AND product_id = :product_id AND sku = :sku
  `;
  const params = { product_id: productId, sku };
  if (excludeId) {
    sql += ' AND id <> :excludeId';
    params.excludeId = excludeId;
  }
  const [rows] = await query(sql, params);
  return Number(rows[0].cnt);
}

async function deleteByProductId(productId) {
  const sql = `DELETE FROM product_variants WHERE product_id = :product_id`;
  const [, meta] = await query(sql, { product_id: productId });
  return meta.affectedRows;
}

async function listAll(productId = null) {
  let sql = `
    SELECT ${SELECT_FIELDS}
    FROM product_variants
    WHERE deleted_at IS NULL
  `;
  const params = {};
  if (productId) {
    sql += ' AND product_id = :product_id';
    params.product_id = productId;
  }
  sql += ' ORDER BY id ASC';
  const [rows] = await query(sql, params);
  return rows;
}

async function insertVariant(data) {
  const sql = `
    INSERT INTO product_variants (
      product_id, name, sku, price, sale_price, stock, attributes, status
    )
    VALUES (
      :product_id, :name, :sku, :price, :sale_price, :stock, :attributes, :status
    )
    ${driver === 'postgres' ? 'RETURNING id' : ''}
  `;
  const [, meta] = await query(sql, data);
  return meta.insertId;
}

async function updateVariant(id, data) {
  const sql = `
    UPDATE product_variants SET
      product_id = :product_id,
      name = :name,
      sku = :sku,
      price = :price,
      sale_price = :sale_price,
      stock = :stock,
      attributes = :attributes,
      status = :status
    WHERE id = :id AND deleted_at IS NULL
  `;
  const [, meta] = await query(sql, { ...data, id });
  return meta.affectedRows;
}

async function deleteById(id) {
  const sql = `DELETE FROM product_variants WHERE id = :id`;
  const [, meta] = await query(sql, { id });
  return meta.affectedRows;
}

module.exports = {
  findById,
  listAll,
  countBySku,
  deleteByProductId,
  insertVariant,
  updateVariant,
  deleteById,
};
