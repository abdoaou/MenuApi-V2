const path = require('path');
const multer = require('multer');
const env = require('../config/env');

function createUploader() {
  const storage = multer.memoryStorage();

  function fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = env.upload.allowedMimeTypes.includes(file.mimetype);
    const extOk = env.upload.allowedExtensions.includes(ext);
    if (mimeOk && extOk) {
      return cb(null, true);
    }
    const err = new Error('Invalid file type. Allowed: jpg, jpeg, png, webp');
    err.statusCode = 400;
    return cb(err);
  }

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: env.upload.maxFileSizeBytes },
  });
}

const productImageUpload = createUploader();
const categoryImageUpload = createUploader();

/**
 * Multer error → HTTP response via next(err) with statusCode.
 */
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      err.statusCode = 400;
      err.message = 'File too large (max 5MB)';
    } else {
      err.statusCode = 400;
    }
    return next(err);
  }
  return next(err);
}

module.exports = {
  productImageUpload,
  categoryImageUpload,
  handleMulterError,
};
