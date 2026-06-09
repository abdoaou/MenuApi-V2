const { body, param } = require('express-validator');

const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid id')];

const createRules = [
  body('username').isLength({ min: 2, max: 80 }).withMessage('Invalid username'),
  body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('website_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
];

const updateRules = [
  ...idParam,
  body('username').optional().isLength({ min: 2, max: 80 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('website_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
];

module.exports = {
  createRules,
  updateRules,
  getByIdRules: idParam,
  deleteRules: idParam,
};
