const crypto = require('crypto');
const { User } = require('../models');
const { sendEmail } = require('../libs/mailer');
const otpService = require('../services/otp.service');

const generateToken = (id) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const generateVerificationToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return { token, hashedToken, expiresAt };
};

/**
 * Register a new user with email verification
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase()
          ? 'Email already registered'
          : 'Username already taken'
      });
    }

    // Generate email verification token
    const { token, hashedToken, expiresAt } = generateVerificationToken();

    // Create user (not verified yet)
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationTokenExpiresAt: expiresAt
    });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?uid=${user._id}&token=${token}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Verify Your Email - CoPad',
      html: `
        <h2>Welcome to CoPad!</h2>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a></p>
        <p>Or copy this link: ${verificationUrl}</p>
        <p>This link expires in 24 hours.</p>
      `
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Verify email address
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { uid, token } = req.query;

    if (!uid || !token) {
      return res.status(400).json({
        success: false,
        message: 'Missing verification parameters'
      });
    }

    const user = await User.findById(uid).select('+emailVerificationToken +emailVerificationTokenExpiresAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    if (!user.emailVerificationToken) {
      return res.status(400).json({
        success: false,
        message: 'No verification token found'
      });
    }

    if (user.emailVerificationTokenExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    if (hashedToken !== user.emailVerificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiresAt = undefined;
    await user.save();

    // Generate auth token
    const authToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        },
        token: authToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Login user (with OTP for failed attempts)
 */
exports.login = async (req, res) => {
  try {
    const { emailOrPhoneOrUsername, password } = req.body;

    // Validate input
    if (!emailOrPhoneOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password'
      });
    }

    // Find user by email, username, or phone
    const user = await User.findOne({
      $or: [
        { email: emailOrPhoneOrUsername.toLowerCase() },
        { username: emailOrPhoneOrUsername },
        { phone: emailOrPhoneOrUsername.replace(/[\s\-\(\)]/g, '') }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Check if OTP is required (5+ failed attempts)
    if (user.loginOtpRequired) {
      return res.status(403).json({
        success: false,
        needOtp: true,
        message: 'OTP verification required due to multiple failed login attempts'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment failed login attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      user.lastFailedLoginAt = new Date();

      // If 5 failed attempts, require OTP
      if (user.failedLoginAttempts >= 5) {
        user.loginOtpRequired = true;
        await user.save();

        // Send OTP
        try {
          await otpService.sendOTP(user.email, 'login_verification');
        } catch (otpError) {
          console.error('Failed to send OTP:', otpError);
        }

        return res.status(403).json({
          success: false,
          needOtp: true,
          message: 'Multiple failed attempts detected. OTP sent to your email.'
        });
      }

      await user.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        attemptsRemaining: 5 - user.failedLoginAttempts
      });
    }

    // Password correct - reset failed attempts
    user.failedLoginAttempts = 0;
    user.loginOtpRequired = false;
    user.lastFailedLoginAt = undefined;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Verify OTP for login
 */
exports.verifyLoginOtp = async (req, res) => {
  try {
    const { emailOrPhoneOrUsername, otp } = req.body;

    if (!emailOrPhoneOrUsername || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and OTP'
      });
    }

    // Find user
    const user = await User.findOne({
      $or: [
        { email: emailOrPhoneOrUsername.toLowerCase() },
        { username: emailOrPhoneOrUsername }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify OTP
    const result = await otpService.verifyOTP(user.email, otp, 'login_verification');

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Invalid or expired OTP'
      });
    }

    // Reset login security
    user.failedLoginAttempts = 0;
    user.loginOtpRequired = false;
    user.lastFailedLoginAt = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'OTP verified successfully. You can now login.',
      verified: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Resend OTP for login
 */
exports.resendLoginOtp = async (req, res) => {
  try {
    const { emailOrPhoneOrUsername } = req.body;

    if (!emailOrPhoneOrUsername) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or username'
      });
    }

    // Find user
    const user = await User.findOne({
      $or: [
        { email: emailOrPhoneOrUsername.toLowerCase() },
        { username: emailOrPhoneOrUsername }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Send OTP
    const result = await otpService.sendOTP(user.email, 'login_verification');

    res.json({
      success: true,
      message: 'OTP sent to your email',
      data: {
        expireAt: new Date(Date.now() + parseInt(process.env.OTP_TTL_MINUTES || 15) * 60 * 1000)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
