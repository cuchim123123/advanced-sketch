const crypto = require('crypto');
const OTP = require('../models/OTP');
const { sendMail } = require('../libs/mailer');

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES) || 15;
const OTP_LENGTH = Number(process.env.OTP_LENGTH) || 6;

/**
 * Generate random OTP code
 */
const generateOTPCode = (length = OTP_LENGTH) => {
  return crypto.randomInt(10 ** (length - 1), 10 ** length).toString();
};

/**
 * Send OTP to email
 * @param {string} email - Email to send OTP
 * @param {string} purpose - Purpose: 'email_verification', 'password_reset', 'two_factor', 'login_verification'
 */
const sendOTP = async (email, purpose = 'email_verification') => {
  email = email.toLowerCase();

  // Check if OTP was sent recently (rate limiting)
  const recentOTP = await OTP.findOne({
    email,
    purpose,
    createdAt: { $gt: new Date(Date.now() - 60000) } // 1 minute
  });

  if (recentOTP) {
    throw new Error('OTP was sent recently. Please try again later.');
  }

  // Delete previous OTPs for this email and purpose
  await OTP.deleteMany({ email, purpose });

  // Generate OTP code
  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Save OTP to database
  const otp = await OTP.create({
    email,
    code,
    purpose,
    expiresAt
  });

  // Send email
  const purposeText = {
    email_verification: 'verify your email',
    password_reset: 'reset your password',
    two_factor: 'complete 2FA',
    login_verification: 'complete your login'
  }[purpose] || 'verify your identity';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>CoPad - Email Verification</h2>
      <p>Hello,</p>
      <p>We received a request to ${purposeText}.</p>
      <p>Your verification code is:</p>
      <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
        <h1 style="letter-spacing: 5px; color: #333;">${code}</h1>
      </div>
      <p style="color: #666;">This code will expire in ${OTP_TTL_MINUTES} minutes.</p>
      <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #ddd; margin-top: 30px;">
      <p style="color: #999; font-size: 12px;">© CoPad - Collaborative Sketch App</p>
    </div>
  `;

  await sendMail({
    to: email,
    subject: `CoPad - Your Verification Code is ${code}`,
    html,
    text: `Your verification code is: ${code}. This code will expire in ${OTP_TTL_MINUTES} minutes.`
  });

  return {
    success: true,
    message: 'OTP sent to your email',
    expiresAt
  };
};

/**
 * Verify OTP code
 * @param {string} email - Email address
 * @param {string} code - OTP code to verify
 * @param {string} purpose - Purpose of OTP
 */
const verifyOTP = async (email, code, purpose = 'email_verification') => {
  email = email.toLowerCase();

  const otp = await OTP.findOne({
    email,
    code,
    purpose,
    expiresAt: { $gt: new Date() } // Not expired
  });

  if (!otp) {
    // Increment attempts for non-existent or expired OTP
    await OTP.findOneAndUpdate(
      { email, purpose, expiresAt: { $gt: new Date() } },
      { $inc: { attempts: 1 } }
    );
    throw new Error('Invalid or expired OTP');
  }

  // Check attempts
  if (otp.attempts >= 5) {
    await OTP.deleteOne({ _id: otp._id });
    throw new Error('Too many failed attempts. Please request a new OTP.');
  }

  // Increment attempts
  otp.attempts += 1;

  // Check if this is the correct attempt
  if (otp.code !== code) {
    await otp.save();
    throw new Error(`Invalid OTP. ${5 - otp.attempts} attempts remaining.`);
  }

  // Mark as verified
  otp.verified = true;
  await otp.save();

  return {
    success: true,
    message: 'OTP verified successfully',
    email
  };
};

/**
 * Get OTP status
 */
const getOTPStatus = async (email, purpose = 'email_verification') => {
  email = email.toLowerCase();

  const otp = await OTP.findOne({
    email,
    purpose,
    expiresAt: { $gt: new Date() }
  });

  if (!otp) {
    return { exists: false, message: 'No active OTP found' };
  }

  return {
    exists: true,
    verified: otp.verified,
    expiresAt: otp.expiresAt,
    attemptsRemaining: 5 - otp.attempts
  };
};

module.exports = {
  sendOTP,
  verifyOTP,
  getOTPStatus,
  generateOTPCode
};
