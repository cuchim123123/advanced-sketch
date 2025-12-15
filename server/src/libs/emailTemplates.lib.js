/**
 * Email Templates Library
 * All email HTML templates are centralized here
 */

const APP_NAME = 'CoPad';
const PRIMARY_COLOR = '#10b981';

/**
 * Base email wrapper
 */
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #f9fafb; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    ${content}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      © ${new Date().getFullYear()} ${APP_NAME} - Collaborative Sketch App
    </p>
  </div>
</body>
</html>
`;

/**
 * CTA Button
 */
const ctaButton = (text, url) => `
<p style="margin: 30px 0; text-align: center;">
  <a href="${url}" 
     style="background-color: ${PRIMARY_COLOR}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
    ${text}
  </a>
</p>
`;

/**
 * Welcome & Verify Email (for new registration)
 */
const welcomeVerifyEmail = ({ username, verificationUrl }) => baseTemplate(`
  <h2 style="color: ${PRIMARY_COLOR}; margin: 0 0 20px 0; font-size: 24px;">Welcome to ${APP_NAME}!</h2>
  <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello <strong>${username}</strong>,</p>
  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
    Thank you for joining ${APP_NAME}! Please verify your email address to activate your account.
  </p>
  ${ctaButton('Verify Email', verificationUrl)}
  <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
  <p style="color: #6b7280; font-size: 14px; word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 4px;">
    ${verificationUrl}
  </p>
  <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
    This link will expire in 24 hours.
  </p>
`);

/**
 * Resend Verification Email
 */
const resendVerifyEmail = ({ username, verificationUrl }) => baseTemplate(`
  <h2 style="color: ${PRIMARY_COLOR}; margin: 0 0 20px 0; font-size: 24px;">Verify Your Email Address</h2>
  <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello <strong>${username}</strong>,</p>
  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
    You requested a new verification link. Click the button below to verify your email:
  </p>
  ${ctaButton('Verify Email', verificationUrl)}
  <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
  <p style="color: #6b7280; font-size: 14px; word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 4px;">
    ${verificationUrl}
  </p>
  <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
    This link will expire in 24 hours. If you didn't request this, please ignore this email.
  </p>
`);

/**
 * OTP Verification Email
 */
const otpEmail = ({ code, purpose, expiresInMinutes }) => {
  const purposeText = {
    email_verification: 'verify your email',
    password_reset: 'reset your password',
    two_factor: 'complete 2FA',
    login_verification: 'complete your login'
  }[purpose] || 'verify your identity';

  return baseTemplate(`
    <h2 style="color: ${PRIMARY_COLOR}; margin: 0 0 20px 0; font-size: 24px;">Verification Code</h2>
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello,</p>
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
      We received a request to ${purposeText}. Use the code below:
    </p>
    <div style="background-color: #f3f4f6; padding: 24px; text-align: center; margin: 24px 0; border-radius: 8px;">
      <h1 style="letter-spacing: 8px; color: #111827; font-size: 36px; margin: 0; font-family: monospace;">
        ${code}
      </h1>
    </div>
    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      This code will expire in <strong>${expiresInMinutes} minutes</strong>.
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
      If you didn't request this, please ignore this email.
    </p>
  `);
};

/**
 * Password Reset Email
 */
const passwordResetEmail = ({ resetUrl, expiresInMinutes }) => baseTemplate(`
  <h2 style="color: ${PRIMARY_COLOR}; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
    You requested to reset your password for your ${APP_NAME} account.
  </p>
  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
    Click the button below to set a new password:
  </p>
  ${ctaButton('Reset Password', resetUrl)}
  <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
  <p style="color: #6b7280; font-size: 14px; word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 4px;">
    ${resetUrl}
  </p>
  <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
    This link will expire in <strong>${expiresInMinutes} minutes</strong>. If you didn't request this, you can safely ignore this email.
  </p>
`);

/**
 * Plain text versions for email clients that don't support HTML
 */
const plainText = {
  welcomeVerify: ({ username, verificationUrl }) => 
    `Welcome to ${APP_NAME}!\n\nHello ${username},\n\nPlease verify your email by visiting:\n${verificationUrl}\n\nThis link expires in 24 hours.`,
  
  resendVerify: ({ username, verificationUrl }) =>
    `Verify Your Email\n\nHello ${username},\n\nVerify your email by visiting:\n${verificationUrl}\n\nThis link expires in 24 hours.`,
  
  otp: ({ code, expiresInMinutes }) =>
    `Your verification code is: ${code}\n\nThis code will expire in ${expiresInMinutes} minutes.`,
  
  passwordReset: ({ resetUrl, expiresInMinutes }) =>
    `Reset Your Password\n\nVisit this link to reset your password:\n${resetUrl}\n\nThis link expires in ${expiresInMinutes} minutes.`
};

module.exports = {
  welcomeVerifyEmail,
  resendVerifyEmail,
  otpEmail,
  passwordResetEmail,
  plainText
};
