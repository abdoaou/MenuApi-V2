const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

let client = null;
let wsTransport;

if (typeof WebSocket === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
  try {
    // eslint-disable-next-line global-require
    wsTransport = require('ws');
  } catch {
    // Node < 22 without ws installed — Realtime/Storage client may fail
  }
}

/**
 * Supabase client (REST / Auth / Storage). Server should prefer DATABASE_URL for SQL.
 */
function getSupabase() {
  if (!env.supabase.url || !env.supabase.key) {
    return null;
  }
  if (!client) {
    try {
      client = createClient(env.supabase.url, env.supabase.key, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: wsTransport ? { transport: wsTransport } : undefined,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Supabase client init failed:', err.message);
      return null;
    }
  }
  return client;
}

module.exports = { getSupabase };
