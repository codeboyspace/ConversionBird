const ApiKey = require('../models/ApiKey');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

// Accept either an API key (x-api-key) OR a user JWT (Authorization: Bearer ...)
const authenticateApiKeyOrToken = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      // Try API key flow
      const keyDoc = await ApiKey.findOne({ key: apiKey, isActive: true }).populate('userId');
      if (!keyDoc) {
        return res.status(401).json({ error: 'Invalid or inactive API key' });
      }
      await ApiKey.findByIdAndUpdate(keyDoc._id, { lastUsedAt: new Date() });
      req.user = keyDoc.userId;
      req.apiKey = keyDoc;
      return next();
    }

    // Try JWT flow
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'API key or access token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('authenticateApiKeyOrToken error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = {
  authenticateApiKey,
  authenticateApiKeyOrToken
};