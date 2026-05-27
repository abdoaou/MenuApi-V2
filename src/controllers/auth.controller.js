const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { loginRules, refreshRules } = require('../validations/auth.validation');
const { validateRequest } = require('../middleware/validate');

const login = [
  ...loginRules,
  validateRequest,
  asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    const result = await authService.login({ email, username, password });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: result.accessToken,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        admin: result.admin,
      },
    });
  }),
];

const refresh = [
  ...refreshRules,
  validateRequest,
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refreshToken);
    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        admin: result.admin,
      },
    });
  }),
];

const logout = [
  asyncHandler(async (req, res) => {
    await authService.logout(req.body?.refreshToken);
    return res.status(200).json({ success: true, message: 'Logged out' });
  }),
];

module.exports = { login, refresh, logout };
