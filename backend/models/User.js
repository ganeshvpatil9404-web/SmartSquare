const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  currency: { type: String, default: 'INR' },
  monthlyIncome: { type: Number, default: 0 },
  smartSquareIndex: {
    score: { type: Number, default: 500 },
    grade: { type: String, default: 'C' },
    savings: { type: Number, default: 50 },
    spending: { type: Number, default: 50 },
    debt: { type: Number, default: 50 },
    goals: { type: Number, default: 50 },
    investment: { type: Number, default: 50 },
    lastUpdated: { type: Date, default: Date.now }
  },
  preferences: {
    theme: { type: String, default: 'dark' },
    notifications: { type: Boolean, default: true },
    budgetAlerts: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
