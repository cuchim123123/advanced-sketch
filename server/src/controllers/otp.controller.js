/**
 * OTP Controller
 * Handles OTP HTTP requests
 */

const otpService = require('../services/otp.service');
const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/response.util');
const { BadRequestError } = require('../utils');
const { VALIDATION } = require('../config/constants');

/**
 * Send OTP to email
 * POST /api/auth/send-otp
 */
exports.sendOTPHandler = asyncHandler(async (req, res) => {
  const { email, purpose = 'email_verification' } = req.body;

  if (!email) {
    throw new BadRequestError('Email is required');
  }

  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    throw new BadRequestError('Invalid email format');
  }

  const result = await otpService.sendOTP(email, purpose);

  res.json(success({
    message: result.message,
    expiresAt: result.expiresAt
  }));
});

/**
 * Verify OTP code
 * POST /api/auth/verify-otp
 */
exports.verifyOTPHandler = asyncHandler(async (req, res) => {
  const { email, code, purpose = 'email_verification' } = req.body;

  if (!email || !code) {
    throw new BadRequestError('Email and OTP code are required');
  }

  const result = await otpService.verifyOTP(email, code, purpose);

  res.json(success({
    message: result.message,
    email: result.email
  }));
});

/**
 * Resend OTP to email
 * POST /api/auth/resend-otp
 */
exports.resendOTPHandler = asyncHandler(async (req, res) => {
  const { email, purpose = 'email_verification' } = req.body;

  if (!email) {
    throw new BadRequestError('Email is required');
  }

  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    throw new BadRequestError('Invalid email format');
  }

  const result = await otpService.sendOTP(email, purpose);

  res.json(success({
    message: 'OTP resent successfully',
    expiresAt: result.expiresAt
  }));
});
