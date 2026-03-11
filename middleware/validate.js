// middleware/validate.js
// express-validator schemas for all routes

const { body, validationResult } = require('express-validator');

/**
 * Runs validation and returns errors if any.
 * Place this AFTER the validation chain in a route.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);

    // API request → JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(400).json({ success: false, message: messages[0], errors: messages });
    }

    // EJS view → re-render with error flash
    return res.status(400).json({ success: false, message: messages[0] });
  }
  next();
};

// ── Signup Validation ─────────────────────────────────────────────────────────
const signupValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),

  handleValidationErrors,
];

// ── Login Validation ──────────────────────────────────────────────────────────
const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  handleValidationErrors,
];

// ── Transfer Validation ───────────────────────────────────────────────────────
const transferValidator = [
  body('recipient')
    .trim()
    .notEmpty().withMessage('Recipient is required'),

  body('transferMethod')
    .isIn(['email', 'phone', 'upi']).withMessage('Invalid transfer method'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 1, max: 100000 }).withMessage('Amount must be between ₹1 and ₹1,00,000'),

  body('note')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Note cannot exceed 100 characters'),

  handleValidationErrors,
];

module.exports = { signupValidator, loginValidator, transferValidator };
