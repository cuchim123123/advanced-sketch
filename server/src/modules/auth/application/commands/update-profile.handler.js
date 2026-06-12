/**
 * Update Profile Command Handler
 */
const { NotFoundError, ConflictError } = require('../../../../utils/errors');

class UpdateProfileHandler {
  /**
   * @param {import('../../infrastructure/user.repository')} userRepository 
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Execute update profile command
   * @param {Object} command 
   * @param {string} command.userId
   * @param {Object} command.updates
   */
  async execute({ userId, updates }) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (updates.username && updates.username.toLowerCase() !== user.username.toLowerCase()) {
      const existingUser = await this.userRepository.findByUsername(updates.username);
      if (existingUser) {
        throw new ConflictError('Username already taken');
      }
    }

    user.updateProfile(updates);

    const savedUser = await this.userRepository.save(user);

    return savedUser.toJSON();
  }
}

module.exports = UpdateProfileHandler;
