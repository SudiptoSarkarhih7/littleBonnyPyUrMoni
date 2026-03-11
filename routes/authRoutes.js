// routes/authRoutes.js

const express = require('express');
const router = express.Router();

const { signup, login, logout, showSignupPage, showLoginPage } = require('../controllers/authController');
const { signupValidator, loginValidator } = require('../middleware/validate');
const { guestOnly } = require('../middleware/auth');

// ── Page Routes ───────────────────────────────────────────────────────────────
router.get('/signup', guestOnly, showSignupPage);
router.get('/login',  guestOnly, showLoginPage);

// ── API Routes ────────────────────────────────────────────────────────────────
router.post('/signup', guestOnly, signupValidator, signup);
router.post('/login',  guestOnly, loginValidator,  login);
router.get('/logout', logout);

module.exports = router;
