// middleware/auth.js
// JWT verification middleware for protected routes

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes — verifies JWT from cookie or Authorization header.
 * Attaches req.user for downstream use.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check for token in HTTP-only cookie (web browser)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fallback: Check Authorization header (API clients)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // API request → JSON error
      if (req.originalUrl.startsWith('/api') || req.headers['content-type'] === 'application/json') {
        return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
      }
      // Browser request → redirect to login
      return res.redirect('/auth/login');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user (exclude password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
      }
      res.clearCookie('token');
      return res.redirect('/auth/login');
    }

    // Attach user to request
    req.user = user;
    // Also expose to EJS views
    res.locals.user = user;

    next();
  } catch (error) {
    // Token invalid or expired
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }
};

/**
 * Guest-only middleware — redirects logged-in users away from login/signup pages.
 */
const guestOnly = (req, res, next) => {
  const token = req.cookies && req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect('/dashboard');
    } catch {
      // Invalid token, continue
    }
  }
  next();
};

module.exports = { protect, guestOnly };
