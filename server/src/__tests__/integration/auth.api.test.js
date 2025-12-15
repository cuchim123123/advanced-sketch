/**
 * Auth API Integration Tests
 */

const request = require('supertest');
const app = require('../../app');
const { User } = require('../../models');
const { createVerifiedUser } = require('../helpers/testData');

describe('Auth API', () => {
  // =============================================================================
  // REGISTER
  // =============================================================================

  describe('POST /api/auth/register', () => {
    test('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('newuser@example.com');
    });

    test('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser'
          // missing email and password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 409 for duplicate email', async () => {
      await createVerifiedUser({ email: 'duplicate@example.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'different',
          email: 'duplicate@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(409);
    });
  });

  // =============================================================================
  // LOGIN
  // =============================================================================

  describe('POST /api/auth/login', () => {
    test('should login with verified user', async () => {
      await createVerifiedUser({
        email: 'login@example.com',
        username: 'loginuser'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrPhoneOrUsername: 'login@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });

    test('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrPhoneOrUsername: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });

    test('should return 403 for unverified user', async () => {
      await User.create({
        username: 'unverified',
        email: 'unverified@example.com',
        password: 'password123',
        isEmailVerified: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrPhoneOrUsername: 'unverified@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(403);
    });
  });

  // =============================================================================
  // CHECK AVAILABILITY
  // =============================================================================

  describe('GET /api/auth/check-availability', () => {
    test('should return available for non-existent username', async () => {
      const response = await request(app)
        .get('/api/auth/check-availability')
        .query({ username: 'availableuser' });

      expect(response.status).toBe(200);
      expect(response.body.data.username.available).toBe(true);
    });

    test('should return unavailable for existing username', async () => {
      await createVerifiedUser({ username: 'takenuser' });

      const response = await request(app)
        .get('/api/auth/check-availability')
        .query({ username: 'takenuser' });

      expect(response.status).toBe(200);
      expect(response.body.data.username.available).toBe(false);
    });

    test('should check both username and email', async () => {
      await createVerifiedUser({
        username: 'existinguser',
        email: 'existing@example.com'
      });

      const response = await request(app)
        .get('/api/auth/check-availability')
        .query({
          username: 'existinguser',
          email: 'existing@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.username.available).toBe(false);
      expect(response.body.data.email.available).toBe(false);
    });
  });

  // =============================================================================
  // PROTECTED ROUTES
  // =============================================================================

  describe('GET /api/auth/me', () => {
    test('should return user profile with valid token', async () => {
      // First register to get a token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'profileuser',
          email: 'profile@example.com',
          password: 'password123'
        });

      // Verify email first
      await User.findOneAndUpdate(
        { email: 'profile@example.com' },
        { isEmailVerified: true }
      );

      // Login to get fresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrPhoneOrUsername: 'profile@example.com',
          password: 'password123'
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('profile@example.com');
    });

    test('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    test('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  // =============================================================================
  // UPDATE PROFILE
  // =============================================================================

  describe('PUT /api/auth/profile', () => {
    test('should update username', async () => {
      await createVerifiedUser({
        username: 'oldusername',
        email: 'update@example.com'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrPhoneOrUsername: 'update@example.com',
          password: 'password123'
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'newusername' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('newusername');
    });
  });
});
