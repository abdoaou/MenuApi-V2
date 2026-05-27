const env = require('../config/env');
const websiteModel = require('../models/website.model');
const { fail } = require('../utils/response');

/**
 * Resolves tenant (website) from header or admin assignment.
 * Sets req.tenant = { id, slug, name, domain }
 */
async function resolveTenant(req, res, next) {
  try {
    const headerId = req.headers[env.tenantHeader.toLowerCase()] || req.headers[env.tenantHeader];
    let websiteId = headerId ? Number(headerId) : null;

    if (req.admin) {
      const role = req.admin.roleName;
      if (role && role !== 'super_admin' && req.admin.websiteId) {
        websiteId = req.admin.websiteId;
      }
    }

    if (!websiteId || Number.isNaN(websiteId)) {
      if (req.admin?.roleName === 'super_admin') {
        return next();
      }
      return fail(res, { message: 'Tenant website id required', status: 400 });
    }

    const site = await websiteModel.findById(websiteId);
    if (!site || site.deleted_at || site.is_active === false) {
      return fail(res, { message: 'Website not found or inactive', status: 404 });
    }

    req.tenant = {
      id: site.id,
      slug: site.slug,
      name: site.name,
      domain: site.domain,
    };
    req.websiteId = site.id;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Requires tenant context (after resolveTenant).
 */
function requireTenant(req, res, next) {
  if (!req.websiteId) {
    return fail(res, { message: 'Tenant context required', status: 400 });
  }
  return next();
}

module.exports = { resolveTenant, requireTenant };
