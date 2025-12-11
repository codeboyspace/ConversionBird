const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Generate a new API key
apiKeySchema.statics.generateKey = function() {
  return 'cb_' + crypto.randomBytes(32).toString('hex');
};

module.exports = mongoose.model('ApiKey', apiKeySchema);