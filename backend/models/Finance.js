const mongoose = require('mongoose');

// ─── Account Model ───────────────────────────────────────────────
const accountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['savings', 'checking', 'credit', 'investment', 'loan', 'ppf', 'fd', 'wallet'], required: true },
  bankName: { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  balance: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  color: { type: String, default: '#3b82f6' },
  icon: { type: String, default: '🏦' },
  isActive: { type: Boolean, default: true },
  interestRate: { type: Number, default: 0 },
  lastSynced: { type: Date, default: Date.now }
}, { timestamps: true });

// ─── Budget Model ────────────────────────────────────────────────
const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, required: true },
  limit: { type: Number, required: true, min: 0 },
  spent: { type: Number, default: 0 },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  color: { type: String, default: '#3b82f6' },
  alertAt: { type: Number, default: 80, min: 0, max: 100 },
  isActive: { type: Boolean, default: true },
  notes: { type: String, maxlength: 300 }
}, { timestamps: true });

budgetSchema.index({ userId: 1, month: 1, year: 1 });
budgetSchema.virtual('percentage').get(function() {
  return this.limit > 0 ? Math.round((this.spent / this.limit) * 100) : 0;
});
budgetSchema.virtual('remaining').get(function() {
  return Math.max(0, this.limit - this.spent);
});
budgetSchema.virtual('isOverBudget').get(function() {
  return this.spent > this.limit;
});
budgetSchema.set('toJSON', { virtuals: true });

// ─── Goal Model ──────────────────────────────────────────────────
const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  targetAmount: { type: Number, required: true, min: 0 },
  currentAmount: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'INR' },
  targetDate: { type: Date, required: true },
  category: { type: String, enum: ['home', 'education', 'travel', 'emergency', 'retirement', 'vehicle', 'wedding', 'business', 'other'], default: 'other' },
  icon: { type: String, default: '🎯' },
  color: { type: String, default: '#3b82f6' },
  monthlyContribution: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'paused', 'cancelled'], default: 'active' },
  linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  contributions: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    note: String
  }],
  priority: { type: Number, default: 3, min: 1, max: 5 }
}, { timestamps: true });

goalSchema.virtual('progress').get(function() {
  return this.targetAmount > 0 ? Math.round((this.currentAmount / this.targetAmount) * 100) : 0;
});
goalSchema.virtual('remaining').get(function() {
  return Math.max(0, this.targetAmount - this.currentAmount);
});
goalSchema.virtual('daysLeft').get(function() {
  const diff = this.targetDate - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});
goalSchema.virtual('monthsLeft').get(function() {
  const diff = this.targetDate - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30)));
});
goalSchema.set('toJSON', { virtuals: true });

module.exports = {
  Account: mongoose.model('Account', accountSchema),
  Budget: mongoose.model('Budget', budgetSchema),
  Goal: mongoose.model('Goal', goalSchema)
};
