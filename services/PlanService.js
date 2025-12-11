const PLAN_LIMITS = {
  free: {
    monthlyConversions: 1000,
    maxFileSizeMB: 5
  },
  pro: {
    monthlyConversions: 10000,
    maxFileSizeMB: 25
  },
  business: {
    monthlyConversions: 100000,
    maxFileSizeMB: 100
  }
};

function getPlanLimits(planName) {
  return PLAN_LIMITS[planName] || PLAN_LIMITS.free;
}

function checkFileSize(planName, fileSizeBytes) {
  const limits = getPlanLimits(planName);
  const maxBytes = limits.maxFileSizeMB * 1024 * 1024;
  return fileSizeBytes <= maxBytes;
}

function checkMonthlyUsage(planName, currentUsage) {
  const limits = getPlanLimits(planName);
  return currentUsage < limits.monthlyConversions;
}

module.exports = {
  getPlanLimits,
  checkFileSize,
  checkMonthlyUsage
};