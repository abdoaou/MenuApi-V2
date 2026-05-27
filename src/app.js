const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const env = require('./config/env');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { enforceHttps } = require('./middlewares/httpsEnforce');
const { requestLogger } = require('./middlewares/requestLogger');
const { sanitizeBody } = require('./utils/sanitize');
const { mountSwagger } = require('./config/swagger');

const app = express();

app.set('trust proxy', 1);

app.use(enforceHttps);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: false,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.use(compression());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeBody);
app.use(requestLogger);

mountSwagger(app);

const uploadsRoot = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsRoot));

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Multi-Tenant Menu Management API is running',
    version: 'v1',
    docs: '/api/v1/docs',
    health: '/api/v1/health',
    endpoints: {
      public: '/api/v1/public/* (x-api-key required)',
      products: '/api/v1/products',
      categories: '/api/v1/categories',
      parentCategories: '/api/v1/parent-categories',
      websites: '/api/v1/websites',
      admins: '/api/v1/admins',
      menus: '/api/v1/menus',
      settings: '/api/v1/settings',
      apiKeys: '/api/v1/api-keys',
      productVariants: '/api/v1/product-variants',
      login: 'POST /api/v1/auth/login',
      refresh: 'POST /api/v1/auth/refresh',
    },
  });
});

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
