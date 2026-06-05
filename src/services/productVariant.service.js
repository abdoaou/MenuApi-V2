const productVariantModel = require('../models/productVariant.model');
const productModel = require('../models/product.model');
const { slugify, randomSuffix } = require('../utils/slug');
const { toNumber } = require('../utils/numbers');

function normalizeSku(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

async function assertProduct(productId) {
  const product = await productModel.findById(productId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  return product;
}

async function ensureVariantSku(productId, productSku, variantName, proposedSku, excludeId = null) {
  let sku = normalizeSku(proposedSku);
  const base = slugify(variantName) || 'size';

  if (!sku) {
    sku = productSku ? `${normalizeSku(productSku)}-${base}` : `${productId}-${base}`;
  }

  for (let i = 0; i < 50; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const cnt = await productVariantModel.countBySku(productId, sku, excludeId);
    if (cnt === 0) return sku;
    sku = `${sku}-${randomSuffix()}`;
  }

  const err = new Error('Could not generate unique variant SKU');
  err.statusCode = 500;
  throw err;
}

async function listVariants(query = {}) {
  const productId = query.product_id ? Number(query.product_id) : null;
  if (productId) await assertProduct(productId);
  return productVariantModel.listAll(productId);
}

async function getVariantById(id) {
  const row = await productVariantModel.findById(id);
  if (!row) {
    const err = new Error('Product variant not found');
    err.statusCode = 404;
    throw err;
  }
  return row;
}

function normalizeAttributes(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      const err = new Error('attributes must be valid JSON');
      err.statusCode = 400;
      throw err;
    }
  }
  return null;
}

function normalizeVariantInput(item, product) {
  const name = String(item.name || item.size || item.label || 'Size').trim();
  if (name.length < 2) {
    const err = new Error('Each size/variant needs a name (min 2 characters)');
    err.statusCode = 400;
    throw err;
  }

  const hasPrice = item.price !== undefined && item.price !== null && item.price !== '';
  const hasSale = item.sale_price !== undefined && item.sale_price !== null && item.sale_price !== '';

  return {
    id: item.id ? Number(item.id) : null,
    name,
    proposedSku: item.sku,
    price: hasPrice ? toNumber(item.price, null) : toNumber(product.price, null),
    sale_price: hasSale ? toNumber(item.sale_price, null) : null,
    stock: toNumber(item.stock, 0),
    attributes: normalizeAttributes(item.attributes ?? item.size_attributes),
    status: item.status || 'active',
  };
}

async function createVariant(body) {
  const product = await assertProduct(body.product_id);
  const sku = await ensureVariantSku(
    body.product_id,
    product.sku,
    body.name,
    body.sku,
    null
  );

  const id = await productVariantModel.insertVariant({
    product_id: body.product_id,
    name: body.name.trim(),
    sku,
    price: toNumber(body.price, null),
    sale_price: toNumber(body.sale_price, null),
    stock: toNumber(body.stock, 0),
    attributes: normalizeAttributes(body.attributes),
    status: body.status || 'active',
  });
  return getVariantById(id);
}

async function updateVariant(id, body) {
  const existing = await getVariantById(id);
  const productId = body.product_id !== undefined ? body.product_id : existing.product_id;
  const product = await assertProduct(productId);

  const name = body.name !== undefined ? body.name.trim() : existing.name;
  const sku = await ensureVariantSku(
    productId,
    product.sku,
    name,
    body.sku !== undefined ? body.sku : existing.sku,
    id
  );

  const affected = await productVariantModel.updateVariant(id, {
    product_id: productId,
    name,
    sku,
    price: body.price !== undefined ? toNumber(body.price, existing.price) : existing.price,
    sale_price:
      body.sale_price !== undefined ? toNumber(body.sale_price, null) : existing.sale_price,
    stock: body.stock !== undefined ? toNumber(body.stock, existing.stock) : existing.stock,
    attributes:
      body.attributes !== undefined ? normalizeAttributes(body.attributes) : existing.attributes,
    status: body.status !== undefined ? body.status : existing.status,
  });

  if (!affected) {
    const err = new Error('Product variant not found');
    err.statusCode = 404;
    throw err;
  }
  return getVariantById(id);
}

async function removeVariant(id) {
  const affected = await productVariantModel.deleteById(id);
  if (!affected) {
    const err = new Error('Product variant not found');
    err.statusCode = 404;
    throw err;
  }
}

/**
 * Upsert sizes: update by id when provided, insert new, remove missing when replace=true.
 */
async function syncVariantsForProduct(productId, items, { replace = false } = {}) {
  const product = await assertProduct(productId);
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    return productVariantModel.listAll(productId);
  }

  const existingList = await productVariantModel.listAll(productId);
  const existingById = new Map(existingList.map((row) => [Number(row.id), row]));
  const keptIds = new Set();
  const usedSkus = new Set();
  const results = [];

  for (const raw of list) {
    const item = normalizeVariantInput(raw, product);
    const variantId = item.id;

    if (variantId && existingById.has(variantId)) {
      const ex = existingById.get(variantId);
      let sku = ex.sku;
      if (item.proposedSku !== undefined && normalizeSku(item.proposedSku) !== null) {
        sku = await ensureVariantSku(productId, product.sku, item.name, item.proposedSku, variantId);
      }
      while (usedSkus.has(sku)) {
        sku = `${sku}-${randomSuffix()}`;
      }
      usedSkus.add(sku);
      keptIds.add(variantId);

      // eslint-disable-next-line no-await-in-loop
      await productVariantModel.updateVariant(variantId, {
        product_id: productId,
        name: item.name,
        sku,
        price: item.price,
        sale_price: item.sale_price,
        stock: item.stock,
        attributes: item.attributes,
        status: item.status,
      });
      // eslint-disable-next-line no-await-in-loop
      results.push(await getVariantById(variantId));
      continue;
    }

    let sku = await ensureVariantSku(productId, product.sku, item.name, item.proposedSku, null);
    while (usedSkus.has(sku)) {
      sku = `${sku}-${randomSuffix()}`;
    }
    usedSkus.add(sku);

    // eslint-disable-next-line no-await-in-loop
    const newId = await productVariantModel.insertVariant({
      product_id: productId,
      name: item.name,
      sku,
      price: item.price,
      sale_price: item.sale_price,
      stock: item.stock,
      attributes: item.attributes,
      status: item.status,
    });
    keptIds.add(Number(newId));
    // eslint-disable-next-line no-await-in-loop
    results.push(await getVariantById(newId));
  }

  if (replace) {
    for (const ex of existingList) {
      if (!keptIds.has(Number(ex.id))) {
        // eslint-disable-next-line no-await-in-loop
        await productVariantModel.deleteById(ex.id);
      }
    }
  }

  return results;
}

module.exports = {
  listVariants,
  getVariantById,
  createVariant,
  updateVariant,
  removeVariant,
  syncVariantsForProduct,
};
