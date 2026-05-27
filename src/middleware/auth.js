const { verifyToken } = require('../utils/jwt');
const { fail } = require('../utils/response');

/**
 * Parses Bearer token and attaches `req.admin` on success.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return fail(res, { message: 'Unauthorized', status: 401 });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return fail(res, { message: 'Invalid token', status: 401 });
    }
    req.admin = {
      id: decoded.id,
      username: decoded.username,
      roleName: decoded.roleName || 'super_admin',
      websiteId: decoded.websiteId ?? null,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return fail(res, { message: 'Token expired', status: 401 });
    }
    return fail(res, { message: 'Invalid token', status: 401 });
  }
}

module.exports = { authenticate };
