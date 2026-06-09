const { uploadImage } = require('../services/storage.service');

/**
 * Image from JSON `image` URL string.
 * Empty string / null / whitespace → null (clear image).
 * If `image` is omitted on update, returns `fallback` (usually existing URL).
 */
function resolveBodyImage(body, fallback = null) {
  if (Object.prototype.hasOwnProperty.call(body, 'image')) {
    const raw = body.image;
    if (raw === null || raw === '') {
      return null;
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      return trimmed === '' ? null : trimmed;
    }
    return null;
  }
  return fallback;
}

/**
 * Upload multipart file to cloud storage (or local fallback) and return a public URL.
 */
async function resolveImageFieldAsync(body, file, folder, fallback = null) {
  if (file) {
    return uploadImage(file, folder);
  }
  return resolveBodyImage(body, fallback);
}

module.exports = { resolveBodyImage, resolveImageFieldAsync };
