/**
 * Validation Unit Tests
 * Based on SPEC VALIDATION section
 * Tests input validation rules defined in the specification
 */

const { User, Room, OTP } = require('../../models');
const { createTestUser, createVerifiedUser } = require('../helpers/testData');
const { VALIDATION, ROOM } = require('../../config/constants');

describe('Validation Rules', () => {
  // =============================================================================
  // USER VALIDATION - Based on SPEC Data Models 6.1
  // =============================================================================

  describe('User Model Validation', () => {
    describe('Username Validation', () => {
      test('should reject username shorter than 3 characters', async () => {
        await expect(
          User.create({
            username: 'ab',
            email: 'test@example.com',
            password: 'password123'
          })
        ).rejects.toThrow(/at least 3/);
      });

      test('should reject username longer than 30 characters', async () => {
        const longUsername = 'a'.repeat(31);
        await expect(
          User.create({
            username: longUsername,
            email: 'test@example.com',
            password: 'password123'
          })
        ).rejects.toThrow(/cannot exceed 30/);
      });

      test('should accept username with 3-30 characters', async () => {
        const user = await User.create({
          username: 'validusername',
          email: 'test@example.com',
          password: 'password123'
        });
        expect(user.username).toBe('validusername');
      });

      test('should trim username whitespace', async () => {
        const user = await User.create({
          username: '  trimmedname  ',
          email: 'trim@example.com',
          password: 'password123'
        });
        expect(user.username).toBe('trimmedname');
      });
    });

    describe('Email Validation', () => {
      test('should reject invalid email format', async () => {
        await expect(
          User.create({
            username: 'testuser',
            email: 'notanemail',
            password: 'password123'
          })
        ).rejects.toThrow(/valid email/);
      });

      test('should reject email without domain', async () => {
        await expect(
          User.create({
            username: 'testuser',
            email: 'user@',
            password: 'password123'
          })
        ).rejects.toThrow(/valid email/);
      });

      test('should lowercase email', async () => {
        const user = await User.create({
          username: 'testuser',
          email: 'UPPERCASE@EXAMPLE.COM',
          password: 'password123'
        });
        expect(user.email).toBe('uppercase@example.com');
      });

      test('should trim email whitespace', async () => {
        const user = await User.create({
          username: 'testuser',
          email: '  space@example.com  ',
          password: 'password123'
        });
        expect(user.email).toBe('space@example.com');
      });
    });

    describe('Password Validation', () => {
      test('should reject password shorter than 6 characters', async () => {
        await expect(
          User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: '12345'
          })
        ).rejects.toThrow(/at least 6/);
      });

      test('should accept password with 6+ characters', async () => {
        const user = await User.create({
          username: 'testuser',
          email: 'test@example.com',
          password: '123456'
        });
        expect(user).toBeDefined();
      });

      test('should hash password before saving', async () => {
        const user = await User.create({
          username: 'testuser',
          email: 'test@example.com',
          password: 'plainpassword'
        });
        
        // Get user with password
        const userWithPassword = await User.findById(user._id).select('+password');
        expect(userWithPassword.password).not.toBe('plainpassword');
        expect(userWithPassword.password.startsWith('$2')).toBe(true); // bcrypt hash
      });
    });

    describe('Role Validation', () => {
      test('should default role to user', async () => {
        const user = await User.create({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });
        expect(user.role).toBe('user');
      });

      test('should reject invalid role', async () => {
        await expect(
          User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: 'superadmin'
          })
        ).rejects.toThrow();
      });

      test('should accept valid roles', async () => {
        const adminUser = await User.create({
          username: 'admin',
          email: 'admin@example.com',
          password: 'password123',
          role: 'admin'
        });
        expect(adminUser.role).toBe('admin');
      });
    });

    describe('Phone Validation', () => {
      test('should accept valid phone format', async () => {
        const user = await User.create({
          username: 'phoneuser',
          email: 'phone@example.com',
          password: 'password123',
          phone: '+1234567890'
        });
        expect(user.phone).toBe('+1234567890');
      });

      test('should reject invalid phone format', async () => {
        await expect(
          User.create({
            username: 'phoneuser',
            email: 'phone@example.com',
            password: 'password123',
            phone: 'notaphone'
          })
        ).rejects.toThrow(/valid phone/);
      });

      test('should allow null/undefined phone', async () => {
        const user = await User.create({
          username: 'nophone',
          email: 'nophone@example.com',
          password: 'password123'
        });
        expect(user.phone).toBeUndefined();
      });
    });
  });

  // =============================================================================
  // ROOM VALIDATION - Based on SPEC Data Models 6.2
  // =============================================================================

  describe('Room Model Validation', () => {
    let owner;

    beforeEach(async () => {
      owner = await createVerifiedUser({
        username: 'roomowner',
        email: 'owner@example.com'
      });
    });

    describe('Name Validation', () => {
      test('should require room name', async () => {
        await expect(
          Room.create({
            owner: owner._id
          })
        ).rejects.toThrow(/required/);
      });

      test('should reject name longer than 100 characters', async () => {
        const longName = 'a'.repeat(101);
        await expect(
          Room.create({
            name: longName,
            owner: owner._id
          })
        ).rejects.toThrow(/cannot exceed 100/);
      });

      test('should trim room name', async () => {
        const room = await Room.create({
          name: '  Trimmed Room  ',
          owner: owner._id
        });
        expect(room.name).toBe('Trimmed Room');
      });
    });

    describe('MaxParticipants Validation', () => {
      test('should default to 10 participants', async () => {
        const room = await Room.create({
          name: 'Default Room',
          owner: owner._id
        });
        expect(room.maxParticipants).toBe(10);
      });

      test('should reject less than 2 participants', async () => {
        await expect(
          Room.create({
            name: 'Small Room',
            owner: owner._id,
            maxParticipants: 1
          })
        ).rejects.toThrow();
      });

      test('should reject more than 50 participants', async () => {
        await expect(
          Room.create({
            name: 'Large Room',
            owner: owner._id,
            maxParticipants: 51
          })
        ).rejects.toThrow();
      });

      test('should accept 2-50 participants', async () => {
        const room = await Room.create({
          name: 'Custom Room',
          owner: owner._id,
          maxParticipants: 25
        });
        expect(room.maxParticipants).toBe(25);
      });
    });

    describe('Code Generation', () => {
      test('should auto-generate room code', async () => {
        const room = await Room.create({
          name: 'Auto Code Room',
          owner: owner._id
        });
        expect(room.code).toBeDefined();
        expect(room.code).toHaveLength(8);
      });

      test('should generate uppercase codes', async () => {
        const room = await Room.create({
          name: 'Upper Room',
          owner: owner._id
        });
        expect(room.code).toMatch(/^[A-Z0-9]+$/);
      });
    });

    describe('Canvas Settings', () => {
      test('should have default canvas settings', async () => {
        const room = await Room.create({
          name: 'Canvas Room',
          owner: owner._id
        });
        expect(room.canvasSettings.width).toBe(1920);
        expect(room.canvasSettings.height).toBe(1080);
        expect(room.canvasSettings.backgroundColor).toBe('#ffffff');
      });

      test('should accept custom canvas settings', async () => {
        const room = await Room.create({
          name: 'Custom Canvas',
          owner: owner._id,
          canvasSettings: {
            width: 1600,
            height: 900,
            backgroundColor: '#000000'
          }
        });
        expect(room.canvasSettings.width).toBe(1600);
        expect(room.canvasSettings.height).toBe(900);
        expect(room.canvasSettings.backgroundColor).toBe('#000000');
      });
    });
  });

  // =============================================================================
  // OTP VALIDATION - Based on SPEC Data Models 6.5
  // =============================================================================

  describe('OTP Model Validation', () => {
    describe('Purpose Validation', () => {
      test('should default purpose to email_verification', async () => {
        const otp = await OTP.create({
          email: 'test@example.com',
          code: '123456',
          expiresAt: new Date(Date.now() + 60000)
        });
        expect(otp.purpose).toBe('email_verification');
      });

      test('should accept valid purposes', async () => {
        const purposes = ['email_verification', 'password_reset', 'two_factor', 'login_verification'];
        
        for (const purpose of purposes) {
          const otp = await OTP.create({
            email: `${purpose}@example.com`,
            code: '123456',
            purpose,
            expiresAt: new Date(Date.now() + 60000)
          });
          expect(otp.purpose).toBe(purpose);
        }
      });

      test('should reject invalid purpose', async () => {
        await expect(
          OTP.create({
            email: 'test@example.com',
            code: '123456',
            purpose: 'invalid_purpose',
            expiresAt: new Date(Date.now() + 60000)
          })
        ).rejects.toThrow();
      });
    });

    describe('Attempts Validation', () => {
      test('should default attempts to 0', async () => {
        const otp = await OTP.create({
          email: 'test@example.com',
          code: '123456',
          expiresAt: new Date(Date.now() + 60000)
        });
        expect(otp.attempts).toBe(0);
      });

      test('should have max attempts of 5', async () => {
        await expect(
          OTP.create({
            email: 'test@example.com',
            code: '123456',
            attempts: 6,
            expiresAt: new Date(Date.now() + 60000)
          })
        ).rejects.toThrow();
      });
    });

    describe('Email Normalization', () => {
      test('should lowercase email', async () => {
        const otp = await OTP.create({
          email: 'UPPER@EXAMPLE.COM',
          code: '123456',
          expiresAt: new Date(Date.now() + 60000)
        });
        expect(otp.email).toBe('upper@example.com');
      });
    });
  });

  // =============================================================================
  // CONSTANTS VALIDATION - Based on SPEC Appendix 11.1
  // =============================================================================

  describe('Application Constants', () => {
    test('should have correct validation constants', () => {
      expect(VALIDATION.USERNAME_MIN_LENGTH).toBe(3);
      expect(VALIDATION.USERNAME_MAX_LENGTH).toBe(30);
      expect(VALIDATION.PASSWORD_MIN_LENGTH).toBe(6);
      expect(VALIDATION.OTP_LENGTH).toBe(6);
      expect(VALIDATION.MAX_OTP_ATTEMPTS).toBe(5);
    });

    test('should have correct room constants', () => {
      expect(ROOM.MIN_PARTICIPANTS).toBe(2);
      expect(ROOM.MAX_PARTICIPANTS).toBe(50);
      expect(ROOM.DEFAULT_MAX_PARTICIPANTS).toBe(10);
    });
  });
});
