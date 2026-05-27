/**
 * Validators barrel — mirrors src/validations for enterprise folder layout.
 */
module.exports = {
  auth: require('../validations/auth.validation'),
  product: require('../validations/product.validation'),
  category: require('../validations/category.validation'),
  website: require('../validations/website.validation'),
  admin: require('../validations/admin.validation'),
  menu: require('../validations/menu.validation'),
  settings: require('../validations/settings.validation'),
  apiKey: require('../validations/apiKey.validation'),
};
