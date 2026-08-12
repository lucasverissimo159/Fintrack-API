const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  }),

  getProfile: asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);
    res.json({ success: true, data: user });
  }),

  regenerateApiKey: asyncHandler(async (req, res) => {
    const user = await authService.regenerateApiKey(req.user.id);
    res.json({ success: true, data: user, message: 'API key regenerated successfully' });
  }),
};

module.exports = authController;
