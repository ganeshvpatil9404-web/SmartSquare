const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// GET /api/transactions
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, category, startDate, endDate, search, sort = '-date' } = req.query;
    const query = { userId: req.user._id };
    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (search) query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { merchant: { $regex: search, $options: 'i' } }
    ];

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('accountId', 'name bankName type');

    res.json({
      success: true,
      data: transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/transactions
router.post('/', protect, async (req, res) => {
  try {
    const txn = await Transaction.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, message: 'Transaction added!', data: txn });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/transactions/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const txn = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    res.json({ success: true, message: 'Transaction updated.', data: txn });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const txn = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    res.json({ success: true, message: 'Transaction deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transactions/summary/monthly
router.get('/summary/monthly', protect, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
    const summary = await Transaction.getMonthlySummary(req.user._id, parseInt(year), parseInt(month));
    const categories = await Transaction.getCategoryBreakdown(req.user._id, parseInt(year), parseInt(month));
    res.json({ success: true, data: { summary, categories, month: parseInt(month), year: parseInt(year) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transactions/cashflow
router.get('/cashflow', protect, async (req, res) => {
  try {
    const cashflow = await Transaction.getLast6MonthsCashflow(req.user._id);
    res.json({ success: true, data: cashflow });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transactions/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonth, lastMonth] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: req.user._id, date: { $gte: thisMonthStart }, status: 'completed' } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: { userId: req.user._id, date: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: 'completed' } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ])
    ]);

    const format = (arr) => arr.reduce((acc, i) => ({ ...acc, [i._id]: { total: i.total, count: i.count } }), {});
    res.json({ success: true, data: { thisMonth: format(thisMonth), lastMonth: format(lastMonth) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
