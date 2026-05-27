-- =============================================================================
-- Multi-Tenant Menu Management API — FULL PostgreSQL / Supabase schema
-- Run once in: Supabase Dashboard → SQL Editor
-- =============================================================================

-- ─── Shared trigger ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 1. WEBSITES (tenants) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS websites (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(191) NOT NULL,
  slug        VARCHAR(191) NOT NULL UNIQUE,
  domain      VARCHAR(255),
  config      JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_websites_domain ON websites (domain) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_websites_active ON websites (is_active) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_websites_updated ON websites;
CREATE TRIGGER trg_websites_updated BEFORE UPDATE ON websites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 2. ROLES & PERMISSIONS (RBAC) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id          SERIAL PRIMARY KEY,
  resource    VARCHAR(50) NOT NULL,
  action      VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  UNIQUE (resource, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ─── 3. ADMINS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(80) NOT NULL UNIQUE,
  email         VARCHAR(191) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  role_id       INT REFERENCES roles (id) ON DELETE SET NULL,
  website_id    INT REFERENCES websites (id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_role ON admins (role_id);
CREATE INDEX IF NOT EXISTS idx_admins_website ON admins (website_id);

DROP TRIGGER IF EXISTS trg_admins_updated ON admins;
CREATE TRIGGER trg_admins_updated BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 4. REFRESH TOKENS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  admin_id   INT NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_admin ON refresh_tokens (admin_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens (expires_at);

-- ─── 5. API KEYS (public frontend access) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id           SERIAL PRIMARY KEY,
  website_id   INT NOT NULL REFERENCES websites (id) ON DELETE CASCADE,
  name         VARCHAR(120) NOT NULL,
  key_prefix   VARCHAR(16) NOT NULL,
  key_hash     VARCHAR(128) NOT NULL,
  scopes       TEXT[] NOT NULL DEFAULT ARRAY['read:menu'],
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_website ON api_keys (website_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_api_keys_updated ON api_keys;
CREATE TRIGGER trg_api_keys_updated BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 6. PARENT CATEGORIES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_categories (
  id          SERIAL PRIMARY KEY,
  website_id  INT REFERENCES websites (id) ON DELETE CASCADE,
  name        VARCHAR(191) NOT NULL,
  slug        VARCHAR(191) NOT NULL,
  image       VARCHAR(512),
  description TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_parent_categories_website_slug
  ON parent_categories (website_id, slug) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_parent_categories_updated ON parent_categories;
CREATE TRIGGER trg_parent_categories_updated BEFORE UPDATE ON parent_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 7. CATEGORIES (nested subcategories) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  website_id  INT REFERENCES websites (id) ON DELETE CASCADE,
  parent_id   INT REFERENCES parent_categories (id) ON DELETE SET NULL,
  name        VARCHAR(191) NOT NULL,
  slug        VARCHAR(191) NOT NULL,
  image       VARCHAR(512),
  description TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order  INT NOT NULL DEFAULT 0,
  is_visible  BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_website ON categories (website_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_deleted ON categories (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_website_slug
  ON categories (website_id, slug) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_categories_updated ON categories;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 8. PRODUCTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                 SERIAL PRIMARY KEY,
  website_id         INT NOT NULL REFERENCES websites (id) ON DELETE RESTRICT,
  category_id        INT REFERENCES categories (id) ON DELETE SET NULL,
  parent_category_id INT REFERENCES parent_categories (id) ON DELETE SET NULL,
  name               VARCHAR(191) NOT NULL,
  slug               VARCHAR(191) NOT NULL,
  description        TEXT,
  short_description  VARCHAR(512),
  price              DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sale_price         DECIMAL(12, 2),
  stock              INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku                VARCHAR(120) NOT NULL,
  image              VARCHAR(512),
  status             VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'inactive')),
  featured           BOOLEAN NOT NULL DEFAULT FALSE,
  availability       VARCHAR(20) NOT NULL DEFAULT 'in_stock'
    CHECK (availability IN ('in_stock', 'out_of_stock', 'preorder', 'discontinued')),
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (website_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_products_website ON products (website_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_parent_category ON products (parent_category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (featured);
CREATE INDEX IF NOT EXISTS idx_products_availability ON products (availability);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products (deleted_at);

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 9. PRODUCT VARIANTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id         SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  name       VARCHAR(191) NOT NULL,
  sku        VARCHAR(120),
  price      DECIMAL(12, 2),
  sale_price DECIMAL(12, 2),
  stock      INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  attributes JSONB,
  status     VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_deleted ON product_variants (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_product_sku_active
  ON product_variants (product_id, sku)
  WHERE deleted_at IS NULL AND sku IS NOT NULL;

DROP TRIGGER IF EXISTS trg_product_variants_updated ON product_variants;
CREATE TRIGGER trg_product_variants_updated BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 10. MENUS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menus (
  id          SERIAL PRIMARY KEY,
  website_id  INT NOT NULL REFERENCES websites (id) ON DELETE CASCADE,
  name        VARCHAR(191) NOT NULL,
  slug        VARCHAR(191) NOT NULL,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (website_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_menus_website ON menus (website_id);
CREATE INDEX IF NOT EXISTS idx_menus_deleted ON menus (deleted_at);

DROP TRIGGER IF EXISTS trg_menus_updated ON menus;
CREATE TRIGGER trg_menus_updated BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 11. MENU ITEMS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id          SERIAL PRIMARY KEY,
  menu_id     INT NOT NULL REFERENCES menus (id) ON DELETE CASCADE,
  product_id  INT REFERENCES products (id) ON DELETE SET NULL,
  category_id INT REFERENCES categories (id) ON DELETE SET NULL,
  label       VARCHAR(191),
  sort_order  INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_menu ON menu_items (menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_product ON menu_items (product_id);

DROP TRIGGER IF EXISTS trg_menu_items_updated ON menu_items;
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 12. WEBSITE SETTINGS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS website_settings (
  id            SERIAL PRIMARY KEY,
  website_id    INT NOT NULL REFERENCES websites (id) ON DELETE CASCADE,
  setting_key   VARCHAR(120) NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (website_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_website_settings_website ON website_settings (website_id);

DROP TRIGGER IF EXISTS trg_website_settings_updated ON website_settings;
CREATE TRIGGER trg_website_settings_updated BEFORE UPDATE ON website_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 13. API LOGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_logs (
  id            BIGSERIAL PRIMARY KEY,
  website_id    INT REFERENCES websites (id) ON DELETE SET NULL,
  admin_id      INT REFERENCES admins (id) ON DELETE SET NULL,
  method        VARCHAR(10) NOT NULL,
  path          VARCHAR(512) NOT NULL,
  status_code   INT,
  ip_address    VARCHAR(45),
  user_agent    VARCHAR(512),
  duration_ms   INT,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_website ON api_logs (website_id);

-- =============================================================================
-- SEED DATA
-- =============================================================================

INSERT INTO websites (name, slug, domain)
VALUES ('Main Store', 'main-store', 'localhost')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO roles (name, description) VALUES
  ('super_admin',   'Full system access across all websites'),
  ('website_admin', 'Full access within assigned website'),
  ('editor',        'Create and edit content within assigned website'),
  ('viewer',        'Read-only access within assigned website')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (resource, action, description) VALUES
  ('websites',   'manage', 'Create, update, delete websites'),
  ('websites',   'read',   'View websites'),
  ('products',   'manage', 'Full product CRUD'),
  ('products',   'read',   'View products'),
  ('categories', 'manage', 'Full category CRUD'),
  ('categories', 'read',   'View categories'),
  ('menus',      'manage', 'Full menu CRUD'),
  ('menus',      'read',   'View menus'),
  ('settings',   'manage', 'Manage website settings'),
  ('settings',   'read',   'View website settings'),
  ('analytics',  'read',   'View analytics'),
  ('api_keys',   'manage', 'Manage API keys'),
  ('admins',     'manage', 'Manage admin users')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON (
  (r.name = 'website_admin' AND p.resource IN ('products','categories','menus','settings','analytics','api_keys') AND p.action IN ('manage','read'))
  OR (r.name = 'website_admin' AND p.resource = 'websites' AND p.action = 'read')
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON r.name = 'editor' AND (
  (p.resource IN ('products','categories','menus') AND p.action = 'manage')
  OR (p.resource IN ('products','categories','menus','settings') AND p.action = 'read')
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON r.name = 'viewer' AND p.action = 'read'
  AND p.resource IN ('products','categories','menus','settings','analytics','websites')
ON CONFLICT DO NOTHING;

-- Default admin: username admin / password Admin@123
INSERT INTO admins (username, email, password, role_id)
VALUES (
  'admin',
  'admin@example.com',
  '$2b$10$ql.ldkYGM87grtijC7KcBOEHPoVLx2CyWiUuTazSbEmo2Bx/a1oV2',
  (SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1)
)
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  role_id = EXCLUDED.role_id;

-- =============================================================================
-- TABLE RELATIONSHIP MAP
-- =============================================================================
-- websites (tenant root)
--   ├── admins.website_id
--   ├── api_keys.website_id
--   ├── parent_categories.website_id
--   ├── categories.website_id
--   ├── products.website_id
--   ├── menus.website_id
--   ├── website_settings.website_id
--   └── api_logs.website_id
--
-- parent_categories
--   └── categories.parent_id
--   └── products.parent_category_id
--
-- categories
--   └── products.category_id
--   └── menu_items.category_id
--
-- products
--   └── product_variants.product_id
--   └── menu_items.product_id
--
-- menus
--   └── menu_items.menu_id
--
-- roles ←→ permissions (role_permissions)
-- admins.role_id → roles
-- refresh_tokens.admin_id → admins
-- =============================================================================
