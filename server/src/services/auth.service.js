/**
 * Auth Service
 * Business logic for authentication operations
 */

const { User } = require('../models');
const { sendEmail } = require('../libs/mailer.lib');
const emailTemplates = require('../libs/emailTemplates.lib');
const { TOKEN_EXPIRY } = require('../config/constants');
const {
  generateToken,
  generateVerificationToken,
  verifyTokenHash,
  normalizeEmail,
  normalizeUsername,
  caseInsensitiveRegex,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  EmailVerificationRequiredError,
  ConflictError,
  TokenExpiredError
} = require('../utils');

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Register new user
 */
const register = async ({ username, email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);

  // Check if user exists
  const existingUser = await User.findOne({
    $or: [
      { email: normalizedEmail },
      { username: caseInsensitiveRegex(normalizedUsername) }
    ]
  });

  if (existingUser) {
    throw new ConflictError(
      existingUser.email === normalizedEmail
        ? 'Email already registered'
        : 'Username already taken'
    );
  }

  // Create user
  const user = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    password
  });

  // Generate and save verification token
  const { token, hashedToken, expiresAt } = generateVerificationToken(TOKEN_EXPIRY.EMAIL_VERIFICATION);
  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiresAt = expiresAt;
  await user.save();

  // Send verification email (non-blocking)
  sendVerificationEmail(user, token).catch(err => {
    console.error('Email send failed:', err.message);
  });

  return {
    user: formatUserResponse(user),
    token: generateToken(user._id)
  };
};

/**
 * Login user
 */
const login = async ({ emailOrPhoneOrUsername, password }) => {
  const normalizedInput = emailOrPhoneOrUsername?.trim();

  const user = await User.findOne({
    $or: [
      { email: normalizeEmail(normalizedInput) },
      { username: caseInsensitiveRegex(normalizedInput) },
      { phone: normalizedInput }
    ]
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.isEmailVerified) {
    throw new EmailVerificationRequiredError(
      'Please verify your email before logging in. Check your inbox for the verification link.'
    );
  }

  return {
    user: formatUserResponse(user),
    token: generateToken(user._id)
  };
};

// =============================================================================
// EMAIL VERIFICATION
// =============================================================================

/**
 * Verify email with token
 */
const verifyEmail = async (uid, token) => {
  const user = await User.findById(uid);

  if (!user) {
    throw new NotFoundError('User not found. This verification link may be outdated. If you re-registered, please use the new verification link sent to your email.');
  }

  if (user.isEmailVerified) {
    throw new BadRequestError('Email is already verified');
  }

  if (!user.emailVerificationToken) {
    throw new BadRequestError('No verification token found. Please request a new verification email.');
  }

  if (user.emailVerificationTokenExpiresAt && user.emailVerificationTokenExpiresAt < Date.now()) {
    throw new TokenExpiredError('Verification link has expired. Please request a new verification email.');
  }

  if (!verifyTokenHash(token, user.emailVerificationToken)) {
    throw new BadRequestError('Invalid verification token');
  }

  // Mark as verified
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpiresAt = undefined;
  await user.save();

  return { message: 'Email verified successfully! You can now log in.' };
};

/**
 * Resend verification email
 */
const resendVerificationEmail = async (email) => {
  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.isEmailVerified) {
    throw new BadRequestError('Email is already verified');
  }

  // Generate new token
  const { token, hashedToken, expiresAt } = generateVerificationToken(TOKEN_EXPIRY.EMAIL_VERIFICATION);
  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiresAt = expiresAt;
  await user.save();

  await sendVerificationEmail(user, token);

  return { message: 'Verification email sent successfully. Please check your inbox.' };
};

// =============================================================================
// PROFILE
// =============================================================================

/**
 * Get user profile
 */
const getProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return formatUserResponse(user, true);
};

/**
 * Update user profile
 */
const updateProfile = async (userId, updates) => {
  const { username, avatar, phone } = updates;
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check username availability
  if (username) {
    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername.toLowerCase() !== user.username.toLowerCase()) {
      const existingUser = await User.findOne({
        username: caseInsensitiveRegex(normalizedUsername)
      });
      if (existingUser) {
        throw new ConflictError('Username already taken');
      }
      user.username = normalizedUsername;
    }
  }

  if (avatar !== undefined) user.avatar = avatar;
  if (phone !== undefined) user.phone = phone;

  await user.save();

  return formatUserResponse(user);
};

// =============================================================================
// AVAILABILITY CHECK
// =============================================================================

/**
 * Check username/email availability
 */
const checkAvailability = async ({ username, email }) => {
  const result = { username: null, email: null };

  if (username) {
    const exists = await User.exists({
      username: caseInsensitiveRegex(normalizeUsername(username))
    });
    result.username = {
      value: username,
      available: !exists,
      message: exists ? 'Username is already taken' : 'Username is available'
    };
  }

  if (email) {
    const exists = await User.exists({ email: normalizeEmail(email) });
    result.email = {
      value: email,
      available: !exists,
      message: exists ? 'Email is already registered' : 'Email is available'
    };
  }

  return result;
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Send verification email
 */
const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?uid=${user._id}&token=${token}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email - CoPad',
    html: emailTemplates.welcomeVerifyEmail({ username: user.username, verificationUrl }),
    text: emailTemplates.plainText.welcomeVerify({ username: user.username, verificationUrl })
  });
};

/**
 * Format user for API response
 */
const formatUserResponse = (user, includeTimestamp = false) => {
  const response = {
    id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    phone: user.phone,
    role: user.role,
    isEmailVerified: user.isEmailVerified
  };

  if (includeTimestamp) {
    response.createdAt = user.createdAt;
  }

  return response;
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  getProfile,
  updateProfile,
  checkAvailability,
  generateToken
};
