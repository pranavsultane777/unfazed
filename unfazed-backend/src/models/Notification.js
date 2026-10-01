const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ['therapist', 'client'],
      required: true,
    },
    type: {
      type: String,
      enum: ['new-message', 'new-appointment', 'appointment-cancelled', 'payment-received', '24hr-reminder', 'post-session-follow-up'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String, // e.g. "/dashboard/clients/123" - jaha click karne par le jaye
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);