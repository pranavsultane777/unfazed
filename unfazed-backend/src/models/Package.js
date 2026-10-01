const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
    },
    name: {
      type: String,
      required: true, // e.g. "6 Session Package"
    },
    numberOfSessions: {
      type: Number,
      required: true, // 3, 6 or 12 as required by the project brief
      enum: [3, 6, 12],
    },
    pricePerSession: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    validityDays: {
      type: Number,
      default: 90, // package expires after this many days
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Package', packageSchema);