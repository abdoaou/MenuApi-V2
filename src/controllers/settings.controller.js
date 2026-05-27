const settingsService = require('../services/settings.service');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { upsertRules } = require('../validations/settings.validation');
const { validateRequest } = require('../middleware/validate');

const list = asyncHandler(async (req, res) => {
  const data = await settingsService.list(req.websiteId);
  return success(res, { data });
});

const get = asyncHandler(async (req, res) => {
  const data = await settingsService.get(req.websiteId, req.params.key);
  return success(res, { data });
});

const upsert = [
  ...upsertRules,
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = await settingsService.upsert(req.websiteId, req.params.key, req.body.value);
    return success(res, { message: 'Setting saved', data });
  }),
];

const remove = asyncHandler(async (req, res) => {
  await settingsService.remove(req.websiteId, req.params.key);
  return success(res, { message: 'Setting deleted' });
});

module.exports = { list, get, upsert, remove };
