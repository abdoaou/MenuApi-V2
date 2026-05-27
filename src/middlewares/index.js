module.exports = {
  ...require('../middleware/auth'),
  ...require('../middleware/validate'),
  ...require('../middleware/upload'),
  ...require('../middleware/errorHandler'),
  ...require('./tenant'),
  ...require('./apiKey'),
  ...require('./rbac'),
  ...require('./httpsEnforce'),
  ...require('./requestLogger'),
};
