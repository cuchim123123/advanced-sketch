/**
 * Auth Module Composition Root
 * Instantiates dependencies and wires them together
 */
const express = require('express');
const { protect } = require('../../middleware/auth.middleware');

// Adapters / Repositories
const UserRepository = require('./infrastructure/user.repository');
const MailerAdapter = require('./infrastructure/mailer.adapter');

// Application Handlers
const RegisterHandler = require('./application/commands/register.handler');
const LoginHandler = require('./application/commands/login.handler');
const VerifyEmailHandler = require('./application/commands/verify-email.handler');
const ResendVerificationHandler = require('./application/commands/resend-verification.handler');
const UpdateProfileHandler = require('./application/commands/update-profile.handler');
const GetProfileHandler = require('./application/queries/get-profile.handler');
const CheckAvailabilityHandler = require('./application/queries/check-availability.handler');

// Controller
const AuthController = require('./presentation/auth.controller');

// 1. Instantiate Infrastructure
const userRepository = new UserRepository();
const mailerAdapter = new MailerAdapter();

// 2. Instantiate Handlers (Inject Infrastructure)
const registerHandler = new RegisterHandler(userRepository, mailerAdapter);
const loginHandler = new LoginHandler(userRepository);
const verifyEmailHandler = new VerifyEmailHandler(userRepository);
const resendVerificationHandler = new ResendVerificationHandler(userRepository, mailerAdapter);
const updateProfileHandler = new UpdateProfileHandler(userRepository);
const getProfileHandler = new GetProfileHandler(userRepository);
const checkAvailabilityHandler = new CheckAvailabilityHandler(userRepository);

// 3. Instantiate Controller (Inject Handlers)
const authController = new AuthController({
  registerHandler,
  loginHandler,
  verifyEmailHandler,
  resendVerificationHandler,
  updateProfileHandler,
  getProfileHandler,
  checkAvailabilityHandler
});

// 4. Create and Configure Router
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);
router.get('/check-availability', authController.checkAvailability);

// Protected routes
router.use('/me', protect);
router.get('/me', authController.getProfile);

router.use('/profile', protect);
router.put('/profile', authController.updateProfile);

module.exports = router;
