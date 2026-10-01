const mongoose = require('mongoose');

// Captures an inquiry from a therapist's public branded page (before the
// visitor becomes a paying Client via the booking flow).
const leadSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Therapist',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    message: { type: String, default: '' },
    source: { type: String, default: 'public-profile' },
    status: {
      type: String,
      enum: ['new', 'contacted', 'converted', 'closed'],
      default: 'new',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
