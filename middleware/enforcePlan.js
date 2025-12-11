const { checkFileSize, checkMonthlyUsage } = require('../services/PlanService');
const fs = require('fs');

const enforcePlanLimits = async (req, res, next) => {
  try {
    const user = req.user;
    const file = req.file;

    // Check file size
    if (file) {
      const fileSize = fs.statSync(file.path).size;
      if (!checkFileSize(user.plan, fileSize)) {
        return res.status(400).json({
          error: `File size exceeds plan limit. Max allowed: ${require('../services/PlanService').getPlanLimits(user.plan).maxFileSizeMB}MB`
        });
      }
    }

    // Check monthly usage
    if (!checkMonthlyUsage(user.plan, user.conversionsThisMonth)) {
      return res.status(429).json({
        error: `Monthly conversion limit reached. Upgrade your plan for more conversions.`,
        currentUsage: user.conversionsThisMonth,
        limit: require('../services/PlanService').getPlanLimits(user.plan).monthlyConversions
      });
    }

    next();
  } catch (error) {
    console.error('Plan enforcement error:', error);
    return res.status(500).json({ error: 'Plan validation failed' });
  }
};

module.exports = {
  enforcePlanLimits
};