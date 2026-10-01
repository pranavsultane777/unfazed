const mongoose = require('mongoose');

const weeklySlotSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number, // 0 = Sunday, 1 = Monday, ... 6 = Saturday
      required: true,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String, // e.g. "09:00"
      required: true,
    },
    endTime: {
      type: String, // e.g. "17:00"
      required: true,
    },
  },
  { _id: false }
);

const overrideSchema = new mongoose.Schema(
  {
    date: {
      type: String, // e.g. "2026-10-05"
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: true,
    },
    startTime: String,
    endTime: String,
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
      unique: true,
    },
    sessionDuration: {
      type: Number, // in minutes: 30, 45, 60, 90
      default: 60,
    },
    bufferTime: {
      type: Number, // in minutes between sessions
      default: 0,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    weeklySlots: {
      type: [weeklySlotSchema],
      default: [],
    },
    overrides: {
      type: [overrideSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Availability', availabilitySchema);