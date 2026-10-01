const mongoose = require('mongoose');

const clientPackageSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    sessionsTotal: {
      type: Number,
      required: true,
    },
    sessionsUsed: {
      type: Number,
      default: 0,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'completed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClientPackage', clientPackageSchema);