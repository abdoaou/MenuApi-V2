/**
 * Centralized environment access.
 */
function buildSupabaseDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!password || !ref) {
    return null;
  }

  const database = process.env.SUPABASE_DB_NAME || 'postgres';
  const usePooler = process.env.SUPABASE_USE_POOLER === 'true';
  const poolerHost = process.env.SUPABASE_POOLER_HOST;

  if (usePooler && poolerHost) {
    const port = process.env.SUPABASE_DB_PORT || '5432';
    const user = `postgres.${ref}`;
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${poolerHost}:${port}/${database}`;
  }

  const host = process.env.SUPABASE_DB_HOST || `db.${ref}.supabase.co`;
  const port = process.env.SUPABASE_DB_PORT || '5432';
  const user = process.env.SUPABASE_DB_USER || 'postgres';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const databaseUrl = buildSupabaseDatabaseUrl();

const nodeEnv = process.env.NODE_ENV || 'development';

module.exports = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isStaging: nodeEnv === 'staging',
  isDevelopment: nodeEnv === 'development',
  port: Number(process.env.PORT) || 3000,
  databaseUrl,
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'change-me-refresh',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  redis: {
    url: process.env.REDIS_URL || '',
    enabled: Boolean(process.env.REDIS_URL),
  },
  cache: {
    menuTtlSeconds: Number(process.env.CACHE_MENU_TTL) || 300,
  },
  enforceHttps: process.env.ENFORCE_HTTPS === 'true',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    /** Publishable (anon) or service_role key — use service_role on server for admin bypassing RLS */
    key:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      '',
    projectRef: process.env.SUPABASE_PROJECT_REF || 'vdasoslimprrlkjyuvjh',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' || Boolean(databaseUrl),
  },
  /** Base URL for locally served uploads (e.g. https://menuapi-v2-test.up.railway.app) */
  publicAssetBaseUrl: (process.env.PUBLIC_ASSET_BASE_URL || '').replace(/\/$/, ''),
  upload: {
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    supabaseBucket: process.env.SUPABASE_STORAGE_BUCKET || 'menu-images',
    imageMaxWidth: Number(process.env.IMAGE_MAX_WIDTH) || 1920,
    imageQuality: Number(process.env.IMAGE_QUALITY) || 82,
  },
  apiKeyHeader: process.env.API_KEY_HEADER || 'x-api-key',
  tenantHeader: process.env.TENANT_HEADER || 'x-website-id',
};
