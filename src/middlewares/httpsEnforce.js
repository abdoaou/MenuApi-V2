const env = require('../config/env');

function enforceHttps(req, res, next) {
  if (!env.enforceHttps) {
    return next();
  }
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  if (proto !== 'https') {
    return res.status(403).json({ success: false, message: 'HTTPS required' });
  }
  return next();
}

module.exports = { enforceHttps };
