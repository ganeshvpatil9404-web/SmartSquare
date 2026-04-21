const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { Account, Budget, Goal } = require('../models/Finance');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// ─── Smart Square Index Calculator ───────────────────────────────
// Scoring algorithm (0-100 per pillar, weighted average → 0-1000)
// Savings (25%) · Spending (20%) · Debt (20%) · Goals (20%) · Investment (15%)

async function calculateSmartIndex(userId, monthlyIncome) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = new Date(year, month - 1, 1);

  const [txnSummary, accounts, budgets, goals] = await Promise.all([
    Transaction.getMonthlySummary(userId, year, month),
    Account.find({ userId, isActive: true }),
    Budget.find({ userId, month, year, isActive: true }),
    Goal.find({ userId, status: 'active' })
  ]);

  const summary = txnSummary.reduce((acc, t) => ({ ...acc, [t.type]: t.total }), {});
  const income = summary.income || monthlyIncome || 1;
  const expense = summary.expense || 0;
  const invested = summary.investment || 0;
  const saved = Math.max(0, income - expense);
  const savingsRate = saved / income;

  // 1. Savings Score (0-100)
  let savingsScore = Math.min(100, Math.round(savingsRate * 250)); // 40% rate = 100pts

  // 2. Spending Score (0-100) — how well they follow budget
  let spendingScore = 70;
  if (budgets.length > 0) {
    const overBudget = budgets.filter(b => b.spent > b.limit).length;
    spendingScore = Math.round(((budgets.length - overBudget) / budgets.length) * 100);
  } else if (income > 0) {
    const spendRatio = expense / income;
    spendingScore = Math.max(0, Math.round((1 - spendRatio) * 100));
  }

  // 3. Debt Score (0-100) — lower debt ratio = better
  const totalAssets = accounts.filter(a => !['credit','loan'].includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const totalDebt = accounts.filter(a => ['credit','loan'].includes(a.type)).reduce((s, a) => s + Math.abs(a.balance), 0);
  let debtScore = 100;
  if (totalAssets > 0) {
    const debtRatio = totalDebt / (totalAssets + totalDebt);
    debtScore = Math.max(0, Math.round((1 - debtRatio) * 100));
  } else if (totalDebt > 0) {
    debtScore = 20;
  }

  // 4. Goals Score (0-100) — average progress across active goals
  let goalsScore = 50;
  if (goals.length > 0) {
    const avgProgress = goals.reduce((s, g) => s + (g.currentAmount / g.targetAmount), 0) / goals.length;
    goalsScore = Math.round(avgProgress * 100);
  }

  // 5. Investment Score (0-100)
  let investScore = 0;
  const investRate = invested / income;
  investScore = Math.min(100, Math.round(investRate * 500)); // 20% invested = 100pts

  // Weighted final score → 0-1000
  const score = Math.round(
    (savingsScore * 0.25 + spendingScore * 0.20 + debtScore * 0.20 + goalsScore * 0.20 + investScore * 0.15) * 10
  );

  const grade = score >= 900 ? 'A+' : score >= 800 ? 'A' : score >= 750 ? 'A-' :
                score >= 700 ? 'B+' : score >= 650 ? 'B' : score >= 600 ? 'B-' :
                score >= 550 ? 'C+' : score >= 500 ? 'C' : score >= 400 ? 'D' : 'F';

  return { score, grade, savings: savingsScore, spending: spendingScore, debt: debtScore, goals: goalsScore, investment: investScore, lastUpdated: new Date() };
}

// GET /api/index/calculate
router.get('/calculate', protect, async (req, res) => {
  try {
    const index = await calculateSmartIndex(req.user._id, req.user.monthlyIncome);
    await User.findByIdAndUpdate(req.user._id, { smartSquareIndex: index });
    res.json({ success: true, data: index });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/index/dashboard
router.get('/dashboard', protect, async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [index, txnStats, accounts, budgets, goals, cashflow, categories, recentTxns] = await Promise.all([
      calculateSmartIndex(req.user._id, req.user.monthlyIncome),
      Transaction.getMonthlySummary(req.user._id, year, month),
      Account.find({ userId: req.user._id, isActive: true }),
      Budget.find({ userId: req.user._id, month, year, isActive: true }),
      Goal.find({ userId: req.user._id, status: 'active' }).limit(4),
      Transaction.getLast6MonthsCashflow(req.user._id),
      Transaction.getCategoryBreakdown(req.user._id, year, month),
      Transaction.find({ userId: req.user._id }).sort('-date').limit(10).populate('accountId', 'name type')
    ]);

    const summary = txnStats.reduce((acc, t) => ({ ...acc, [t.type]: t.total || 0 }), {});
    const netWorth = accounts.reduce((s, a) => {
      if (['credit','loan'].includes(a.type)) return s - Math.abs(a.balance);
      return s + a.balance;
    }, 0);
    const income = summary.income || req.user.monthlyIncome || 0;
    const expense = summary.expense || 0;
    const savingsRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : 0;

    await User.findByIdAndUpdate(req.user._id, { smartSquareIndex: index });

    res.json({
      success: true,
      data: {
        smartIndex: index,
        netWorth,
        income,
        expense,
        savingsRate: parseFloat(savingsRate),
        accounts,
        budgets,
        goals,
        cashflow,
        categories,
        recentTransactions: recentTxns,
        month, year,
        currency: req.user.currency
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/index/insights
router.get('/insights', protect, async (req, res) => {
  try {
    const now = new Date();
    const budgets = await Budget.find({ userId: req.user._id, month: now.getMonth() + 1, year: now.getFullYear() });
    const goals = await Goal.find({ userId: req.user._id, status: 'active' });
    const insights = [];

    // Over budget alerts
    budgets.forEach(b => {
      const pct = b.limit > 0 ? (b.spent / b.limit * 100) : 0;
      if (pct >= 90) {
        insights.push({ type: 'warn', title: `${b.category} over budget`, message: `You've used ${pct.toFixed(0)}% of your ₹${b.limit.toLocaleString()} ${b.category} budget.`, priority: 1 });
      }
    });

    // Goal near completion
    goals.forEach(g => {
      const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount * 100) : 0;
      if (pct >= 80) {
        insights.push({ type: 'good', title: `${g.name} nearly complete`, message: `Your "${g.name}" goal is ${pct.toFixed(0)}% funded — just ₹${(g.targetAmount - g.currentAmount).toLocaleString()} to go!`, priority: 2 });
      }
    });

    // Default encouraging insight
    if (insights.length === 0) {
      insights.push({ type: 'info', title: 'Keep it up!', message: 'Your finances look healthy this month. Add transactions to get more personalized insights.', priority: 3 });
    }

    res.json({ success: true, data: insights.sort((a, b) => a.priority - b.priority) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
