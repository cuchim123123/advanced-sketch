/**
 * Auth Controller
 * Handles authentication HTTP requests
 */

const authService = require('../services/auth.service');
const asyncHandler = require('../middleware/asyncHandler');
const { success, created } = require('../utils/response.util');
const { BadRequestError } = require('../utils');
const { VALIDATION } = require('../config/constants');

/**
 * Register a new user
 * POST /api/auth/register
 */
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Validation
  if (!username || !email || !password) {
    throw new BadRequestError('Please provide username, email, and password');
  }

  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    throw new BadRequestError(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`);
  }

  const result = await authService.register({ username, email, password });

  console.log('✅ User registered successfully');

  res.status(201).json(created(result));
});

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, emailOrPhoneOrUsername, password } = req.body;
  const identifier = emailOrPhoneOrUsername || email;

  if (!identifier || !password) {
    throw new BadRequestError('Please provide email/username and password');
  }

  const result = await authService.login({ emailOrPhoneOrUsername: identifier, password });

  console.log('✅ Login successful');

  res.json(success(result));
});

/**
 * Verify email
 * GET /api/auth/verify-email
 */
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { uid, token } = req.query;

  if (!uid || !token) {
    throw new BadRequestError('Missing verification parameters');
  }

  const result = await authService.verifyEmail(uid, token);

  console.log('✅ Email verified successfully');

  res.json(success(result));
});

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
exports.resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new BadRequestError('Email is required');
  }

  const result = await authService.resendVerificationEmail(email);

  console.log('✅ Verification email sent successfully');

  res.json(success(result));
});

/**
 * Check username/email availability
 * GET /api/auth/check-availability
 */
exports.checkAvailability = asyncHandler(async (req, res) => {
  const { username, email } = req.query;

  if (!username && !email) {
    throw new BadRequestError('Please provide username or email to check');
  }

  const result = await authService.checkAvailability({ username, email });

  res.json(success(result));
});

/**
 * Get current user
 * GET /api/auth/me
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);

  res.json(success({ user }));
});

/**
 * Update profile
 * PUT /api/auth/profile
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);

  res.json(success({ user }));
});
