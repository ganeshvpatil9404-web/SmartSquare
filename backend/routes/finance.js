const express = require('express');
const router = express.Router();
const { Account, Budget, Goal } = require('../models/Finance');
const { protect } = require('../middleware/auth');

// ─── ACCOUNTS ────────────────────────────────────────────────────

router.get('/accounts', protect, async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user._id, isActive: true }).sort('name');
    const totalBalance = accounts.reduce((sum, a) => {
      if (a.type === 'credit' || a.type === 'loan') return sum - Math.abs(a.balance);
      return sum + a.balance;
    }, 0);
    res.json({ success: true, data: accounts, totalBalance });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/accounts', protect, async (req, res) => {
  try {
    const account = await Account.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, message: 'Account added!', data: account });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.put('/accounts/:id', protect, async (req, res) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body, { new: true, runValidators: true }
    );
    if (!account) return res.status(404).json({ success: false, message: 'Account not found.' });
    res.json({ success: true, data: account });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/accounts/:id', protect, async (req, res) => {
  try {
    await Account.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isActive: false });
    res.json({ success: true, message: 'Account deactivated.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── BUDGETS ─────────────────────────────────────────────────────

router.get('/budgets', protect, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
    const budgets = await Budget.find({ userId: req.user._id, month: parseInt(month), year: parseInt(year), isActive: true });
    const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
    res.json({ success: true, data: budgets, summary: { totalLimit, totalSpent, totalRemaining: totalLimit - totalSpent } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/budgets', protect, async (req, res) => {
  try {
    const { category, month, year } = req.body;
    const existing = await Budget.findOne({ userId: req.user._id, category, month, year });
    if (existing) {
      const updated = await Budget.findByIdAndUpdate(existing._id, req.body, { new: true });
      return res.json({ success: true, message: 'Budget updated.', data: updated });
    }
    const budget = await Budget.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, message: 'Budget created!', data: budget });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.put('/budgets/:id', protect, async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id }, req.body, { new: true }
    );
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found.' });
    res.json({ success: true, data: budget });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/budgets/:id', protect, async (req, res) => {
  try {
    await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Budget deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── GOALS ───────────────────────────────────────────────────────

router.get('/goals', protect, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id, status: { $ne: 'cancelled' } }).sort('-priority');
    res.json({ success: true, data: goals });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/goals', protect, async (req, res) => {
  try {
    const goal = await Goal.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, message: 'Goal created!', data: goal });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.put('/goals/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id }, req.body, { new: true }
    );
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    res.json({ success: true, data: goal });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.post('/goals/:id/contribute', protect, async (req, res) => {
  try {
    const { amount, note } = req.body;
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    goal.currentAmount = Math.min(goal.targetAmount, goal.currentAmount + amount);
    goal.contributions.push({ amount, note });
    if (goal.currentAmount >= goal.targetAmount) goal.status = 'completed';
    await goal.save();
    res.json({ success: true, message: 'Contribution added!', data: goal });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.delete('/goals/:id', protect, async (req, res) => {
  try {
    await Goal.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { status: 'cancelled' });
    res.json({ success: true, message: 'Goal cancelled.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
