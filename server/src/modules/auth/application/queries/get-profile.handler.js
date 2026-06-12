/**
 * Get Profile Query Handler
 */
const { NotFoundError } = require('../../../../utils/errors');

class GetProfileHandler {
  /**
   * @param {import('../../infrastructure/user.repository')} userRepository 
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Execute get profile query
   * @param {Object} query 
   * @param {string} query.userId
   */
  async execute({ userId }) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.toJSON();
  }
}

module.exports = GetProfileHandler;
