// routes/transferRoutes.js

const express = require('express');
const router = express.Router();

const { transferMoney, getTransactions, getDashboard, getSendMoneyPage } = require('../controllers/transferController');
const { protect } = require('../middleware/auth');
const { transferValidator } = require('../middleware/validate');

// All routes require authentication
router.use(protect);

router.get('/dashboard',     getDashboard);
router.get('/send',          getSendMoneyPage);
router.post('/transfer',     transferValidator, transferMoney);
router.get('/transactions',  getTransactions);

module.exports = router;
