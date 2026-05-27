const productModel = require('../models/product.model');
const categoryModel = require('../models/category.model');
const menuService = require('./menu.service');
const settingsModel = require('../models/settings.model');
const cache = require('../utils/cache');
const env = require('../config/env');
const { buildPaginationMeta } = require('../utils/pagination');

async function getProducts(websiteId, query) {
  const cacheKey = cache.tenantCacheKey(
    websiteId,
    `products:${JSON.stringify(query)}`
  );
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const filters = {
    ...query,
    website_id: websiteId,
    status: 'active',
    page: query.page || 1,
    limit: query.limit || 20,
  };
  const result = await productModel.findAllPaginated(filters);
  const meta = buildPaginationMeta({
    page: filters.page,
    limit: filters.limit,
    total: result.total,
  });
  const payload = { items: result.rows, pagination: meta };
  await cache.set(cacheKey, payload, env.cache.menuTtlSeconds);
  return payload;
}

async function getCategories(websiteId) {
  const cacheKey = cache.tenantCacheKey(websiteId, 'categories:tree');
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const flat = await categoryModel.findAllFlat();
  const filtered = flat.filter((c) => !c.website_id || Number(c.website_id) === Number(websiteId));
  await cache.set(cacheKey, filtered, env.cache.menuTtlSeconds);
  return filtered;
}

async function getMenu(websiteId, slug) {
  return menuService.getPublicMenu(websiteId, slug);
}

async function getSettings(websiteId) {
  const cacheKey = cache.tenantCacheKey(websiteId, 'settings');
  const cached = await cache.get(cacheKey);
  if (cached) return cached;
  const rows = await settingsModel.listAll(websiteId);
  const map = rows.reduce((acc, r) => {
    acc[r.setting_key] = r.setting_value;
    return acc;
  }, {});
  await cache.set(cacheKey, map, env.cache.menuTtlSeconds);
  return map;
}

module.exports = { getProducts, getCategories, getMenu, getSettings };
