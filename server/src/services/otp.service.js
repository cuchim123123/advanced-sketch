/**
 * OTP Service
 * Business logic for OTP verification
 */

const OTP = require('../models/otp.model');
const { sendMail } = require('../libs/mailer.lib');
const emailTemplates = require('../libs/emailTemplates.lib');
const { TOKEN_EXPIRY, VALIDATION, RATE_LIMIT } = require('../config/constants');
const {
  generateOTP,
  normalizeEmail,
  BadRequestError,
  RateLimitError
} = require('../utils');

// =============================================================================
// OTP OPERATIONS
// =============================================================================

/**
 * Send OTP to email
 */
const sendOTP = async (email, purpose = 'email_verification') => {
  const normalizedEmail = normalizeEmail(email);

  // Rate limiting check
  const recentOTP = await OTP.findOne({
    email: normalizedEmail,
    purpose,
    createdAt: { $gt: new Date(Date.now() - RATE_LIMIT.OTP_COOLDOWN_MS) }
  });

  if (recentOTP) {
    throw new RateLimitError('OTP was sent recently. Please wait before requesting again.', 60);
  }

  // Clean up old OTPs
  await OTP.deleteMany({ email: normalizedEmail, purpose });

  // Generate new OTP
  const code = generateOTP(VALIDATION.OTP_LENGTH);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.OTP * 60 * 1000);

  await OTP.create({
    email: normalizedEmail,
    code,
    purpose,
    expiresAt
  });

  // Send email
  await sendMail({
    to: normalizedEmail,
    subject: `CoPad - Your Verification Code is ${code}`,
    html: emailTemplates.otpEmail({ code, purpose, expiresInMinutes: TOKEN_EXPIRY.OTP }),
    text: emailTemplates.plainText.otp({ code, expiresInMinutes: TOKEN_EXPIRY.OTP })
  });

  return {
    message: 'OTP sent to your email',
    expiresAt
  };
};

/**
 * Verify OTP code
 */
const verifyOTP = async (email, code, purpose = 'email_verification') => {
  const normalizedEmail = normalizeEmail(email);

  const otp = await OTP.findOne({
    email: normalizedEmail,
    purpose,
    expiresAt: { $gt: new Date() }
  });

  if (!otp) {
    throw new BadRequestError('Invalid or expired OTP');
  }

  if (otp.attempts >= VALIDATION.MAX_OTP_ATTEMPTS) {
    await OTP.deleteOne({ _id: otp._id });
    throw new BadRequestError('Too many failed attempts. Please request a new OTP.');
  }

  if (otp.code !== code) {
    otp.attempts += 1;
    await otp.save();
    
    const remaining = VALIDATION.MAX_OTP_ATTEMPTS - otp.attempts;
    throw new BadRequestError(`Invalid OTP. ${remaining} attempts remaining.`);
  }

  // Mark as verified
  otp.verified = true;
  await otp.save();

  return {
    message: 'OTP verified successfully',
    email: normalizedEmail
  };
};

/**
 * Get OTP status
 */
const getOTPStatus = async (email, purpose = 'email_verification') => {
  const otp = await OTP.findOne({
    email: normalizeEmail(email),
    purpose,
    expiresAt: { $gt: new Date() }
  });

  if (!otp) {
    return { exists: false };
  }

  return {
    exists: true,
    verified: otp.verified,
    expiresAt: otp.expiresAt,
    attemptsRemaining: VALIDATION.MAX_OTP_ATTEMPTS - otp.attempts
  };
};

module.exports = {
  sendOTP,
  verifyOTP,
  getOTPStatus
};
