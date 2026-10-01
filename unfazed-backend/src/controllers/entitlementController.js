const { ensureDefaultTiers, getTier } = require('../services/entitlementService');
const SubscriptionTierConfig = require('../models/SubscriptionTierConfig');

const getMyEntitlements = async (req, res) => {
  await ensureDefaultTiers();
  const tier = await getTier(req.therapist._id);
  const activeTiers = await SubscriptionTierConfig.find({ isActive: true })
    .sort({ monthlyPrice: -1, key: 1 })
    .select('_id');
  const isHighestTier = Boolean(
    tier && activeTiers.length && String(activeTiers[0]._id) === String(tier._id)
  );
  res.json({
    tier,
    features: tier?.features || {},
    caps: tier?.caps || {},
    isHighestTier,
  });
};

const listTiers = async (req, res) => {
  await ensureDefaultTiers();
  res.json(await SubscriptionTierConfig.find({ isActive: true }).sort({ monthlyPrice: 1 }));
};
module.exports = { getMyEntitlements, listTiers };
