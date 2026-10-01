const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
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
    date: {
      type: String, // e.g. "2026-10-05"
      required: true,
    },
    startTime: {
      type: String, // e.g. "10:00"
      required: true,
    },
    endTime: {
      type: String, // e.g. "11:00"
      required: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    clientTimezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    status: {
      type: String,
      enum: ['booked', 'completed', 'cancelled', 'no-show'],
      default: 'booked',
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    followUpSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

sessionSchema.index(
  { therapist: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: 'booked' }, name: 'unique_active_booking' },
);
sessionSchema.index(
  { therapist: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: 'completed' }, name: 'unique_completed_booking' },
);

module.exports = mongoose.model('Session', sessionSchema);