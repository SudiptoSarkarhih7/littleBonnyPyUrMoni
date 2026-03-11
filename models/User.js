// models/User.js
// User model with embedded wallet balance and UPI ID

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },

    phone: {
      type: String,
      unique: true,
      sparse: true, // allows null but enforces unique when set
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries by default
    },

    // UPI ID: auto-generated as phone@paypulse or email-prefix@paypulse
    upiId: {
      type: String,
      unique: true,
      trim: true,
    },

    // Wallet balance in INR (stored as paisa to avoid float issues, but using Number for simplicity)
    walletBalance: {
      type: Number,
      default: parseFloat(process.env.DEFAULT_WALLET_BALANCE) || 1000,
      min: [0, 'Wallet balance cannot be negative'],
    },

    avatar: {
      type: String,
      default: '', // initials-based avatar generated on frontend
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save Hooks ──────────────────────────────────────────────────────────

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Auto-generate UPI ID if not provided
userSchema.pre('save', function (next) {
  if (!this.upiId) {
    // Generate UPI: phone@paypulse OR emailprefix@paypulse
    if (this.phone) {
      this.upiId = `${this.phone}@paypulse`;
    } else {
      const emailPrefix = this.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      this.upiId = `${emailPrefix}@paypulse`;
    }
  }
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Return safe user object (without password)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
