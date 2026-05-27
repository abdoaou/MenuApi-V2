const { body, param } = require('express-validator');

const upsertRules = [
  param('key').trim().notEmpty().isLength({ max: 120 }),
  body('value').exists().withMessage('value is required'),
];

module.exports = { upsertRules };
