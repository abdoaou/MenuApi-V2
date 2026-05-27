# Multi-Tenant Menu Management API

Production-ready **Express** REST API for SaaS-style multi-website menu management with **Supabase PostgreSQL**, **JWT + refresh tokens**, **RBAC**, **tenant isolation**, **public API keys**, **Redis/in-memory caching**, **Swagger docs**, **Jest tests**, and **Docker/CI** deployment.

## Requirements coverage

| Area | Status |
|------|--------|
| Node.js + Express + Supabase PostgreSQL | ✅ |
| Clean architecture (controllers, services, repositories, middleware, validators, routes) | ✅ |
| Multi-tenant isolation (`x-website-id`, API keys) | ✅ |
| JWT auth + refresh tokens + bcrypt | ✅ |
| RBAC (Super Admin, Website Admin, Editor, Viewer) | ✅ |
| CRUD: products, categories, parent categories, websites, menus, settings | ✅ |
| Menu sections + menu items | ✅ |
| Public read-only endpoints (`/api/v1/public/*`) | ✅ |
| Image upload + Supabase Storage + Sharp optimization | ✅ |
| Redis or in-memory caching | ✅ |
| Search, filter, pagination | ✅ |
| Centralized error handling + validation | ✅ |
| Security (Helmet, CORS, rate limit, sanitize, HTTPS option) | ✅ |
| API versioning `/api/v1/` | ✅ |
| Swagger/OpenAPI at `/api/v1/docs` | ✅ |
| Soft deletes, indexes, migrations | ✅ |
| Logging + health check | ✅ |
| Jest + Supertest | ✅ |
| Docker + GitHub Actions CI | ✅ |

## Quick start

1. `npm install`
2. Copy `.env.example` → `.env` and configure Supabase credentials
3. Run SQL in order:
   - `database/schema.postgres.sql`
   - `database/migrations/002_multi_tenant_menu_system.postgres.sql`
4. `npm start` → `http://localhost:3000`
5. Docs: `http://localhost:3000/api/v1/docs`

## Database migration (required for new features)

After the base schema, run:

```sql
-- database/migrations/002_multi_tenant_menu_system.postgres.sql
```

This adds: roles/permissions, refresh tokens, API keys, menus, settings, logs, tenant fields.

## Authentication

```http
POST /api/v1/auth/login
{ "username": "admin", "password": "Admin@123" }
```

Response includes `accessToken`, `refreshToken`, and admin role info.

```http
POST /api/v1/auth/refresh
{ "refreshToken": "<token from login>" }
```

Protected routes: `Authorization: Bearer <accessToken>`

Tenant header for admin routes: `x-website-id: 1`

## Public API (frontend websites)

All public routes require `x-api-key` header (create keys via `POST /api/v1/api-keys`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/public/products` | Active products (cached) |
| GET | `/api/v1/public/categories` | Categories |
| GET | `/api/v1/public/menus/:slug` | Menu with items |
| GET | `/api/v1/public/settings` | Public settings |

## Admin endpoints (new)

| Method | Path | Auth |
|--------|------|------|
| GET/POST/PUT/DELETE | `/api/v1/menus` | JWT + RBAC + tenant |
| GET/PUT/DELETE | `/api/v1/settings/:key` | JWT + RBAC + tenant |
| GET/POST/DELETE | `/api/v1/api-keys` | JWT + RBAC + tenant |

## RBAC roles

- **super_admin** — all permissions, all websites
- **website_admin** — full access within assigned website
- **editor** — create/edit products, categories, menus
- **viewer** — read-only

## Project structure

```
src/
  config/          # env, database, supabase, swagger
  controllers/
  services/
  repositories/    # data access layer
  models/
  routes/
  middleware/      # legacy path (auth, validate, upload)
  middlewares/     # tenant, rbac, apiKey, logging, https
  validators/      # barrel → validations/
  validations/
  modules/         # menu, public feature modules
  utils/
  database/
  tests/
database/
  schema.postgres.sql
  migrations/
.github/workflows/ci.yml
Dockerfile
```

## Testing

```bash
npm test
```

## Docker

```bash
docker build -t menu-api .
docker run -p 3000:3000 --env-file .env menu-api
```

## Environment

See `.env.example` for JWT, Redis, Supabase Storage, rate limits, and HTTPS enforcement.

## Default admin (seed)

- Username: `admin`
- Password: `Admin@123` (change in production)

## License

MIT
