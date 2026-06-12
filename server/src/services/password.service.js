/**
 * Password Service
 * Business logic for password operations
 */

const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { sendEmail } = require('../libs/mailer.lib');
const emailTemplates = require('../libs/emailTemplates.lib');
const { TOKEN_EXPIRY, VALIDATION } = require('../config/constants');
const {
  generateRandomToken,
  hashSHA256,
  verifyTokenHash,
  normalizeEmail,
  caseInsensitiveRegex,
  NotFoundError,
  BadRequestError,
  TokenExpiredError,
  UnauthorizedError
} = require('../utils');

// =============================================================================
// PASSWORD RESET FLOW
// =============================================================================

/**
 * Request password reset
 * Note: Always returns success to prevent user enumeration
 */
const requestReset = async (emailOrUsername) => {
  const input = emailOrUsername?.trim();
  if (!input) return { message: 'If an account exists, a reset link has been sent.' };

  // Find user by email or username
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  const user = await User.findOne(
    isEmail
      ? { email: normalizeEmail(input) }
      : { username: caseInsensitiveRegex(input) }
  );

  // Don't reveal if user exists
  if (!user) {
    return { message: 'If an account exists, a reset link has been sent.' };
  }

  // Generate and save token
  const token = generateRandomToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET * 60 * 1000);

  await User.findByIdAndUpdate(user._id, {
    resetPasswordToken: hashSHA256(token),
    resetPasswordTokenExpiresAt: expiresAt
  });

  // Send email
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?uid=${user._id}&token=${token}`;

  console.log('\n========================================');
  console.log(`✉️  [DEVELOPMENT] Password Reset Link for ${user.email}:`);
  console.log(`   ${resetUrl}`);
  console.log(`========================================\n`);

  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset Your Password - CoPad',
      html: emailTemplates.passwordResetEmail({ resetUrl, expiresInMinutes: TOKEN_EXPIRY.PASSWORD_RESET }),
      text: emailTemplates.plainText.passwordReset({ resetUrl, expiresInMinutes: TOKEN_EXPIRY.PASSWORD_RESET })
    });
  } catch (error) {
    console.log(`ℹ️  Note: SMTP is not configured or failed (${error.message}). You can use the link above to reset the password.`);
  }

  return { message: 'If an account exists, a reset link has been sent.' };
};

/**
 * Reset password with token
 */
const resetPassword = async (userId, token, newPassword) => {
  const user = await User.findById(userId)
    .select('+resetPasswordToken +resetPasswordTokenExpiresAt +password');

  if (!user?.resetPasswordToken) {
    throw new BadRequestError('Invalid or expired reset link');
  }

  if (user.resetPasswordTokenExpiresAt < new Date()) {
    throw new TokenExpiredError('Reset link has expired. Please request a new one.');
  }

  if (!verifyTokenHash(token, user.resetPasswordToken)) {
    throw new BadRequestError('Invalid reset link');
  }

  validatePassword(newPassword);

  // Update password and clear token
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpiresAt = undefined;
  await user.save();

  return { message: 'Password reset successful' };
};

// =============================================================================
// CHANGE PASSWORD (Authenticated)
// =============================================================================

/**
 * Change password for authenticated user
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  validatePassword(newPassword);

  const isSame = await bcrypt.compare(newPassword, user.password);
  if (isSame) {
    throw new BadRequestError('New password must be different from current password');
  }

  user.password = newPassword;
  await user.save();

  return { message: 'Password changed successfully' };
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Validate password requirements
 */
const validatePassword = (password) => {
  if (!password || password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    throw new BadRequestError(`Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`);
  }
};

module.exports = {
  requestReset,
  resetPassword,
  changePassword
};
