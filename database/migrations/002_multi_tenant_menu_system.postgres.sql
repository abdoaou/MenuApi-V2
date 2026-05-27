-- Multi-tenant menu management extensions (run after schema.postgres.sql)
-- Supabase SQL Editor → run this script

-- ─── Websites (tenant) ───────────────────────────────────────────────────────
ALTER TABLE websites ADD COLUMN IF NOT EXISTS domain VARCHAR(255);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_websites_domain ON websites (domain) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_websites_active ON websites (is_active) WHERE deleted_at IS NULL;

-- ─── Roles & RBAC ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  UNIQUE (resource, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE admins ADD COLUMN IF NOT EXISTS role_id INT REFERENCES roles (id) ON DELETE SET NULL;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS website_id INT REFERENCES websites (id) ON DELETE SET NULL;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- ─── Refresh tokens ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  admin_id INT NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_admin ON refresh_tokens (admin_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens (expires_at);

-- ─── API keys (per website, public API) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  website_id INT NOT NULL REFERENCES websites (id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  key_prefix VARCHAR(16) NOT NULL,
  key_hash VARCHAR(128) NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read:menu'],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_website ON api_keys (website_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_api_keys_updated ON api_keys;
CREATE TRIGGER trg_api_keys_updated BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Categories tenant scope & ordering ──────────────────────────────────────
ALTER TABLE categories ADD COLUMN IF NOT EXISTS website_id INT REFERENCES websites (id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_categories_website ON categories (website_id);

-- ─── Products: availability ──────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS availability VARCHAR(20) NOT NULL DEFAULT 'in_stock'
  CHECK (availability IN ('in_stock', 'out_of_stock', 'preorder', 'discontinued'));

CREATE INDEX IF NOT EXISTS idx_products_availability ON products (availability);

-- ─── Menus ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menus (
  id SERIAL PRIMARY KEY,
  website_id INT NOT NULL REFERENCES websites (id) ON DELETE CASCADE,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (website_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_menus_website ON menus (website_id);
CREATE INDEX IF NOT EXISTS idx_menus_deleted ON menus (deleted_at);

DROP TRIGGER IF EXISTS trg_menus_updated ON menus;
CREATE TRIGGER trg_menus_updated BEFORE UPDATE ON menus
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  menu_id INT NOT NULL REFERENCES menus (id) ON DELETE CASCADE,
  product_id INT REFERENCES products (id) ON DELETE SET NULL,
  category_id INT REFERENCES categories (id) ON DELETE SET NULL,
  label VARCHAR(191),
  sort_order INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_menu ON menu_items (menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_product ON menu_items (product_id);

DROP TRIGGER IF EXISTS trg_menu_items_updated ON menu_items;
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Website settings (key-value per tenant) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS website_settings (
  id SERIAL PRIMARY KEY,
  website_id INT NOT NULL REFERENCES websites (id) ON DELETE CASCADE,
  setting_key VARCHAR(120) NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (website_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_website_settings_website ON website_settings (website_id);

DROP TRIGGER IF EXISTS trg_website_settings_updated ON website_settings;
CREATE TRIGGER trg_website_settings_updated BEFORE UPDATE ON website_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── API request / audit logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_logs (
  id BIGSERIAL PRIMARY KEY,
  website_id INT REFERENCES websites (id) ON DELETE SET NULL,
  admin_id INT REFERENCES admins (id) ON DELETE SET NULL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(512) NOT NULL,
  status_code INT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(512),
  duration_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_website ON api_logs (website_id);

-- ─── Seed roles & permissions ───────────────────────────────────────────────
INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Full system access across all websites'),
  ('website_admin', 'Full access within assigned website'),
  ('editor', 'Create and edit content within assigned website'),
  ('viewer', 'Read-only access within assigned website')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (resource, action, description) VALUES
  ('websites', 'manage', 'Create, update, delete websites'),
  ('websites', 'read', 'View websites'),
  ('products', 'manage', 'Full product CRUD'),
  ('products', 'read', 'View products'),
  ('categories', 'manage', 'Full category CRUD'),
  ('categories', 'read', 'View categories'),
  ('menus', 'manage', 'Full menu CRUD'),
  ('menus', 'read', 'View menus'),
  ('settings', 'manage', 'Manage website settings'),
  ('settings', 'read', 'View website settings'),
  ('analytics', 'read', 'View analytics'),
  ('api_keys', 'manage', 'Manage API keys'),
  ('admins', 'manage', 'Manage admin users')
ON CONFLICT (resource, action) DO NOTHING;

-- super_admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- website_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON (
  (r.name = 'website_admin' AND p.resource IN ('products','categories','menus','settings','analytics','api_keys') AND p.action IN ('manage','read'))
  OR (r.name = 'website_admin' AND p.resource = 'websites' AND p.action = 'read')
)
ON CONFLICT DO NOTHING;

-- editor
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON r.name = 'editor' AND (
  (p.resource IN ('products','categories','menus') AND p.action = 'manage')
  OR (p.resource IN ('products','categories','menus','settings') AND p.action = 'read')
)
ON CONFLICT DO NOTHING;

-- viewer: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON r.name = 'viewer' AND p.action = 'read'
  AND p.resource IN ('products','categories','menus','settings','analytics','websites')
ON CONFLICT DO NOTHING;

-- Default existing admin to super_admin
UPDATE admins SET role_id = (SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1)
WHERE role_id IS NULL;
