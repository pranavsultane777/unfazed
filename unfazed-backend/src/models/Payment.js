const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
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
    clientPackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClientPackage',
    },
    // Set at checkout time when the client is buying a Package (the
    // therapist's template, e.g. "6 Session Package"). Once the payment is
    // confirmed, this is used to create the actual ClientPackage above
    // (the client's real, usable entitlement) - see grantPackageIfNeeded.
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
    },
    invoiceGenerated: {
      type: Boolean,
      default: false,
    },
    invoiceNumber: { type: String, unique: true, sparse: true },
    invoiceFileName: { type: String },
    booking: {
      date: String,
      startTime: String,
      endTime: String,
      timezone: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    platform_fee: {
      type: Number,
      default: 0,
    },
    net_amount: {
      type: Number,
      required: true,
    },
    gateway_transaction_id: {
      type: String,
    },
    gateway_order_id: {
      type: String,
    },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);