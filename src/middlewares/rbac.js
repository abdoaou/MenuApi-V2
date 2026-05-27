const roleModel = require('../models/role.model');
const { fail } = require('../utils/response');

/**
 * @param {string} resource
 * @param {string} action
 */
function requirePermission(resource, action) {
  return async (req, res, next) => {
    if (!req.admin?.id) {
      return fail(res, { message: 'Unauthorized', status: 401 });
    }

    if (req.admin.roleName === 'super_admin') {
      return next();
    }

    const allowed = await roleModel.adminHasPermission(req.admin.id, resource, action);
    if (!allowed) {
      return fail(res, { message: 'Forbidden', status: 403 });
    }
    return next();
  };
}

module.exports = { requirePermission };
