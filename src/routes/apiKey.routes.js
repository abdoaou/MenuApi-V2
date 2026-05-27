const express = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveTenant, requireTenant } = require('../middlewares/tenant');
const { requirePermission } = require('../middlewares/rbac');
const apiKeyController = require('../controllers/apiKey.controller');

const router = express.Router();

router.use(authenticate, resolveTenant, requireTenant);

router.get('/', requirePermission('api_keys', 'manage'), apiKeyController.list);
router.post('/', requirePermission('api_keys', 'manage'), ...apiKeyController.create);
router.delete('/:id', requirePermission('api_keys', 'manage'), ...apiKeyController.revoke);

module.exports = router;
