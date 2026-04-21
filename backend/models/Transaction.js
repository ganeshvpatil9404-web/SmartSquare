const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['income', 'expense', 'transfer', 'investment'], required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  category: {
    type: String,
    enum: ['salary', 'freelance', 'investment_return', 'other_income',
           'housing', 'food', 'transport', 'entertainment', 'health',
           'utilities', 'education', 'shopping', 'travel', 'savings',
           'emi', 'insurance', 'other_expense'],
    required: true
  },
  subcategory: { type: String, trim: true },
  description: { type: String, trim: true, maxlength: 200 },
  merchant: { type: String, trim: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  date: { type: Date, default: Date.now, index: true },
  tags: [{ type: String, trim: true }],
  isRecurring: { type: Boolean, default: false },
  recurringFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly', null], default: null },
  status: { type: String, enum: ['completed', 'pending', 'failed'], default: 'completed' },
  notes: { type: String, maxlength: 500 },
  attachments: [{ name: String, url: String }],
  location: { city: String, country: String },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'netbanking', 'cheque', 'other'], default: 'upi' }
}, { timestamps: true });

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, type: 1 });

transactionSchema.statics.getMonthlySummary = async function(userId, year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end }, status: 'completed' } },
    { $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
    }},
    { $project: { type: '$_id', total: 1, count: 1, _id: 0 } }
  ]);
};

transactionSchema.statics.getCategoryBreakdown = async function(userId, year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense', date: { $gte: start, $lte: end }, status: 'completed' } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]);
};

transactionSchema.statics.getLast6MonthsCashflow = async function(userId) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: sixMonthsAgo }, status: 'completed' } },
    { $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
        total: { $sum: '$amount' }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);
