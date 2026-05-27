const apiKeyService = require('../services/apiKey.service');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { createRules, revokeRules } = require('../validations/apiKey.validation');
const { validateRequest } = require('../middleware/validate');

const list = asyncHandler(async (req, res) => {
  const data = await apiKeyService.list(req.websiteId);
  return success(res, { data });
});

const create = [
  ...createRules,
  validateRequest,
  asyncHandler(async (req, res) => {
    const data = await apiKeyService.create(req.websiteId, req.body);
    return success(res, { message: 'API key created', data, status: 201 });
  }),
];

const revoke = [
  ...revokeRules,
  validateRequest,
  asyncHandler(async (req, res) => {
    await apiKeyService.revoke(req.websiteId, Number(req.params.id));
    return success(res, { message: 'API key revoked' });
  }),
];

module.exports = { list, create, revoke };
