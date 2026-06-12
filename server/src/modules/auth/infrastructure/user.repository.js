/**
 * User Repository (Mongoose Adapter)
 * Implements Port for User Domain Entity
 */
const UserModel = require('../../../models/user.model');
const UserEntity = require('../domain/user.entity');
const { caseInsensitiveRegex, normalizeEmail, normalizeUsername } = require('../../../utils');

class UserRepository {
  /**
   * Map Mongoose document to Domain Entity
   * @param {Object} doc 
   * @returns {UserEntity|null}
   */
  _toDomain(doc) {
    if (!doc) return null;
    return new UserEntity({
      id: doc._id.toString(),
      username: doc.username,
      email: doc.email,
      phone: doc.phone,
      password: doc.password, // Included for logic, ensure we don't expose it
      avatar: doc.avatar,
      role: doc.role,
      verified: doc.verified,
      isEmailVerified: doc.isEmailVerified,
      emailVerificationToken: doc.emailVerificationToken,
      emailVerificationTokenExpiresAt: doc.emailVerificationTokenExpiresAt,
      resetPasswordToken: doc.resetPasswordToken,
      resetPasswordTokenExpiresAt: doc.resetPasswordTokenExpiresAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  }

  /**
   * Map Domain Entity to Mongoose persistence format
   * @param {UserEntity} entity 
   * @returns {Object}
   */
  _toPersistence(entity) {
    return {
      username: entity.username,
      email: entity.email.value,
      phone: entity.phone,
      password: entity.password,
      avatar: entity.avatar,
      role: entity.role,
      verified: entity.verified,
      isEmailVerified: entity.isEmailVerified,
      emailVerificationToken: entity.emailVerificationToken,
      emailVerificationTokenExpiresAt: entity.emailVerificationTokenExpiresAt,
      resetPasswordToken: entity.resetPasswordToken,
      resetPasswordTokenExpiresAt: entity.resetPasswordTokenExpiresAt
    };
  }

  /**
   * @param {string} id 
   * @returns {Promise<UserEntity|null>}
   */
  async findById(id) {
    const doc = await UserModel.findById(id).select('+password');
    return this._toDomain(doc);
  }

  /**
   * @param {string} email 
   * @returns {Promise<UserEntity|null>}
   */
  async findByEmail(email) {
    const doc = await UserModel.findOne({ email: normalizeEmail(email) }).select('+password');
    return this._toDomain(doc);
  }

  /**
   * @param {string} username 
   * @returns {Promise<UserEntity|null>}
   */
  async findByUsername(username) {
    const doc = await UserModel.findOne({ 
      username: caseInsensitiveRegex(normalizeUsername(username)) 
    }).select('+password');
    return this._toDomain(doc);
  }

  /**
   * @param {string} identifier (email, username, or phone)
   * @returns {Promise<UserEntity|null>}
   */
  async findByIdentifier(identifier) {
    if (!identifier) return null;
    const normalizedInput = identifier.trim();
    
    const doc = await UserModel.findOne({
      $or: [
        { email: normalizeEmail(normalizedInput) },
        { username: caseInsensitiveRegex(normalizedInput) },
        { phone: normalizedInput }
      ]
    }).select('+password');
    
    return this._toDomain(doc);
  }

  /**
   * @param {string} email 
   * @param {string} username 
   * @returns {Promise<UserEntity|null>}
   */
  async checkExistsOr(email, username) {
    const doc = await UserModel.findOne({
      $or: [
        { email: normalizeEmail(email) },
        { username: caseInsensitiveRegex(normalizeUsername(username)) }
      ]
    });
    return this._toDomain(doc);
  }

  /**
   * @param {UserEntity} entity 
   * @returns {Promise<UserEntity>}
   */
  async save(entity) {
    const persistenceData = this._toPersistence(entity);

    if (entity.id) {
      // Update existing
      const doc = await UserModel.findById(entity.id).select('+password');
      if (!doc) throw new Error('User not found in database');
      
      Object.assign(doc, persistenceData);
      
      // Mongoose save triggers pre-save hooks (like bcrypt hash)
      await doc.save();
      return this._toDomain(doc);
    } else {
      // Create new
      const doc = new UserModel(persistenceData);
      await doc.save();
      return this._toDomain(doc);
    }
  }

  /**
   * @param {string} candidatePassword 
   * @param {string} hashedPassword 
   * @returns {Promise<boolean>}
   */
  async comparePassword(candidatePassword, hashedPassword) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(candidatePassword, hashedPassword);
  }
}

module.exports = UserRepository;
