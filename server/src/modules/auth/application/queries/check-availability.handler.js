/**
 * Check Availability Query Handler
 */
const { normalizeEmail, normalizeUsername, caseInsensitiveRegex } = require('../../../../utils');

class CheckAvailabilityHandler {
  /**
   * @param {import('../../infrastructure/user.repository')} userRepository 
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Execute check availability query
   * @param {Object} query 
   * @param {string} [query.username]
   * @param {string} [query.email]
   */
  async execute({ username, email }) {
    const result = { username: null, email: null };

    if (username) {
      const exists = await this.userRepository.findByUsername(username);
      result.username = {
        value: username,
        available: !exists,
        message: exists ? 'Username is already taken' : 'Username is available'
      };
    }

    if (email) {
      const exists = await this.userRepository.findByEmail(email);
      result.email = {
        value: email,
        available: !exists,
        message: exists ? 'Email is already registered' : 'Email is available'
      };
    }

    return result;
  }
}

module.exports = CheckAvailabilityHandler;
