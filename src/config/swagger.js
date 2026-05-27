const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Multi-Tenant Menu Management API',
      version: '1.0.0',
      description:
        'Production-ready REST API for multi-website menu management with JWT auth, RBAC, and public API keys.',
    },
    servers: [{ url: `http://localhost:${env.port}/api/v1`, description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
      schemas: {
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth' },
      { name: 'Public' },
      { name: 'Products' },
      { name: 'Categories' },
      { name: 'Menus' },
      { name: 'Settings' },
      { name: 'Websites' },
    ],
  },
  apis: ['./src/routes/*.js', './src/modules/**/*.js'],
};

const spec = swaggerJsdoc(options);

function mountSwagger(app) {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));
  app.get('/api/v1/docs.json', (_req, res) => res.json(spec));
}

module.exports = { mountSwagger, spec };
