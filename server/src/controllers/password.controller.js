const passwordService = require('../services/password.service');

/**
 * POST /api/auth/forgot-password
 * Request password reset link
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { emailOrUsername } = req.body;

    if (!emailOrUsername) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or username'
      });
    }

    const result = await passwordService.requestReset(emailOrUsername);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request. Please try again.'
    });
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { userId, token, newPassword } = req.body;

    if (!userId || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const result = await passwordService.resetPassword(userId, token, newPassword);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to reset password'
    });
  }
};
