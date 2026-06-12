/**
 * Mailer Adapter
 * Implements Port for sending emails
 */
const { sendEmail } = require('../../../libs/mailer.lib');
const emailTemplates = require('../../../libs/emailTemplates.lib');

class MailerAdapter {
  /**
   * @param {Object} user 
   * @param {string} token 
   */
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?uid=${user.id}&token=${token}`;

    console.log('\n========================================');
    console.log(`✉️  [DEVELOPMENT] Verification Link for ${user.email.value}:`);
    console.log(`   ${verificationUrl}`);
    console.log(`========================================\n`);

    try {
      await sendEmail({
        to: user.email.value,
        subject: 'Verify Your Email - CoPad',
        html: emailTemplates.welcomeVerifyEmail({ username: user.username, verificationUrl }),
        text: emailTemplates.plainText.welcomeVerify({ username: user.username, verificationUrl })
      });
    } catch (error) {
      console.log(`ℹ️  Note: SMTP is not configured or failed (${error.message}). You can use the link above to verify the account.`);
    }
  }

  /**
   * @param {Object} user 
   * @param {string} resetToken 
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?uid=${user.id}&token=${resetToken}`;

    console.log('\n========================================');
    console.log(`✉️  [DEVELOPMENT] Password Reset Link for ${user.email.value}:`);
    console.log(`   ${resetUrl}`);
    console.log(`========================================\n`);

    try {
      await sendEmail({
        to: user.email.value,
        subject: 'Password Reset Request - CoPad',
        html: emailTemplates.resetPassword({ username: user.username, resetUrl }),
        text: emailTemplates.plainText.resetPassword({ username: user.username, resetUrl })
      });
    } catch (error) {
      console.log(`ℹ️  Note: SMTP is not configured or failed (${error.message}). You can use the link above to reset the password.`);
    }
  }
}

module.exports = MailerAdapter;
