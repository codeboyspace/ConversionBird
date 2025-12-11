const mongoose = require('mongoose');

const usageRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  apiKeyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: true
  },
  formatFrom: {
    type: String,
    required: true
  },
  formatTo: {
    type: String,
    required: true
  },
  bytesIn: {
    type: Number,
    required: true
  },
  bytesOut: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    default: 'success'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UsageRecord', usageRecordSchema);