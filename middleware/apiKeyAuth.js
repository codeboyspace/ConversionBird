const ApiKey = require('../models/ApiKey');

const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const keyDoc = await ApiKey.findOne({ key: apiKey, isActive: true }).populate('userId');

    if (!keyDoc) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    // Update last used
    await ApiKey.findByIdAndUpdate(keyDoc._id, { lastUsedAt: new Date() });

    req.user = keyDoc.userId;
    req.apiKey = keyDoc;
    next();
  } catch (error) {
    console.error('API key auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = {
  authenticateApiKey
};