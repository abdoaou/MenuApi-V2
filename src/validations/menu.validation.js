const { body, param, query } = require('express-validator');

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('slug').optional().trim().isLength({ max: 191 }),
  body('description').optional().trim(),
  body('sort_order').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean(),
];

const updateRules = [
  param('id').isInt({ min: 1 }),
  body('name').optional().trim().notEmpty(),
  body('slug').optional().trim().isLength({ max: 191 }),
  body('sort_order').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean(),
];

const itemRules = [
  param('id').isInt({ min: 1 }),
  body('product_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('category_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('label').optional().trim(),
  body('sort_order').optional().isInt({ min: 0 }),
  body('is_featured').optional().isBoolean(),
];

const listRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = { createRules, updateRules, itemRules, listRules };
