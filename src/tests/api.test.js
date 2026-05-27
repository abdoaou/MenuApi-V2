const request = require('supertest');
const app = require('../app');

describe('Health & root', () => {
  it('GET / returns API info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.version).toBe('v1');
    expect(res.body.docs).toBe('/api/v1/docs');
  });

  it('GET /api/v1/health returns status payload', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status);
    const body = res.body.data || res.body;
    expect(body).toHaveProperty('database');
  });
});

describe('Auth validation', () => {
  it('POST /api/v1/auth/login rejects missing credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login rejects short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Public API', () => {
  it('GET /api/v1/public/products requires API key', async () => {
    const res = await request(app).get('/api/v1/public/products');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/API key/i);
  });
});

describe('Protected routes', () => {
  it('POST /api/v1/menus requires JWT', async () => {
    const res = await request(app).post('/api/v1/menus').send({ name: 'Breakfast' });
    expect(res.status).toBe(401);
  });
});

describe('Swagger', () => {
  it('GET /api/v1/docs.json returns OpenAPI spec', async () => {
    const res = await request(app).get('/api/v1/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toMatch(/Menu Management/i);
  });
});

describe('404 handler', () => {
  it('returns standardized error for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
