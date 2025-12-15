/**
 * Password Service Unit Tests
 */

const passwordService = require('../../services/password.service');
const { User } = require('../../models');
const { 
  NotFoundError, 
  BadRequestError, 
  TokenExpiredError, 
  UnauthorizedError,
  hashSHA256
} = require('../../utils');
const { createVerifiedUser } = require('../helpers/testData');

describe('Password Service', () => {
  // =============================================================================
  // REQUEST RESET
  // =============================================================================

  describe('requestReset()', () => {
    test('should send reset email for valid email', async () => {
      await createVerifiedUser({
        email: 'reset@example.com'
      });

      const result = await passwordService.requestReset('reset@example.com');

      expect(result.message).toContain('sent');
      
      // Verify token was saved
      const user = await User.findOne({ email: 'reset@example.com' });
      expect(user.resetPasswordToken).toBeDefined();
      expect(user.resetPasswordTokenExpiresAt).toBeDefined();
    });

    test('should send reset email for valid username', async () => {
      await createVerifiedUser({
        username: 'resetuser',
        email: 'resetuser@example.com'
      });

      const result = await passwordService.requestReset('resetuser');

      expect(result.message).toContain('sent');
    });

    test('should return success for non-existent user (prevents enumeration)', async () => {
      const result = await passwordService.requestReset('nonexistent@example.com');

      // Should not reveal if user exists
      expect(result.message).toContain('sent');
    });

    test('should return success for empty input', async () => {
      const result = await passwordService.requestReset('');

      expect(result.message).toBeDefined();
    });

    test('should be case-insensitive for email', async () => {
      await createVerifiedUser({
        email: 'casetest@example.com'
      });

      const result = await passwordService.requestReset('CASETEST@EXAMPLE.COM');

      expect(result.message).toContain('sent');
      
      const user = await User.findOne({ email: 'casetest@example.com' });
      expect(user.resetPasswordToken).toBeDefined();
    });
  });

  // =============================================================================
  // RESET PASSWORD
  // =============================================================================

  describe('resetPassword()', () => {
    test('should reset password with valid token', async () => {
      const plainToken = 'valid-reset-token';
      const hashedToken = hashSHA256(plainToken);
      
      const user = await createVerifiedUser({
        email: 'validreset@example.com'
      });
      
      await User.findByIdAndUpdate(user._id, {
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpiresAt: new Date(Date.now() + 3600000)
      });

      const result = await passwordService.resetPassword(
        user._id.toString(),
        plainToken,
        'newpassword123'
      );

      expect(result.message).toContain('successful');
      
      // Verify token was cleared
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.resetPasswordToken).toBeUndefined();
    });

    test('should throw BadRequestError for invalid token', async () => {
      const user = await createVerifiedUser({
        email: 'invalidtoken@example.com'
      });
      
      await User.findByIdAndUpdate(user._id, {
        resetPasswordToken: hashSHA256('correct-token'),
        resetPasswordTokenExpiresAt: new Date(Date.now() + 3600000)
      });

      await expect(
        passwordService.resetPassword(user._id.toString(), 'wrong-token', 'newpassword123')
      ).rejects.toThrow(BadRequestError);
    });

    test('should throw TokenExpiredError for expired token', async () => {
      const user = await createVerifiedUser({
        email: 'expiredtoken@example.com'
      });
      
      await User.findByIdAndUpdate(user._id, {
        resetPasswordToken: hashSHA256('expired-token'),
        resetPasswordTokenExpiresAt: new Date(Date.now() - 1000) // Expired
      });

      await expect(
        passwordService.resetPassword(user._id.toString(), 'expired-token', 'newpassword123')
      ).rejects.toThrow(TokenExpiredError);
    });

    test('should throw BadRequestError if no reset token exists', async () => {
      const user = await createVerifiedUser({
        email: 'notoken@example.com'
      });

      await expect(
        passwordService.resetPassword(user._id.toString(), 'any-token', 'newpassword123')
      ).rejects.toThrow(BadRequestError);
    });

    test('should throw BadRequestError for short password', async () => {
      const plainToken = 'valid-token';
      const user = await createVerifiedUser({
        email: 'shortpass@example.com'
      });
      
      await User.findByIdAndUpdate(user._id, {
        resetPasswordToken: hashSHA256(plainToken),
        resetPasswordTokenExpiresAt: new Date(Date.now() + 3600000)
      });

      await expect(
        passwordService.resetPassword(user._id.toString(), plainToken, '123')
      ).rejects.toThrow(BadRequestError);
    });
  });

  // =============================================================================
  // CHANGE PASSWORD (Authenticated)
  // =============================================================================

  describe('changePassword()', () => {
    test('should change password with correct current password', async () => {
      const user = await createVerifiedUser({
        email: 'changepass@example.com'
        // Default password is 'password123'
      });

      const result = await passwordService.changePassword(
        user._id.toString(),
        'password123',
        'newpassword456'
      );

      expect(result.message).toContain('changed');
      
      // Verify new password works
      const updatedUser = await User.findById(user._id).select('+password');
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare('newpassword456', updatedUser.password);
      expect(isMatch).toBe(true);
    });

    test('should throw UnauthorizedError for wrong current password', async () => {
      const user = await createVerifiedUser({
        email: 'wrongcurrent@example.com'
      });

      await expect(
        passwordService.changePassword(user._id.toString(), 'wrongpassword', 'newpassword123')
      ).rejects.toThrow(UnauthorizedError);
    });

    test('should throw NotFoundError for non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439011';

      await expect(
        passwordService.changePassword(fakeUserId, 'password123', 'newpassword123')
      ).rejects.toThrow(NotFoundError);
    });

    test('should throw BadRequestError if new password same as current', async () => {
      const user = await createVerifiedUser({
        email: 'samepass@example.com'
      });

      await expect(
        passwordService.changePassword(user._id.toString(), 'password123', 'password123')
      ).rejects.toThrow(BadRequestError);
    });

    test('should throw BadRequestError for short new password', async () => {
      const user = await createVerifiedUser({
        email: 'shortchange@example.com'
      });

      await expect(
        passwordService.changePassword(user._id.toString(), 'password123', '123')
      ).rejects.toThrow(BadRequestError);
    });
  });
});
