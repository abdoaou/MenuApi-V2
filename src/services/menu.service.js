const menuModel = require('../models/menu.model');
const { slugify } = require('../utils/slug');
const cache = require('../utils/cache');
const env = require('../config/env');

async function list(websiteId, query) {
  return menuModel.listByWebsite(websiteId, query);
}

async function getById(websiteId, id) {
  const menu = await menuModel.findById(id, websiteId);
  if (!menu) {
    const err = new Error('Menu not found');
    err.statusCode = 404;
    throw err;
  }
  const items = await menuModel.listItems(id);
  return { ...menu, items };
}

async function create(websiteId, body) {
  const slug = body.slug || slugify(body.name);
  const existing = await menuModel.findBySlug(websiteId, slug);
  if (existing) {
    const err = new Error('Menu slug already exists');
    err.statusCode = 409;
    throw err;
  }
  const id = await menuModel.insert({
    website_id: websiteId,
    name: body.name,
    slug,
    description: body.description || null,
    sort_order: body.sort_order ?? 0,
    is_active: body.is_active !== false,
  });
  await cache.delByPrefix(`tenant:${websiteId}:menu`);
  return getById(websiteId, id);
}

async function update(websiteId, id, body) {
  const menu = await menuModel.findById(id, websiteId);
  if (!menu) {
    const err = new Error('Menu not found');
    err.statusCode = 404;
    throw err;
  }
  const slug = body.slug || menu.slug;
  if (slug !== menu.slug) {
    const dup = await menuModel.findBySlug(websiteId, slug, id);
    if (dup) {
      const err = new Error('Menu slug already exists');
      err.statusCode = 409;
      throw err;
    }
  }
  await menuModel.update(id, websiteId, {
    name: body.name ?? menu.name,
    slug,
    description: body.description ?? menu.description,
    sort_order: body.sort_order ?? menu.sort_order,
    is_active: body.is_active ?? menu.is_active,
  });
  await cache.delByPrefix(`tenant:${websiteId}:menu`);
  return getById(websiteId, id);
}

async function remove(websiteId, id) {
  const affected = await menuModel.softDelete(id, websiteId);
  if (!affected) {
    const err = new Error('Menu not found');
    err.statusCode = 404;
    throw err;
  }
  await cache.delByPrefix(`tenant:${websiteId}:menu`);
}

async function addItem(websiteId, menuId, body) {
  const menu = await menuModel.findById(menuId, websiteId);
  if (!menu) {
    const err = new Error('Menu not found');
    err.statusCode = 404;
    throw err;
  }
  const itemId = await menuModel.insertItem({
    menu_id: menuId,
    product_id: body.product_id || null,
    category_id: body.category_id || null,
    label: body.label || null,
    sort_order: body.sort_order ?? 0,
    is_featured: Boolean(body.is_featured),
  });
  await cache.del(cache.tenantCacheKey(websiteId, `menu:${menu.slug}`));
  return { id: itemId };
}

async function removeItem(websiteId, menuId, itemId) {
  const menu = await menuModel.findById(menuId, websiteId);
  if (!menu) {
    const err = new Error('Menu not found');
    err.statusCode = 404;
    throw err;
  }
  const affected = await menuModel.deleteItem(itemId, menuId);
  if (!affected) {
    const err = new Error('Menu item not found');
    err.statusCode = 404;
    throw err;
  }
  await cache.delByPrefix(`tenant:${websiteId}:menu`);
}

async function getPublicMenu(websiteId, slug) {
  const cacheKey = cache.tenantCacheKey(websiteId, `menu:${slug}`);
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const m = await menuModel.findBySlug(websiteId, slug);
  if (!m || !m.is_active) {
    const err = new Error('Menu not found');
    err.statusCode = 404;
    throw err;
  }
  const items = await menuModel.listItems(m.id);
  const found = { ...m, items };

  await cache.set(cacheKey, found, env.cache.menuTtlSeconds);
  return found;
}

module.exports = { list, getById, create, update, remove, addItem, removeItem, getPublicMenu };
