const mongoose = require('mongoose');

const subscriptionTierConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true },
  monthlyPrice: { type: Number, required: true, min: 0, default: 0 },
  caps: {
    activeClients: { type: Number, required: true, min: 0 },
    analyticsMonths: { type: Number, required: true, min: 1 },
  },
  features: {
    advancedAnalytics: { type: Boolean, default: false },
    noteTemplates: { type: Boolean, default: false },
    packages: { type: Boolean, default: false },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionTierConfig', subscriptionTierConfigSchema);
