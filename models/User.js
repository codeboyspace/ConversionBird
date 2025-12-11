const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'business'],
    default: 'free'
  },
  conversionsThisMonth: {
    type: Number,
    default: 0
  },
  razorpayCustomerId: {
    type: String,
    sparse: true
  },
  razorpaySubscriptionId: {
    type: String,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Reset monthly conversions (call this monthly)
userSchema.methods.resetMonthlyConversions = function() {
  this.conversionsThisMonth = 0;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);