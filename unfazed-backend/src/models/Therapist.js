const mongoose = require('mongoose');
const tierDefaults = require('../config/tierDefaults.json');

const DEFAULT_TIER_KEY = process.env.DEFAULT_TIER_KEY || tierDefaults[0]?.key;
if (!DEFAULT_TIER_KEY) throw new Error('No default subscription tier is configured.');

const therapistSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    bio: {
      type: String,
      default: '',
    },
    specializations: {
      type: [String],
      default: [],
    },
    languages: {
      type: [String],
      default: [],
    },
    subscriptionTier: { type: String, default: DEFAULT_TIER_KEY, lowercase: true, trim: true },
    sessionPrice: { type: Number, min: 0, default: () => Number(process.env.DEFAULT_SESSION_PRICE || 0) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Therapist', therapistSchema);