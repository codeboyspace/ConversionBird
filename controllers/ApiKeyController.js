const ApiKey = require('../models/ApiKey');

exports.createApiKey = async (req, res) => {
  try {
    const { label } = req.body;
    const userId = req.user._id;

    if (!label) {
      return res.status(400).json({ error: 'Label is required' });
    }

    const key = ApiKey.generateKey();
    const apiKey = new ApiKey({
      key,
      userId,
      label
    });

    await apiKey.save();

    res.status(201).json({
      message: 'API key created successfully',
      apiKey: {
        id: apiKey._id,
        key: apiKey.key,
        label: apiKey.label,
        createdAt: apiKey.createdAt,
        isActive: apiKey.isActive
      }
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
};

exports.getApiKeys = async (req, res) => {
  try {
    const userId = req.user._id;
    const apiKeys = await ApiKey.find({ userId }).select('-__v').sort({ createdAt: -1 });

    res.json({
      apiKeys: apiKeys.map(key => ({
        id: key._id,
        label: key.label,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        isActive: key.isActive
      }))
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Failed to get API keys' });
  }
};

exports.updateApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, isActive } = req.body;
    const userId = req.user._id;

    const apiKey = await ApiKey.findOne({ _id: id, userId });
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    if (label !== undefined) apiKey.label = label;
    if (isActive !== undefined) apiKey.isActive = isActive;

    await apiKey.save();

    res.json({
      message: 'API key updated successfully',
      apiKey: {
        id: apiKey._id,
        label: apiKey.label,
        isActive: apiKey.isActive
      }
    });
  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
};

exports.deleteApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const apiKey = await ApiKey.findOneAndDelete({ _id: id, userId });
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
};