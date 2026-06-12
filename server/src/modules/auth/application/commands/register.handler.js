/**
 * Register Command Handler
 */
const UserEntity = require('../../domain/user.entity');
const { ConflictError } = require('../../../../utils/errors');
const { generateVerificationToken, generateToken } = require('../../../../utils');
const { TOKEN_EXPIRY } = require('../../../../config/constants');

class RegisterHandler {
  /**
   * @param {import('../../infrastructure/user.repository')} userRepository 
   * @param {import('../../infrastructure/mailer.adapter')} mailerAdapter 
   */
  constructor(userRepository, mailerAdapter) {
    this.userRepository = userRepository;
    this.mailerAdapter = mailerAdapter;
  }

  /**
   * Execute registration command
   * @param {Object} command 
   * @param {string} command.username
   * @param {string} command.email
   * @param {string} command.password
   */
  async execute({ username, email, password }) {
    // 1. Check if user exists
    const existingUser = await this.userRepository.checkExistsOr(email, username);
    if (existingUser) {
      throw new ConflictError(
        existingUser.email.value === email.trim().toLowerCase()
          ? 'Email already registered'
          : 'Username already taken'
      );
    }

    // 2. Create Domain Entity
    const user = UserEntity.create({ username, email, password });

    // 3. Generate verification token & set it on entity
    const { token, hashedToken, expiresAt } = generateVerificationToken(TOKEN_EXPIRY.EMAIL_VERIFICATION);
    user.setVerificationToken(hashedToken, expiresAt);

    // 4. Persist to database
    const savedUser = await this.userRepository.save(user);

    // 5. Trigger side-effects (Email) - Non-blocking
    this.mailerAdapter.sendVerificationEmail(savedUser, token).catch(err => {
      console.error('Email send failed:', err.message);
    });

    // 6. Return Data
    return {
      user: savedUser.toJSON(),
      token: generateToken(savedUser.id)
    };
  }
}

module.exports = RegisterHandler;
