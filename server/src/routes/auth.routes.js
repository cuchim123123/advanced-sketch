const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authLimiter, strictAuthLimiter } = require('../middleware/rateLimiter.middleware');
const authController = require('../controllers/auth.controller');
const passwordController = require('../controllers/password.controller');
const otpController = require('../controllers/otp.controller');

const router = express.Router();

// =============================================================================
// AUTH ROUTES
// =============================================================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authLimiter, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, authController.login);

/**
 * @route   GET /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.get('/verify-email', authController.verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post('/resend-verification', authLimiter, authController.resendVerificationEmail);

/**
 * @route   GET /api/auth/check-availability
 * @desc    Check if username or email is available
 * @access  Public
 */
router.get('/check-availability', authController.checkAvailability);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', protect, authController.getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', protect, authController.updateProfile);

// =============================================================================
// PASSWORD ROUTES
// =============================================================================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password', authLimiter, passwordController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authLimiter, passwordController.resetPassword);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post('/change-password', protect, strictAuthLimiter, passwordController.changePassword);

// =============================================================================
// OTP ROUTES
// =============================================================================

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to email
 * @access  Public
 */
router.post('/send-otp', strictAuthLimiter, otpController.sendOTPHandler);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP
 * @access  Public
 */
router.post('/verify-otp', strictAuthLimiter, otpController.verifyOTPHandler);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP
 * @access  Public
 */
router.post('/resend-otp', strictAuthLimiter, otpController.resendOTPHandler);

module.exports = router;
