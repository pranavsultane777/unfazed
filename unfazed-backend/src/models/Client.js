const mongoose = require('mongoose');

const intakeSchema = new mongoose.Schema(
  {
    demographics: {
      age: Number,
      gender: String,
      occupation: String,
    },
    presentingConcern: {
      type: String,
      default: '',
    },
    history: {
      type: String,
      default: '',
    },
    consentGiven: {
      type: Boolean,
      default: false,
    },
    consentTimestamp: {
      type: Date,
    },
    consentHistory: {
      type: [{
        givenAt: { type: Date, required: true },
        source: { type: String, enum: ['client-portal', 'booking', 'therapist'], default: 'client-portal' },
      }],
      default: [],
    },
  },
  { _id: false }
);

const clientSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    password_hash: {
      type: String,
      select: false,
    },
    hasAccount: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    intake: {
      type: intakeSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);