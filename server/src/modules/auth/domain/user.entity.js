/**
 * User Entity (Aggregate Root)
 */
const Email = require('./value-objects/email.vo');
const { BadRequestError, TokenExpiredError } = require('../../../utils/errors');

class UserEntity {
  /**
   * @param {Object} props 
   * @param {string} [props.id]
   * @param {string} props.username
   * @param {Email|string} props.email
   * @param {string} [props.phone]
   * @param {string} props.password
   * @param {string} [props.avatar]
   * @param {string} [props.role]
   * @param {boolean} [props.verified]
   * @param {boolean} [props.isEmailVerified]
   * @param {string} [props.emailVerificationToken]
   * @param {Date} [props.emailVerificationTokenExpiresAt]
   * @param {string} [props.resetPasswordToken]
   * @param {Date} [props.resetPasswordTokenExpiresAt]
   * @param {Date} [props.createdAt]
   * @param {Date} [props.updatedAt]
   */
  constructor(props) {
    this.id = props.id || null;
    this.username = props.username;
    this.email = props.email instanceof Email ? props.email : new Email(props.email);
    this.phone = props.phone || null;
    this.password = props.password;
    this.avatar = props.avatar || null;
    this.role = props.role || 'user';
    this.verified = props.verified || false;
    this.isEmailVerified = props.isEmailVerified || false;
    
    this.emailVerificationToken = props.emailVerificationToken || null;
    this.emailVerificationTokenExpiresAt = props.emailVerificationTokenExpiresAt || null;
    
    this.resetPasswordToken = props.resetPasswordToken || null;
    this.resetPasswordTokenExpiresAt = props.resetPasswordTokenExpiresAt || null;

    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  /**
   * Factory method to create a new user
   */
  static create({ username, email, password }) {
    if (!username || username.length < 3) {
      throw new BadRequestError('Username must be at least 3 characters');
    }
    if (!password || password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters');
    }

    return new UserEntity({
      username,
      email,
      password
    });
  }

  /**
   * Mark email verification token
   * @param {string} tokenHash 
   * @param {Date} expiresAt 
   */
  setVerificationToken(tokenHash, expiresAt) {
    this.emailVerificationToken = tokenHash;
    this.emailVerificationTokenExpiresAt = expiresAt;
    this.updatedAt = new Date();
  }

  /**
   * Verify email
   */
  verifyEmail() {
    if (this.isEmailVerified) {
      throw new BadRequestError('Email is already verified');
    }

    if (!this.emailVerificationToken) {
      throw new BadRequestError('No verification token found');
    }

    if (this.emailVerificationTokenExpiresAt && this.emailVerificationTokenExpiresAt < Date.now()) {
      throw new TokenExpiredError('Verification link has expired');
    }

    this.isEmailVerified = true;
    this.emailVerificationToken = null;
    this.emailVerificationTokenExpiresAt = null;
    this.updatedAt = new Date();
  }

  /**
   * Update Profile
   */
  updateProfile({ username, avatar, phone }) {
    if (username) {
      if (username.length < 3) throw new BadRequestError('Username must be at least 3 characters');
      this.username = username;
    }
    if (avatar !== undefined) this.avatar = avatar;
    if (phone !== undefined) this.phone = phone;
    
    this.updatedAt = new Date();
  }

  /**
   * To JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email.value,
      phone: this.phone,
      avatar: this.avatar,
      role: this.role,
      verified: this.verified,
      isEmailVerified: this.isEmailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = UserEntity;
