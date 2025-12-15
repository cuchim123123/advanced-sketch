/**
 * Password Controller
 * Handles password-related HTTP requests
 */

const passwordService = require('../services/password.service');
const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/response.util');
const { BadRequestError } = require('../utils');
const { VALIDATION } = require('../config/constants');

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { emailOrUsername } = req.body;

  if (!emailOrUsername) {
    throw new BadRequestError('Please provide email or username');
  }

  const result = await passwordService.requestReset(emailOrUsername);

  res.json(success(result));
});

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  const { userId, token, newPassword } = req.body;

  if (!userId || !token || !newPassword) {
    throw new BadRequestError('Missing required fields');
  }

  if (newPassword.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    throw new BadRequestError(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`);
  }

  const result = await passwordService.resetPassword(userId, token, newPassword);

  res.json(success(result));
});

/**
 * Change password for authenticated user
 * POST /api/auth/change-password
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new BadRequestError('Current password and new password are required');
  }

  if (newPassword.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    throw new BadRequestError(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`);
  }

  const result = await passwordService.changePassword(req.user._id, currentPassword, newPassword);

  res.json(success(result));
});
