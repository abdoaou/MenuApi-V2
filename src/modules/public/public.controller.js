const publicMenuService = require('../../services/publicMenu.service');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');

const products = asyncHandler(async (req, res) => {
  const data = await publicMenuService.getProducts(req.websiteId, req.query);
  return success(res, { data });
});

const categories = asyncHandler(async (req, res) => {
  const data = await publicMenuService.getCategories(req.websiteId);
  return success(res, { data });
});

const menu = asyncHandler(async (req, res) => {
  const data = await publicMenuService.getMenu(req.websiteId, req.params.slug);
  return success(res, { data });
});

const settings = asyncHandler(async (req, res) => {
  const data = await publicMenuService.getSettings(req.websiteId);
  return success(res, { data });
});

module.exports = { products, categories, menu, settings };
