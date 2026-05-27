const { body, param, query } = require('express-validator');

const loginRules = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.username) {
      throw new Error('Email or username is required');
    }
    return true;
  }),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
];

const refreshRules = [body('refreshToken').notEmpty().withMessage('refreshToken is required')];

module.exports = {
  loginRules,
  refreshRules,
};
