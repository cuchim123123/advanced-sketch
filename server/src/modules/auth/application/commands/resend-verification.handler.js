/**
 * Resend Verification Command Handler
 */
const { NotFoundError, BadRequestError } = require('../../../../utils/errors');
const { generateVerificationToken } = require('../../../../utils');
const { TOKEN_EXPIRY } = require('../../../../config/constants');

class ResendVerificationHandler {
  /**
   * @param {import('../../infrastructure/user.repository')} userRepository 
   * @param {import('../../infrastructure/mailer.adapter')} mailerAdapter 
   */
  constructor(userRepository, mailerAdapter) {
    this.userRepository = userRepository;
    this.mailerAdapter = mailerAdapter;
  }

  /**
   * Execute resend verification email command
   * @param {Object} command 
   * @param {string} command.email
   */
  async execute({ email }) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestError('Email is already verified');
    }

    const { token, hashedToken, expiresAt } = generateVerificationToken(TOKEN_EXPIRY.EMAIL_VERIFICATION);
    user.setVerificationToken(hashedToken, expiresAt);

    await this.userRepository.save(user);

    // Non-blocking
    this.mailerAdapter.sendVerificationEmail(user, token).catch(err => {
      console.error('Email send failed:', err.message);
    });

    return { message: 'Verification email sent successfully. Please check your inbox.' };
  }
}

module.exports = ResendVerificationHandler;
