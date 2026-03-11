// middleware/errorHandler.js
// Centralised error handling middleware

/**
 * Custom error class with HTTP status code support
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguish operational vs programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler — must be registered LAST in Express middleware chain.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // ── Mongoose / MongoDB Errors ──────────────────────────────────────────────

  // Duplicate key error (e.g., email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    statusCode = 409;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('. ');
    statusCode = 400;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    message = 'Invalid ID format.';
    statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please log in again.';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token expired. Please log in again.';
    statusCode = 401;
  }

  // Log unexpected errors in development
  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('💥 Unhandled Error:', err);
  }

  // ── Response ───────────────────────────────────────────────────────────────

  // API request → JSON response
  if (req.originalUrl.startsWith('/api') || req.headers['content-type'] === 'application/json') {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
  }

  // Browser request → render error page or redirect
  if (statusCode === 401) {
    return res.redirect('/auth/login');
  }

  res.status(statusCode).render('error', {
    title: `Error ${statusCode}`,
    message,
    statusCode,
  });
};

/**
 * Async handler wrapper — catches async errors without try/catch in every controller
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, errorHandler, asyncHandler };
