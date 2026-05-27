const express = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveTenant, requireTenant } = require('../middlewares/tenant');
const { requirePermission } = require('../middlewares/rbac');
const settingsController = require('../controllers/settings.controller');

const router = express.Router();

router.use(authenticate, resolveTenant, requireTenant);

router.get('/', requirePermission('settings', 'read'), settingsController.list);
router.get('/:key', requirePermission('settings', 'read'), settingsController.get);
router.put('/:key', requirePermission('settings', 'manage'), ...settingsController.upsert);
router.delete('/:key', requirePermission('settings', 'manage'), settingsController.remove);

module.exports = router;
