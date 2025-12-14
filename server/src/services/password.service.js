const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { sendEmail } = require('../libs/mailer.lib');

const RESET_TTL_MINUTES = Number(process.env.RESET_TTL_MINUTES) || 15;

const generateToken = () => crypto.randomBytes(32).toString('hex');
const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

/**
 * Request password reset - sends email with reset link
 */
const requestReset = async (emailOrUsername) => {
  // Find user by email or username
  let user = null;
  
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrUsername)) {
    user = await User.findOne({ email: emailOrUsername.toLowerCase() });
  } else {
    user = await User.findOne({ username: emailOrUsername });
  }

  // Don't reveal if user exists or not
  if (!user) {
    return { message: 'If an account exists, a reset link has been sent.' };
  }

  // Generate token
  const token = generateToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  // Save hashed token to database
  await User.findByIdAndUpdate(user._id, {
    resetPasswordToken: tokenHash,
    resetPasswordTokenExpiresAt: expiresAt
  });

  // Create reset link
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetLink = `${frontendUrl}/reset-password?uid=${user._id}&token=${token}`;

  // Send email
  await sendEmail({
    to: user.email,
    subject: 'Reset Your Password - CoPad',
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password for your CoPad account.</p>
      <p>Click the button below to reset your password:</p>
      <p>
        <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
          Reset Password
        </a>
      </p>
      <p>Or copy this link: ${resetLink}</p>
      <p><strong>This link expires in ${RESET_TTL_MINUTES} minutes.</strong></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `
  });

  return { message: 'If an account exists, a reset link has been sent.' };
};

/**
 * Reset password with token
 */
const resetPassword = async (userId, token, newPassword) => {
  // Find user with reset token fields
  const user = await User.findById(userId).select('+resetPasswordToken +resetPasswordTokenExpiresAt +password');

  if (!user || !user.resetPasswordToken || !user.resetPasswordTokenExpiresAt) {
    throw new Error('Invalid or expired reset link');
  }

  // Check if token expired
  if (user.resetPasswordTokenExpiresAt < new Date()) {
    throw new Error('Reset link has expired. Please request a new one.');
  }

  // Verify token
  const tokenHash = sha256(token);
  if (user.resetPasswordToken !== tokenHash) {
    throw new Error('Invalid reset link');
  }

  // Validate password - must match User model requirements (6 chars minimum)
  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Update password and clear reset token
  user.password = newPassword; // Will be hashed by pre-save hook
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpiresAt = undefined;
  
  await user.save();

  return { message: 'Password reset successful' };
};

module.exports = {
  requestReset,
  resetPassword
};
