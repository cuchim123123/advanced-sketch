/**
 * Email Value Object
 * Encapsulates email validation and normalization
 */
const { BadRequestError } = require('../../../../utils/errors');

class Email {
  /**
   * @param {string} value 
   */
  constructor(value) {
    if (!value) {
      throw new BadRequestError('Email is required');
    }

    const normalized = value.trim().toLowerCase();

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      throw new BadRequestError('Invalid email format');
    }

    this._value = normalized;
    Object.freeze(this);
  }

  /**
   * @returns {string}
   */
  get value() {
    return this._value;
  }

  /**
   * @param {Email} other 
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof Email)) return false;
    return this.value === other.value;
  }
}

module.exports = Email;
