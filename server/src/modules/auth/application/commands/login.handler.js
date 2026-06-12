/**
 * Login Command Handler
 */
const { UnauthorizedError, EmailVerificationRequiredError } = require('../../../../utils/errors');
const { generateToken } = require('../../../../utils');

class LoginHandler {
  /**
   * @param {import('../../infrastructure/user.repository')} userRepository 
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Execute login command
   * @param {Object} command 
   * @param {string} command.emailOrPhoneOrUsername
   * @param {string} command.password
   */
  async execute({ emailOrPhoneOrUsername, password }) {
    const user = await this.userRepository.findByIdentifier(emailOrPhoneOrUsername);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValidPassword = await this.userRepository.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new EmailVerificationRequiredError(
        'Please verify your email before logging in. Check your inbox for the verification link.'
      );
    }

    return {
      user: user.toJSON(),
      token: generateToken(user.id)
    };
  }
}

module.exports = LoginHandler;
