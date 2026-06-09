const parentCategoryModel = require('../models/parentCategory.model');
const categoryModel = require('../models/category.model');
const websiteModel = require('../models/website.model');
const { slugify, randomSuffix } = require('../utils/slug');
const { resolveImageFieldAsync } = require('../utils/resolveImage');
const { toDbStatus, formatParentRow } = require('../utils/parentCategoryStatus');

async function assertWebsite(websiteId) {
  const site = await websiteModel.findById(websiteId);
  if (!site) {
    const err = new Error('Website not found');
    err.statusCode = 404;
    throw err;
  }
}

async function ensureUniqueSlug(baseSlug, excludeId) {
  let slug = slugify(baseSlug) || 'category';
  for (let i = 0; i < 50; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const cnt = await parentCategoryModel.countBySlug(slug, excludeId);
    if (cnt === 0) return slug;
    slug = `${slugify(baseSlug)}-${randomSuffix()}`;
  }
  const err = new Error('Could not generate unique slug');
  err.statusCode = 500;
  throw err;
}

async function normalizeBody(merged, file, imageInput, imageFallback = null) {
  return {
    website_id: Number(merged.website_id) || 1,
    name: merged.name,
    slug: merged.slug,
    description: merged.description ?? null,
    status: toDbStatus(merged.status ?? 'active'),
    image: await resolveImageFieldAsync(imageInput, file, 'categories', imageFallback),
  };
}

async function getParentWithChildren(id) {
  const parent = await parentCategoryModel.findById(id);
  if (!parent) {
    const err = new Error('Parent category not found');
    err.statusCode = 404;
    throw err;
  }
  const children = await categoryModel.findChildren(id);
  return { ...formatParentRow(parent), children };
}

async function listParentCategories() {
  const rows = await parentCategoryModel.findAll();
  return rows.map(formatParentRow);
}

async function getParentCategoryById(id) {
  return getParentWithChildren(id);
}

async function createParentCategory(body, file) {
  const websiteId = Number(body.website_id) || 1;
  await assertWebsite(websiteId);

  const slug = await ensureUniqueSlug(body.slug || body.name, null);
  const payload = await normalizeBody({ ...body, website_id: websiteId, slug }, file, body, null);
  payload.slug = slug;

  const id = await parentCategoryModel.insert(payload);
  return getParentWithChildren(id);
}

async function updateParentCategory(id, body, file) {
  const existing = await parentCategoryModel.findById(id);
  if (!existing) {
    const err = new Error('Parent category not found');
    err.statusCode = 404;
    throw err;
  }

  const websiteId = body.website_id !== undefined ? Number(body.website_id) : existing.website_id;
  await assertWebsite(websiteId);

  const base = body.slug || body.name || existing.slug;
  let slug = existing.slug;
  if (body.slug || body.name) {
    slug = await ensureUniqueSlug(base, id);
  }

  const merged = { ...existing, ...body, website_id: websiteId, slug };
  const payload = await normalizeBody(merged, file, body, existing.image);

  const affected = await parentCategoryModel.update(id, payload);
  if (!affected) {
    const err = new Error('Parent category not found');
    err.statusCode = 404;
    throw err;
  }
  return getParentWithChildren(id);
}

async function removeParentCategory(id) {
  const existing = await parentCategoryModel.findById(id);
  if (!existing) {
    const err = new Error('Parent category not found');
    err.statusCode = 404;
    throw err;
  }

  const childCount = await categoryModel.countActiveChildren(id);
  if (childCount > 0) {
    const err = new Error(
      `Cannot delete parent category: ${childCount} subcategory(ies) exist. Delete or reassign them first.`
    );
    err.statusCode = 409;
    throw err;
  }

  const affected = await parentCategoryModel.deleteById(id);
  if (!affected) {
    const err = new Error('Parent category not found');
    err.statusCode = 404;
    throw err;
  }
}

module.exports = {
  listParentCategories,
  getParentCategoryById,
  createParentCategory,
  updateParentCategory,
  removeParentCategory,
};
