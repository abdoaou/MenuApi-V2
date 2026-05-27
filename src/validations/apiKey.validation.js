const { body, param } = require('express-validator');

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('scopes').optional().isArray(),
  body('expires_at').optional().isISO8601(),
];

const revokeRules = [param('id').isInt({ min: 1 })];

module.exports = { createRules, revokeRules };
