/**
 * Auth Controller
 * Maps HTTP requests to Commands/Queries and passes them to Handlers
 */
const { response } = require('../../../utils');

class AuthController {
  constructor({
    registerHandler,
    loginHandler,
    verifyEmailHandler,
    resendVerificationHandler,
    updateProfileHandler,
    getProfileHandler,
    checkAvailabilityHandler
  }) {
    this.registerHandler = registerHandler;
    this.loginHandler = loginHandler;
    this.verifyEmailHandler = verifyEmailHandler;
    this.resendVerificationHandler = resendVerificationHandler;
    this.updateProfileHandler = updateProfileHandler;
    this.getProfileHandler = getProfileHandler;
    this.checkAvailabilityHandler = checkAvailabilityHandler;

    // Bind methods to ensure `this` context
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.verifyEmail = this.verifyEmail.bind(this);
    this.resendVerificationEmail = this.resendVerificationEmail.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.checkAvailability = this.checkAvailability.bind(this);
  }

  async register(req, res, next) {
    try {
      const result = await this.registerHandler.execute(req.body);
      res.status(201).json(response.created(result, 'Registration successful. Please check your email to verify your account.'));
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await this.loginHandler.execute(req.body);
      res.json(response.success(result, 'Login successful'));
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      const result = await this.verifyEmailHandler.execute({
        uid: req.query.uid,
        token: req.query.token
      });
      res.json(response.success(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async resendVerificationEmail(req, res, next) {
    try {
      const result = await this.resendVerificationHandler.execute({ email: req.body.email });
      res.json(response.success(result, result.message));
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const result = await this.getProfileHandler.execute({ userId: req.user.id });
      res.json(response.success({ user: result }));
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const result = await this.updateProfileHandler.execute({
        userId: req.user.id,
        updates: req.body
      });
      res.json(response.success({ user: result }, 'Profile updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  async checkAvailability(req, res, next) {
    try {
      const result = await this.checkAvailabilityHandler.execute({
        username: req.query.username,
        email: req.query.email
      });
      res.json(response.success(result));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
