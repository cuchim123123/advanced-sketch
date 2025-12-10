const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { protect } = require('../middleware/auth');
const { sendOTPHandler, verifyOTPHandler } = require('../controllers/otp.controller');
const { register, login, verifyEmail, verifyLoginOtp, resendLoginOtp } = require('../controllers/auth.controller');
const { forgotPassword, resetPassword } = require('../controllers/password.controller');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.length < 3) {
      return res.json({ available: false, message: 'Username must be at least 3 characters' });
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.json({ available: false, message: 'Username must be alphanumeric' });
    }
    
    const existingUser = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
    res.json({ available: !existingUser });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ available: false, message: 'Server error' });
  }
});

// Check email availability
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.json({ available: false, message: 'Invalid email format' });
    }
    
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    res.json({ available: !existingUser });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ available: false, message: 'Server error' });
  }
});

router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/verify-login-otp', verifyLoginOtp);
router.post('/resend-login-otp', resendLoginOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar
      }
    }
  });
});

/**
 * @route   PATCH /api/auth/profile
 * @desc    Update user profile (username, avatar)
 * @access  Private
 */
router.patch('/profile', protect, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const updates = {};

    if (username && username !== req.user.username) {
      // Validate username
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Username must be 3-30 characters'
        });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be alphanumeric'
        });
      }
      // Check if username taken
      const existing = await User.findOne({ 
        username: new RegExp(`^${username}$`, 'i'),
        _id: { $ne: req.user._id }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
      updates.username = username;
    }

    if (avatar !== undefined) {
      updates.avatar = avatar;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/send-otp', sendOTPHandler);
router.post('/verify-otp', verifyOTPHandler);

module.exports = router;
