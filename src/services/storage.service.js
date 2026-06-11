const path = require('path');
const fs = require('fs');
const { getSupabase } = require('../config/supabase');
const env = require('../config/env');
const logger = require('../utils/logger');

function toPublicUrl(relativePath) {
  const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  if (env.publicAssetBaseUrl) {
    return `${env.publicAssetBaseUrl}${normalized}`;
  }
  return normalized;
}

let sharp;
try {
  // eslint-disable-next-line global-require
  sharp = require('sharp');
} catch {
  sharp = null;
}

async function optimizeBuffer(buffer) {
  if (!sharp) return buffer;
  return sharp(buffer)
    .resize({ width: env.upload.imageMaxWidth, withoutEnlargement: true })
    .webp({ quality: env.upload.imageQuality })
    .toBuffer();
}

/**
 * Upload image to Supabase Storage or local disk fallback.
 * @returns {Promise<string>} public URL
 */
async function uploadImage(file, folder) {
  const buffer = file.buffer || fs.readFileSync(file.path);
  const optimized = await optimizeBuffer(buffer);
  const ext = '.webp';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const storagePath = `${folder}/${filename}`;

  const supabase = getSupabase();
  if (supabase && env.supabase.key) {
    try {
      const { error } = await supabase.storage
        .from(env.upload.supabaseBucket)
        .upload(storagePath, optimized, {
          contentType: 'image/webp',
          upsert: false,
        });
      if (error) {
        logger.warn('Supabase upload failed, using local', { error: error.message });
      } else {
        const { data } = supabase.storage.from(env.upload.supabaseBucket).getPublicUrl(storagePath);
        return data.publicUrl;
      }
    } catch (err) {
      logger.warn('Supabase client/upload error, using local', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const dest = path.join(__dirname, '..', 'uploads', folder);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const localPath = path.join(dest, filename);
  fs.writeFileSync(localPath, optimized);
  return toPublicUrl(`/uploads/${folder}/${filename}`);
}

module.exports = { uploadImage, optimizeBuffer, toPublicUrl };
