// controllers/authController.js
// Handles user registration and login

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// ─── Helper: Sign JWT & Set Cookie ───────────────────────────────────────────

const signTokenAndRespond = (user, statusCode, res, redirectTo = null) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  // Set HTTP-only cookie (secure in production)
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  // API response
  if (res.req.headers.accept && res.req.headers.accept.includes('application/json')) {
    return res.status(statusCode).json({
      success: true,
      token,
      user: user.toSafeObject(),
    });
  }

  // Browser redirect
  res.redirect(redirectTo || '/dashboard');
};

// ─── Signup ───────────────────────────────────────────────────────────────────

/**
 * POST /auth/signup
 * Register a new user and auto-login
 */
const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Check if email already registered
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered.' });
  }

  // Check phone uniqueness (if provided)
  if (phone) {
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(409).json({ success: false, message: 'Phone number already registered.' });
    }
  }

  // Create user (password hashed via pre-save hook)
  const user = await User.create({
    name,
    email,
    phone: phone || undefined,
    password,
    walletBalance: parseFloat(process.env.DEFAULT_WALLET_BALANCE) || 1000,
  });

  signTokenAndRespond(user, 201, res, '/dashboard');
});

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 * Authenticate user and issue JWT
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Fetch user WITH password field (normally excluded)
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: 'Account is deactivated.' });
  }

  signTokenAndRespond(user, 200, res, '/dashboard');
});

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * GET /auth/logout
 * Clear JWT cookie and redirect to login
 */
const logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/auth/login');
};

// ─── Render Pages ─────────────────────────────────────────────────────────────

const showSignupPage = (req, res) => {
  res.render('auth/signup', { title: 'Create Account — PayPulse' });
};

const showLoginPage = (req, res) => {
  res.render('auth/login', { title: 'Sign In — PayPulse' });
};

module.exports = { signup, login, logout, showSignupPage, showLoginPage };
