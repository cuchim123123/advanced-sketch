const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { protect } = require('../middleware/auth');
const { sendOTPHandler, verifyOTPHandler } = require('../controllers/otp.controller');
const { register, login, verifyEmail, verifyLoginOtp, resendLoginOtp } = require('../controllers/auth.controller');

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

router.post('/send-otp', sendOTPHandler);
router.post('/verify-otp', verifyOTPHandler);

module.exports = router;
