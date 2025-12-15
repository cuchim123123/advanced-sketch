/**
 * Auth Service Unit Tests
 * Tests for authentication business logic
 */

const authService = require('../../services/auth.service');
const { User } = require('../../models');
const { createTestUser, createVerifiedUser } = require('../helpers/testData');
const { ConflictError, UnauthorizedError, BadRequestError, NotFoundError, EmailVerificationRequiredError } = require('../../utils/errors');

describe('Auth Service', () => {
  // =============================================================================
  // REGISTER
  // =============================================================================
  
  describe('register()', () => {
    test('should successfully register a new user', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123'
      };

      const result = await authService.register(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.username).toBe('newuser');
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.isEmailVerified).toBe(false);
      expect(result.user).not.toHaveProperty('password');
    });

    test('should throw ConflictError on duplicate email', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      await expect(
        authService.register({
          username: 'different',
          email: 'duplicate@example.com',
          password: 'password123'
        })
      ).rejects.toThrow(ConflictError);
    });

    test('should throw ConflictError on duplicate username', async () => {
      await createTestUser({ username: 'takenuser' });

      await expect(
        authService.register({
          username: 'takenuser',
          email: 'different@example.com',
          password: 'password123'
        })
      ).rejects.toThrow(ConflictError);
    });

    test('should normalize email and trim username', async () => {
      const result = await authService.register({
        username: '  CamelCase  ',
        email: '  UPPERCASE@EXAMPLE.COM  ',
        password: 'password123'
      });

      // Username is trimmed but preserves case for display
      expect(result.user.username).toBe('CamelCase');
      // Email is normalized (lowercased + trimmed)
      expect(result.user.email).toBe('uppercase@example.com');
    });

    test('should generate email verification token', async () => {
      const result = await authService.register({
        username: 'newuser',
        email: 'verify@example.com',
        password: 'password123'
      });

      const user = await User.findById(result.user.id);
      expect(user.emailVerificationToken).toBeDefined();
      expect(user.emailVerificationTokenExpiresAt).toBeDefined();
    });
  });

  // =============================================================================
  // LOGIN
  // =============================================================================

  describe('login()', () => {
    test('should login with email', async () => {
      const user = await createVerifiedUser({
        email: 'login@example.com'
        // password will be 'password123' - hashed by model's pre-save hook
      });

      const result = await authService.login({
        emailOrPhoneOrUsername: 'login@example.com',
        password: 'password123'
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('login@example.com');
    });

    test('should login with username', async () => {
      const user = await createVerifiedUser({
        username: 'loginuser'
      });

      const result = await authService.login({
        emailOrPhoneOrUsername: 'loginuser',
        password: 'password123'
      });

      expect(result.user.username).toBe('loginuser');
    });

    test('should throw EmailVerificationRequiredError if email not verified', async () => {
      await createTestUser({
        email: 'unverified@example.com',
        isEmailVerified: false
      });

      await expect(
        authService.login({
          emailOrPhoneOrUsername: 'unverified@example.com',
          password: 'password123'
        })
      ).rejects.toThrow(EmailVerificationRequiredError);
    });

    test('should throw UnauthorizedError on wrong password', async () => {
      await createVerifiedUser({
        email: 'wrongpass@example.com'
      });

      await expect(
        authService.login({
          emailOrPhoneOrUsername: 'wrongpass@example.com',
          password: 'wrongpass'
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    test('should throw UnauthorizedError if user not found', async () => {
      // Security best practice: don't reveal if user exists
      await expect(
        authService.login({
          emailOrPhoneOrUsername: 'nonexistent@example.com',
          password: 'password123'
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    test('should be case-insensitive for email', async () => {
      await createVerifiedUser({
        email: 'mixedcase@example.com'
      });

      const result = await authService.login({
        emailOrPhoneOrUsername: 'MIXEDCASE@EXAMPLE.COM',
        password: 'password123'
      });

      expect(result.user.email).toBe('mixedcase@example.com');
    });
  });

  // =============================================================================
  // VERIFY EMAIL
  // =============================================================================

  describe('verifyEmail()', () => {
    test('should verify email with valid token', async () => {
      const user = await createTestUser({
        email: 'verify@example.com',
        isEmailVerified: false,
        emailVerificationToken: await require('../../utils/crypto.util').hashSHA256('valid-token')
      });

      const result = await authService.verifyEmail(user._id.toString(), 'valid-token');

      expect(result.message).toContain('verified');
      
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isEmailVerified).toBe(true);
      expect(updatedUser.emailVerificationToken).toBeUndefined();
    });

    test('should throw BadRequestError on invalid token', async () => {
      const user = await createTestUser({
        emailVerificationToken: await require('../../utils/crypto.util').hashSHA256('correct-token')
      });

      await expect(
        authService.verifyEmail(user._id.toString(), 'wrong-token')
      ).rejects.toThrow(BadRequestError);
    });

    test('should throw BadRequestError if already verified', async () => {
      const user = await createVerifiedUser();

      await expect(
        authService.verifyEmail(user._id.toString(), 'any-token')
      ).rejects.toThrow(BadRequestError);
    });

    test('should throw BadRequestError if token expired', async () => {
      const user = await createTestUser({
        emailVerificationToken: await require('../../utils/crypto.util').hashSHA256('token'),
        emailVerificationTokenExpiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      });

      await expect(
        authService.verifyEmail(user._id.toString(), 'token')
      ).rejects.toThrow();
    });
  });

  // =============================================================================
  // CHECK AVAILABILITY
  // =============================================================================

  describe('checkAvailability()', () => {
    test('should return available: true for non-existent username', async () => {
      const result = await authService.checkAvailability({ username: 'newuser' });

      expect(result.username.available).toBe(true);
    });

    test('should return available: false for existing username', async () => {
      await createTestUser({ username: 'takenuser' });

      const result = await authService.checkAvailability({ username: 'takenuser' });

      expect(result.username.available).toBe(false);
    });

    test('should return available: true for non-existent email', async () => {
      const result = await authService.checkAvailability({ email: 'new@example.com' });

      expect(result.email.available).toBe(true);
    });

    test('should return available: false for existing email', async () => {
      await createTestUser({ email: 'taken@example.com' });

      const result = await authService.checkAvailability({ email: 'taken@example.com' });

      expect(result.email.available).toBe(false);
    });

    test('should be case-insensitive for username', async () => {
      await createTestUser({ username: 'mixedcase' });

      const result = await authService.checkAvailability({ username: 'MIXEDCASE' });

      expect(result.username.available).toBe(false);
    });

    test('should be case-insensitive for email', async () => {
      await createTestUser({ email: 'mixed@example.com' });

      const result = await authService.checkAvailability({ email: 'MIXED@EXAMPLE.COM' });

      expect(result.email.available).toBe(false);
    });

    test('should check both username and email', async () => {
      await createTestUser({ 
        username: 'user1', 
        email: 'email1@example.com' 
      });

      const result = await authService.checkAvailability({ 
        username: 'user1', 
        email: 'newemail@example.com' 
      });

      expect(result.username.available).toBe(false);
      expect(result.email.available).toBe(true);
    });
  });

  // =============================================================================
  // GET PROFILE
  // =============================================================================

  describe('getProfile()', () => {
    test('should return user profile without password', async () => {
      const user = await createVerifiedUser({
        username: 'profileuser',
        email: 'profile@example.com'
      });

      const profile = await authService.getProfile(user._id);

      expect(profile.username).toBe('profileuser');
      expect(profile.email).toBe('profile@example.com');
      expect(profile).not.toHaveProperty('password');
    });

    test('should throw NotFoundError if user not found', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        authService.getProfile(fakeId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // =============================================================================
  // UPDATE PROFILE
  // =============================================================================

  describe('updateProfile()', () => {
    test('should update username', async () => {
      const user = await createVerifiedUser({ username: 'oldname' });

      const updated = await authService.updateProfile(user._id, {
        username: 'newname'
      });

      expect(updated.username).toBe('newname');
    });

    test('should throw ConflictError if username already taken', async () => {
      await createVerifiedUser({ username: 'taken' });
      const user2 = await createVerifiedUser({ 
        username: 'available',
        email: 'user2@example.com'
      });

      await expect(
        authService.updateProfile(user2._id, { username: 'taken' })
      ).rejects.toThrow(ConflictError);
    });

    test('should not allow email change', async () => {
      const user = await createVerifiedUser({ email: 'original@example.com' });

      const updated = await authService.updateProfile(user._id, {
        email: 'newemail@example.com'
      });

      expect(updated.email).toBe('original@example.com');
    });
  });
});
