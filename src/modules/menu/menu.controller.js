const menuService = require('../../services/menu.service');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const { buildPaginationMeta } = require('../../utils/pagination');
const { createRules, updateRules, itemRules, listRules } = require('../../validations/menu.validation');
const { validateRequest } = require('../../middleware/validate');

const list = [
  ...listRules,
  validateRequest,
  asyncHandler(async (req, res) => {
    const { rows, total } = await menuService.list(req.websiteId, req.query);
    return success(res, {
      data: { items: rows, pagination: buildPaginationMeta({ ...req.query, total }) },
    });
  }),
];

const getById = [
  asyncHandler(async (req, res) => {
    const data = await menuService.getById(req.websiteId, Number(req.params.id));
    return success(res, { data });
  }),
];

const create = [
  ...createRules,
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = await menuService.create(req.websiteId, req.body);
    return success(res, { message: 'Menu created', data, status: 201 });
  }),
];

const update = [
  ...updateRules,
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = await menuService.update(req.websiteId, Number(req.params.id), req.body);
    return success(res, { message: 'Menu updated', data });
  }),
];

const remove = [
  asyncHandler(async (req, res) => {
    await menuService.remove(req.websiteId, Number(req.params.id));
    return success(res, { message: 'Menu deleted' });
  }),
];

const addItem = [
  ...itemRules,
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = await menuService.addItem(req.websiteId, Number(req.params.id), req.body);
    return success(res, { message: 'Menu item added', data, status: 201 });
  }),
];

const removeItem = [
  asyncHandler(async (req, res) => {
    await menuService.removeItem(req.websiteId, Number(req.params.id), Number(req.params.itemId));
    return success(res, { message: 'Menu item removed' });
  }),
];

module.exports = { list, getById, create, update, remove, addItem, removeItem };
