const { sendOTP, verifyOTP } = require('../services/otp.service');

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to email
 * @access  Public
 */
const sendOTPHandler = async (req, res, next) => {
  try {
    const { email, purpose = 'email_verification' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const result = await sendOTP(email, purpose);

    res.json({
      success: true,
      message: result.message,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to send OTP'
    });
  }
};

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP code
 * @access  Public
 */
const verifyOTPHandler = async (req, res, next) => {
  try {
    const { email, code, purpose = 'email_verification' } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP code are required'
      });
    }

    const result = await verifyOTP(email, code, purpose);

    res.json({
      success: true,
      message: result.message,
      email: result.email
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify OTP'
    });
  }
};

module.exports = {
  sendOTPHandler,
  verifyOTPHandler
};
