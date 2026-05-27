const logModel = require('../models/log.model');
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const meta = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      websiteId: req.websiteId,
      adminId: req.admin?.id,
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', meta);
    } else if (process.env.NODE_ENV !== 'production') {
      logger.debug('Request', meta);
    }

    if (process.env.LOG_TO_DB !== 'false') {
      logModel.insert({
        websiteId: req.websiteId,
        adminId: req.admin?.id,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        durationMs,
      }).catch(() => {});
    }
  });

  return next();
}

module.exports = { requestLogger };
