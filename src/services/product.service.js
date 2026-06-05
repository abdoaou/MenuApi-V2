const productModel = require('../models/product.model');
const productVariantService = require('./productVariant.service');
const websiteModel = require('../models/website.model');
const categoryModel = require('../models/category.model');
const parentCategoryModel = require('../models/parentCategory.model');
const { slugify, randomSuffix } = require('../utils/slug');
const { resolveImageField } = require('../utils/resolveImage');
const { parseVariantList, hasVariantListField } = require('../utils/parseVariantList');

function productFileUrl(file) {
  if (!file) return null;
  return `/uploads/products/${file.filename}`;
}

function paginationMeta({ page, limit, total }) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 10));
  return {
    page: p,
    limit: l,
    total,
    totalPages: Math.ceil(total / l) || 0,
  };
}

async function assertWebsite(id) {
  const site = await websiteModel.findById(id);
  if (!site) {
    const err = new Error('Website not found');
    err.statusCode = 404;
    throw err;
  }
}

async function assertCategory(id) {
  if (id === null || id === undefined || id === '') {
    return;
  }
  const cat = await categoryModel.findById(id);
  if (!cat) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }
}

async function assertParentCategory(id) {
  if (id === null || id === undefined || id === '') {
    return;
  }
  const parent = await parentCategoryModel.findById(id);
  if (!parent) {
    const err = new Error('Parent category not found');
    err.statusCode = 404;
    throw err;
  }
}

async function ensureUniqueProductSlug(websiteId, baseSlug, excludeId) {
  let slug = slugify(baseSlug) || 'product';
  for (let i = 0; i < 50; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const cnt = await productModel.countByWebsiteSlug(websiteId, slug, excludeId);
    if (cnt === 0) return slug;
    slug = `${slugify(baseSlug)}-${randomSuffix()}`;
  }
  const err = new Error('Could not generate unique slug');
  err.statusCode = 500;
  throw err;
}

async function listProducts(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

  let featured = query.featured;
  if (featured === 'true' || featured === '1') {
    featured = true;
  } else if (featured === 'false' || featured === '0') {
    featured = false;
  } else {
    featured = '';
  }

  const { rows, total } = await productModel.findAllPaginated({
    page,
    limit,
    search: query.search,
    website_id: query.website_id,
    category_id: query.category_id,
    parent_category_id: query.parent_category_id,
    status: query.status,
    featured,
    min_price: query.min_price,
    max_price: query.max_price,
    sort: query.sort,
    order: query.order,
  });

  return {
    items: rows,
    meta: paginationMeta({ page, limit, total }),
  };
}

async function getProductById(id, { includeVariants = false } = {}) {
  const product = await productModel.findById(id);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  if (!includeVariants) {
    return product;
  }
  const variants = await productVariantService.listVariants({ product_id: id });
  return { ...product, variants };
}

function asBoolInt(value, defaultValue = 0) {
  if (value === undefined || value === null || value === '') {
    return defaultValue ? 1 : 0;
  }
  const truthy = value === true || value === 1 || value === '1' || value === 'true';
  return truthy ? 1 : 0;
}

function normalizePayload(merged, file, imageInput, imageFallback = null) {
  return {
    website_id: merged.website_id,
    category_id: merged.category_id === '' ? null : merged.category_id ?? null,
    parent_category_id: merged.parent_category_id === '' ? null : merged.parent_category_id ?? null,
    name: merged.name,
    slug: merged.slug,
    description: merged.description ?? null,
    short_description: merged.short_description ?? null,
    price: merged.price,
    sale_price: merged.sale_price === '' ? null : merged.sale_price ?? null,
    stock: merged.stock,
    sku: merged.sku,
    image: resolveImageField(imageInput, file, productFileUrl, imageFallback),
    status: merged.status ?? 'draft',
    featured: asBoolInt(merged.featured, false),
  };
}

async function createProduct(body, file) {
  await assertWebsite(body.website_id);
  await assertCategory(body.category_id);
  await assertParentCategory(body.parent_category_id);

  const base = body.slug || body.name;
  const slug = await ensureUniqueProductSlug(body.website_id, base, null);

  const payload = normalizePayload(body, file, body, null);
  payload.slug = slug;

  const id = await productModel.insertProduct(payload);
  const variants = parseVariantList(body);
  if (variants?.length) {
    await productVariantService.syncVariantsForProduct(id, variants, { replace: false });
  }
  return getProductById(id, { includeVariants: true });
}

async function updateProduct(id, body, file) {
  const existing = await getProductById(id);
  const { variants: _variants, sizes: _sizes, ...productFields } = body;

  await assertWebsite(productFields.website_id ?? existing.website_id);
  await assertCategory(
    productFields.category_id !== undefined ? productFields.category_id : existing.category_id
  );
  await assertParentCategory(
    productFields.parent_category_id !== undefined
      ? productFields.parent_category_id
      : existing.parent_category_id
  );

  const websiteId = productFields.website_id ?? existing.website_id;
  const base = productFields.slug || productFields.name || existing.slug;
  let slug = existing.slug;
  if (productFields.slug || productFields.name) {
    slug = await ensureUniqueProductSlug(websiteId, base, id);
  }

  const merged = { ...existing, ...productFields };
  delete merged.variants;
  const payload = normalizePayload(merged, file, productFields, existing.image);
  payload.slug = slug;

  const affected = await productModel.updateProduct(id, payload);
  if (!affected) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  const variantsInput = parseVariantList(body);
  if (hasVariantListField(body) && variantsInput && variantsInput.length > 0) {
    await productVariantService.syncVariantsForProduct(id, variantsInput, { replace: true });
  }

  return getProductById(id, { includeVariants: true });
}

async function removeProduct(id) {
  const affected = await productModel.deleteById(id);
  if (!affected) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  removeProduct,
};
