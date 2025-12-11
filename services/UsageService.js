const UsageRecord = require('../models/UsageRecord');
const User = require('../models/User');

async function log(record) {
  try {
    const usageRecord = new UsageRecord(record);
    await usageRecord.save();
    return usageRecord;
  } catch (error) {
    console.error('Error logging usage:', error);
    // Don't throw, just log
  }
}

async function incrementUserConversions(userId) {
  try {
    await User.findByIdAndUpdate(userId, { $inc: { conversionsThisMonth: 1 } });
  } catch (error) {
    console.error('Error incrementing user conversions:', error);
  }
}

async function getUserUsage(userId, month, year) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const records = await UsageRecord.find({
      userId,
      timestamp: { $gte: startDate, $lt: endDate }
    }).sort({ timestamp: -1 });

    return records;
  } catch (error) {
    console.error('Error getting user usage:', error);
    return [];
  }
}

async function resetMonthlyConversions() {
  try {
    await User.updateMany({}, { $set: { conversionsThisMonth: 0 } });
    console.log('Monthly conversions reset for all users');
  } catch (error) {
    console.error('Error resetting monthly conversions:', error);
  }
}

module.exports = {
  log,
  incrementUserConversions,
  getUserUsage,
  resetMonthlyConversions
};