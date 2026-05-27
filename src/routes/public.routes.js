const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateApiKey } = require('../middlewares/apiKey');
const publicController = require('../modules/public/public.controller');

const router = express.Router();

const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: Number(process.env.PUBLIC_RATE_LIMIT_MAX) || 120,
  message: { success: false, message: 'Too many requests' },
});

router.use(publicLimiter, authenticateApiKey);

router.get('/products', publicController.products);
router.get('/categories', publicController.categories);
router.get('/menus/:slug', publicController.menu);
router.get('/settings', publicController.settings);

module.exports = router;
