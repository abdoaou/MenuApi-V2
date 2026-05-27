const express = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveTenant, requireTenant } = require('../middlewares/tenant');
const { requirePermission } = require('../middlewares/rbac');
const menuController = require('../modules/menu/menu.controller');

const router = express.Router();

router.use(authenticate, resolveTenant, requireTenant);

router.get('/', requirePermission('menus', 'read'), ...menuController.list);
router.get('/:id', requirePermission('menus', 'read'), ...menuController.getById);
router.post('/', requirePermission('menus', 'manage'), ...menuController.create);
router.put('/:id', requirePermission('menus', 'manage'), ...menuController.update);
router.delete('/:id', requirePermission('menus', 'manage'), ...menuController.remove);
router.post('/:id/items', requirePermission('menus', 'manage'), ...menuController.addItem);
router.delete('/:id/items/:itemId', requirePermission('menus', 'manage'), ...menuController.removeItem);

module.exports = router;
