const SubscriptionTierConfig = require('../models/SubscriptionTierConfig');
const Client = require('../models/Client');
const Therapist = require('../models/Therapist');

// Tier configuration lives in MongoDB. These are only seed defaults for a
// fresh installation; application code never uses tier strings or prices as
// feature-gating constants.
const DEFAULT_TIERS = require('../config/tierDefaults.json');
const DEFAULT_TIER_KEY = process.env.DEFAULT_TIER_KEY || DEFAULT_TIERS[0]?.key;

if (!DEFAULT_TIER_KEY) {
  throw new Error('No default subscription tier is configured.');
}

const ensureDefaultTiers = async () => {
  for (const tier of DEFAULT_TIERS) {
    await SubscriptionTierConfig.updateOne(
      { key: tier.key },
      { $setOnInsert: tier },
      { upsert: true },
    );
  }
};

const getTier = async (therapistId) => {
  const therapist = await Therapist.findById(therapistId).select('subscriptionTier');
  const key = therapist?.subscriptionTier || DEFAULT_TIER_KEY;
  return (
    (await SubscriptionTierConfig.findOne({ key, isActive: true }))
    || (await SubscriptionTierConfig.findOne({ key: DEFAULT_TIER_KEY, isActive: true }))
  );
};

/**
 * Single source of truth for all subscription/entitlement decisions.
 *
 * Supported feature keys:
 * - activeClientCap: evaluates the current active-client count against the
 *   configured cap.
 * - analyticsDepth: evaluates requested history against the configured cap
 *   and advancedAnalytics flag.
 * - any normal feature key: evaluates tier.features[featureKey].
 */
const canAccess = async (therapistId, featureKey, options = {}) => {
  await ensureDefaultTiers();
  const tier = await getTier(therapistId);
  if (!tier) return { allowed: false, reason: 'Subscription tier is not configured' };

  if (featureKey === 'activeClientCap') {
    const count = await Client.countDocuments({
      therapist: therapistId,
      status: 'active',
    });
    const cap = Number(tier.caps?.activeClients ?? 0);
    return {
      allowed: count < cap,
      tier: tier.key,
      count,
      cap,
      reason: count >= cap
        ? `You've reached the ${cap}-client limit on the ${tier.name} plan. Upgrade to add more clients.`
        : undefined,
    };
  }

  if (featureKey === 'analyticsDepth') {
    const requestedMonths = Math.max(1, Number(options.months) || 1);
    const cap = Number(tier.caps?.analyticsMonths ?? 1);
    const hasExtendedAnalytics = tier.features?.advancedAnalytics === true;
    const allowed = requestedMonths <= cap && (requestedMonths <= 1 || hasExtendedAnalytics);
    return {
      allowed,
      tier: tier.key,
      requestedMonths,
      cap,
      reason: !allowed
        ? `Extended analytics history is not included in the ${tier.name} plan.`
        : undefined,
    };
  }

  const featureAllowed = tier.features?.[featureKey] === true;
  return {
    allowed: featureAllowed,
    tier: tier.key,
    reason: featureAllowed
      ? undefined
      : `${featureKey} is not included in the ${tier.name} plan`,
  };
};

module.exports = { ensureDefaultTiers, getTier, canAccess };
