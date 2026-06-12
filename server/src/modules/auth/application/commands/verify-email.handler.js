/**
 * Verify Email Command Handler
 */
const { NotFoundError, BadRequestError } = require('../../../../utils/errors');
const { verifyTokenHash } = require('../../../../utils');

class VerifyEmailHandler {
  /**
   * @param {import('../../infrastructure/user.repository')} userRepository 
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Execute verify email command
   * @param {Object} command 
   * @param {string} command.uid
   * @param {string} command.token
   */
  async execute({ uid, token }) {
    const user = await this.userRepository.findById(uid);

    if (!user) {
      throw new NotFoundError('User not found. This verification link may be outdated.');
    }

    if (!verifyTokenHash(token, user.emailVerificationToken)) {
      throw new BadRequestError('Invalid verification token');
    }

    // Call domain entity logic
    user.verifyEmail();

    await this.userRepository.save(user);

    return { message: 'Email verified successfully! You can now log in.' };
  }
}

module.exports = VerifyEmailHandler;
