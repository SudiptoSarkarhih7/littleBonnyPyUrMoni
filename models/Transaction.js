// models/Transaction.js
// Stores all money transfer records

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    // Reference to sender User document
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Reference to receiver User document
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Transfer amount in INR
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Minimum transfer amount is ₹1'],
      max: [100000, 'Maximum transfer amount is ₹1,00,000 per transaction'],
    },

    // Transaction status
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },

    // Optional note/description
    note: {
      type: String,
      trim: true,
      maxlength: [100, 'Note cannot exceed 100 characters'],
      default: '',
    },

    // How the receiver was identified (for audit trail)
    transferMethod: {
      type: String,
      enum: ['email', 'phone', 'upi'],
      required: true,
    },

    // Unique transaction reference ID (like UTR number in real UPI)
    referenceId: {
      type: String,
      unique: true,
    },

    // Sender balance snapshot for audit
    senderBalanceBefore: {
      type: Number,
    },

    senderBalanceAfter: {
      type: Number,
    },

    // Failure reason if status is 'failed'
    failureReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // createdAt = timestamp of transaction
  }
);

// ─── Pre-save Hook ────────────────────────────────────────────────────────────

// Auto-generate a unique reference ID (like UTR)
transactionSchema.pre('save', function (next) {
  if (!this.referenceId) {
    // Format: PP + timestamp + random 6 chars
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.referenceId = `PP${timestamp}${random}`;
  }
  next();
});

// ─── Index ────────────────────────────────────────────────────────────────────
// Speed up queries for a user's transaction history
transactionSchema.index({ sender: 1, createdAt: -1 });
transactionSchema.index({ receiver: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
