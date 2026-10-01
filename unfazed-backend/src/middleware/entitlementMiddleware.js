const { canAccess } = require('../services/entitlementService');

// All subscription-gated routes go through the single entitlement service.
const deny = (res, result, feature) => res.status(403).json({
  message: result.reason || 'This feature is not available on your current plan.',
  code: 'FEATURE_LOCKED',
  feature,
  tier: result.tier,
  cap: result.cap,
  count: result.count,
});

const requireFeature = (featureKey) => async (req, res, next) => {
  try {
    const result = await canAccess(req.therapist._id, featureKey);
    if (!result.allowed) return deny(res, result, featureKey);
    next();
  } catch (error) { next(error); }
};

const enforceActiveClientCap = async (req, res, next) => {
  try {
    const result = await canAccess(req.therapist._id, 'activeClientCap');
    if (!result.allowed) return deny(res, result, 'activeClientCap');
    next();
  } catch (error) { next(error); }
};

const requireNoteFormat = async (req, res, next) => {
  try {
    const format = String(req.body.format || 'freeform').toLowerCase();
    if (format === 'freeform') return next();
    const result = await canAccess(req.therapist._id, 'noteTemplates');
    if (!result.allowed) return deny(res, result, 'noteTemplates');
    next();
  } catch (error) { next(error); }
};

const enforceAnalyticsDepth = async (req, res, next) => {
  try {
    const requestedMonths = Math.max(1, Math.min(24, parseInt(req.query.months, 10) || 1));
    const result = await canAccess(req.therapist._id, 'analyticsDepth', { months: requestedMonths });
    if (!result.allowed) return deny(res, result, 'advancedAnalytics');
    req.analyticsMonths = result.requestedMonths;
    next();
  } catch (error) { next(error); }
};

module.exports = { requireFeature, enforceActiveClientCap, requireNoteFormat, enforceAnalyticsDepth };
