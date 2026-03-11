// controllers/transferController.js
// Handles money transfers using Mongoose sessions (atomic transactions)

const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// ─── Helper: Find Recipient by method ────────────────────────────────────────

const findRecipient = async (recipient, transferMethod) => {
  let query = {};

  switch (transferMethod) {
    case 'email':
      query = { email: recipient.toLowerCase().trim() };
      break;
    case 'phone':
      query = { phone: recipient.trim() };
      break;
    case 'upi':
      query = { upiId: recipient.toLowerCase().trim() };
      break;
    default:
      throw new AppError('Invalid transfer method.', 400);
  }

  return await User.findOne(query);
};

// ─── Transfer Money ───────────────────────────────────────────────────────────

/**
 * POST /transfer
 * Atomically deducts from sender and credits receiver using Mongoose session.
 *
 * IMPORTANT: Requires MongoDB Replica Set for multi-document transactions.
 * For local dev: start mongod with --replSet rs0 and run rs.initiate() in shell.
 */
const transferMoney = asyncHandler(async (req, res) => {
  const { recipient, transferMethod, amount, note } = req.body;
  const transferAmount = parseFloat(amount);

  // ── 1. Find Receiver ───────────────────────────────────────────────────────
  const receiver = await findRecipient(recipient, transferMethod);

  if (!receiver) {
    return res.status(404).json({
      success: false,
      message: `No user found with that ${transferMethod}.`,
    });
  }

  // Prevent self-transfer
  if (receiver._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot transfer money to yourself.',
    });
  }

  // ── 2. Start Mongoose Session (for atomic transaction) ─────────────────────
  const session = await mongoose.startSession();

  let transaction;

  try {
    await session.withTransaction(async () => {
      // ── 2a. Re-fetch sender WITH session (locks the document) ──────────────
      const sender = await User.findById(req.user._id).session(session);

      if (!sender) throw new AppError('Sender account not found.', 404);

      // ── 2b. Check sufficient balance ───────────────────────────────────────
      if (sender.walletBalance < transferAmount) {
        throw new AppError(
          `Insufficient balance. Your current balance is ₹${sender.walletBalance.toFixed(2)}.`,
          400
        );
      }

      const senderBalanceBefore = sender.walletBalance;

      // ── 2c. Deduct from sender ─────────────────────────────────────────────
      sender.walletBalance = parseFloat((sender.walletBalance - transferAmount).toFixed(2));
      await sender.save({ session });

      // ── 2d. Credit receiver ────────────────────────────────────────────────
      const receiverDoc = await User.findById(receiver._id).session(session);
      receiverDoc.walletBalance = parseFloat((receiverDoc.walletBalance + transferAmount).toFixed(2));
      await receiverDoc.save({ session });

      // ── 2e. Save transaction record ────────────────────────────────────────
      const [savedTx] = await Transaction.create(
        [
          {
            sender: sender._id,
            receiver: receiver._id,
            amount: transferAmount,
            status: 'success',
            note: note || '',
            transferMethod,
            senderBalanceBefore,
            senderBalanceAfter: sender.walletBalance,
          },
        ],
        { session }
      );

      transaction = savedTx;
    });

    // Transaction committed
    return res.status(200).json({
      success: true,
      message: `₹${transferAmount.toFixed(2)} sent to ${receiver.name} successfully!`,
      transaction: {
        referenceId: transaction.referenceId,
        amount: transaction.amount,
        receiver: { name: receiver.name, upiId: receiver.upiId },
        status: transaction.status,
        timestamp: transaction.createdAt,
      },
    });
  } catch (error) {
    // Transaction automatically rolled back by withTransaction()

    // Save a failed transaction record (outside session since it rolled back)
    try {
      await Transaction.create({
        sender: req.user._id,
        receiver: receiver._id,
        amount: transferAmount,
        status: 'failed',
        note: note || '',
        transferMethod,
        failureReason: error.message,
      });
    } catch (logError) {
      // Non-critical: failed transaction log itself failed
      console.error('Could not log failed transaction:', logError.message);
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Transfer failed. Please try again.',
    });
  } finally {
    session.endSession();
  }
});

// ─── Get Transaction History ──────────────────────────────────────────────────

/**
 * GET /transactions
 * Returns paginated transaction history for the logged-in user.
 */
const getTransactions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Find all transactions where user is sender OR receiver
  const [transactions, total] = await Promise.all([
    Transaction.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .populate('sender', 'name email upiId')
      .populate('receiver', 'name email upiId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Transaction.countDocuments({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    }),
  ]);

  // Tag each transaction as debit or credit from user's perspective
  const tagged = transactions.map((tx) => {
    const isDebit = tx.sender._id.toString() === req.user._id.toString();
    return {
      ...tx.toObject(),
      type: isDebit ? 'debit' : 'credit',
      counterparty: isDebit ? tx.receiver : tx.sender,
    };
  });

  // JSON API response
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(200).json({
      success: true,
      data: tagged,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }

  // EJS page
  res.render('transactions', {
    title: 'Transaction History — PayPulse',
    transactions: tagged,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// ─── Dashboard Data ───────────────────────────────────────────────────────────

/**
 * GET /dashboard
 * Renders dashboard with wallet balance and recent transactions.
 */
const getDashboard = asyncHandler(async (req, res) => {
  // Fetch fresh user balance
  const user = await User.findById(req.user._id);

  // Last 5 transactions
  const recentTransactions = await Transaction.find({
    $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    status: 'success',
  })
    .populate('sender', 'name email upiId')
    .populate('receiver', 'name email upiId')
    .sort({ createdAt: -1 })
    .limit(5);

  // Tag debit/credit
  const tagged = recentTransactions.map((tx) => {
    const isDebit = tx.sender._id.toString() === req.user._id.toString();
    return {
      ...tx.toObject(),
      type: isDebit ? 'debit' : 'credit',
      counterparty: isDebit ? tx.receiver : tx.sender,
    };
  });

  // Stats
  const [totalSent, totalReceived, txCount] = await Promise.all([
    Transaction.aggregate([
      { $match: { sender: user._id, status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { receiver: user._id, status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.countDocuments({
      $or: [{ sender: user._id }, { receiver: user._id }],
      status: 'success',
    }),
  ]);

  res.render('dashboard', {
    title: 'Dashboard — PayPulse',
    user,
    recentTransactions: tagged,
    stats: {
      totalSent: totalSent[0]?.total || 0,
      totalReceived: totalReceived[0]?.total || 0,
      txCount,
    },
  });
});

// ─── Send Money Page ──────────────────────────────────────────────────────────

const getSendMoneyPage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.render('send-money', {
    title: 'Send Money — PayPulse',
    user,
  });
});

module.exports = { transferMoney, getTransactions, getDashboard, getSendMoneyPage };
