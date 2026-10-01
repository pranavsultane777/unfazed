const mongoose = require('mongoose');

const sessionNoteSchema = new mongoose.Schema(
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
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
    type: {
      type: String,
      enum: ['private', 'shared'],
      required: true,
      default: 'private',
    },
    format: {
      type: String,
      enum: ['freeform', 'soap', 'dap'],
      default: 'freeform',
    },
    content: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SessionNote', sessionNoteSchema);