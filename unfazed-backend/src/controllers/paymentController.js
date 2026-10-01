const crypto = require('crypto');
const fs = require('fs');
const razorpayInstance = require('../config/razorpay');
const Package = require('../models/Package');
const ClientPackage = require('../models/ClientPackage');
const Therapist = require('../models/Therapist');
const Client = require('../models/Client');
const Session = require('../models/Session');
const Payment = require('../models/Payment');
const { generateInvoice } = require('../services/invoiceService');
const { findOrCreateClient } = require('../utils/clientHelper');
const { notifyPaymentConfirmed, notifyBookingConfirmed } = require('../services/notificationService');
const { canAccess } = require('../services/entitlementService');
const { createSessionForBooking } = require('./schedulingController');

const configuredPlatformFeeRate = () => {
  const rawRate = process.env.PLATFORM_FEE_RATE;
  if (rawRate === undefined || rawRate === '') {
    throw new Error('PLATFORM_FEE_RATE is required');
  }
  const rate = Number(rawRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error('Invalid PLATFORM_FEE_RATE configuration');
  return rate;
};

const makeInvoiceNumber = (paymentId) => `UFZ-${new Date().getFullYear()}-${String(paymentId).slice(-8).toUpperCase()}`;

// @route POST /api/payments/create-order
// Public client checkout. The server determines the amount from DB/config;
// the browser is never trusted for the payable amount.
const createOrder = async (req, res) => {
  try {
    const { slug, name, email, phone, sessionId, packageId, booking } = req.body;
    if (!slug || !name || !email) return res.status(400).json({ message: 'Name, email and therapist slug are required' });

    const therapist = await Therapist.findOne({ slug });
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });

    const client = await findOrCreateClient(therapist._id, { name, email, phone });

    if (booking || sessionId) {
      const intake = client.intake || {};
      if (!intake.consentGiven || !String(intake.presentingConcern || '').trim() || !String(intake.history || '').trim()) {
        return res.status(422).json({
          message: 'Complete the intake form and digital consent before booking your first session.',
          code: 'INTAKE_REQUIRED',
        });
      }
    }

    let amount;
    let packageTemplate;
    if (packageId) {
      const entitlement = await canAccess(therapist._id, 'packages');
      if (!entitlement.allowed) {
        return res.status(403).json({ message: entitlement.reason, code: 'FEATURE_LOCKED', feature: 'packages', tier: entitlement.tier });
      }
      packageTemplate = await Package.findOne({ _id: packageId, therapist: therapist._id, isActive: true });
      if (!packageTemplate) return res.status(404).json({ message: 'Package not found' });
      amount = Number(packageTemplate.totalPrice);
    } else {
      amount = Number(therapist.sessionPrice);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Therapist session price is not configured' });
      if (!booking && !sessionId) return res.status(400).json({ message: 'A session booking is required for single-session payment' });
    }

    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Invalid payable amount' });

    const platformFee = Math.round(amount * configuredPlatformFeeRate());
    const netAmount = amount - platformFee;

    // For a new session payment, validate the slot now. The session itself is
    // created only after Razorpay confirms payment, so unpaid bookings cannot
    // consume a therapist's calendar slot.
    let bookingData;
    if (!packageId && booking) {
      if (!booking.date || !booking.startTime || !booking.endTime || !booking.timezone) {
        return res.status(400).json({ message: 'Complete booking date, time and timezone are required' });
      }
      // Dry-run validation through the same slot-generation logic. No session
      // is created at this stage.
      const { getAvailableSlotsForBooking } = require('../utils/bookingValidation');
      const valid = await getAvailableSlotsForBooking({ therapist, booking });
      if (!valid) return res.status(409).json({ message: 'Selected slot is no longer available. Please choose another slot.' });
      bookingData = {
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        timezone: booking.timezone,
      };
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `ufz_${Date.now()}`,
      notes: {
        therapistId: String(therapist._id),
        clientId: String(client._id),
        purpose: packageId ? 'package' : 'session',
      },
    });

    const payment = await Payment.create({
      therapist: therapist._id,
      client: client._id,
      session: sessionId || undefined,
      package: packageTemplate?._id || undefined,
      amount,
      platform_fee: platformFee,
      net_amount: netAmount,
      gateway_order_id: razorpayOrder.id,
      booking: bookingData,
      invoiceNumber: undefined,
      status: 'created',
    });
    payment.invoiceNumber = makeInvoiceNumber(payment._id);
    await payment.save();

    res.status(201).json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      paymentId: payment._id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      purpose: packageId ? 'package' : 'session',
      client: { _id: client._id, name: client.name, email: client.email, hasAccount: client.hasAccount },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const finalizePayment = async (payment) => {
  // Session payment: create the session only after payment is confirmed.
  if (payment.booking && !payment.session) {
    const therapist = await Therapist.findById(payment.therapist);
    const client = await Client.findById(payment.client);
    if (!therapist || !client) throw new Error('Booking client or therapist not found');

    let session;
    try {
      session = await createSessionForBooking({
        therapist,
        client,
        date: payment.booking.date,
        startTime: payment.booking.startTime,
        endTime: payment.booking.endTime,
        timezone: payment.booking.timezone,
      });
    } catch (error) {
      // Idempotent verify + webhook calls may race. If the same payment already
      // created the exact booking, reuse it rather than creating a duplicate.
      if (error?.code === 'SLOT_UNAVAILABLE') {
        const existing = await Session.findOne({
          therapist: therapist._id,
          client: client._id,
          status: 'booked',
          startTime: payment.booking.startTime,
          date: payment.booking.date,
        });
        if (!existing) throw error;
        session = existing;
      } else {
        throw error;
      }
    }
    payment.session = session._id;
    await payment.save();
    if (session.createdAt && Date.now() - new Date(session.createdAt).getTime() < 5000) await notifyBookingConfirmed(session);
  }

  // Package purchase: grant the client's usable package entitlement once.
  if (payment.package && !payment.clientPackage) {
    const pkg = await Package.findOne({ _id: payment.package, therapist: payment.therapist, isActive: true });
    if (pkg) {
      const existing = await ClientPackage.findOne({
        therapist: payment.therapist,
        client: payment.client,
        package: pkg._id,
        purchaseDate: { $gte: payment.createdAt },
      });
      const clientPackage = existing || await ClientPackage.create({
        therapist: payment.therapist,
        client: payment.client,
        package: pkg._id,
        sessionsTotal: pkg.numberOfSessions,
        sessionsUsed: 0,
        expiryDate: new Date(Date.now() + (pkg.validityDays || 90) * 24 * 60 * 60 * 1000),
      });
      payment.clientPackage = clientPackage._id;
      await payment.save();
    }
  }

  if (!payment.invoiceGenerated) {
    const therapist = await Therapist.findById(payment.therapist);
    const client = await Client.findById(payment.client);
    if (therapist && client) {
      if (!payment.invoiceNumber) payment.invoiceNumber = makeInvoiceNumber(payment._id);
      const invoiceFilePath = await generateInvoice(payment, therapist, client);
      payment.invoiceGenerated = true;
      payment.invoiceFileName = invoiceFilePath ? invoiceFilePath.split(/[\\/]/).pop() : undefined;
      await payment.save();
    }
  }
};

const markPaidAndFinalize = async (payment, gatewayPaymentId) => {
  const wasPaid = payment.status === 'paid';
  if (!wasPaid) {
    payment.status = 'paid';
    payment.gateway_transaction_id = gatewayPaymentId;
    await payment.save();
  }
  await finalizePayment(payment);
  if (!wasPaid) await notifyPaymentConfirmed(payment);
  return wasPaid;
};

// @route POST /api/payments/verify
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId) {
      return res.status(400).json({ message: 'Incomplete payment verification payload' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const generatedBuffer = Buffer.from(generatedSignature);
    const signatureBuffer = Buffer.from(String(razorpay_signature));
    if (generatedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(generatedBuffer, signatureBuffer)) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const payment = await Payment.findOne({ _id: paymentId, gateway_order_id: razorpay_order_id });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    await markPaidAndFinalize(payment, razorpay_payment_id);
    res.status(200).json({
      message: 'Payment verified successfully',
      payment,
      invoiceNumber: payment.invoiceNumber,
      invoiceAvailable: payment.invoiceGenerated,
      sessionId: payment.session,
    });
  } catch (error) {
    if (error?.code === 'SLOT_UNAVAILABLE') return res.status(409).json({ message: error.message, code: 'SLOT_UNAVAILABLE' });
    if (error?.code === 'INTAKE_REQUIRED') return res.status(422).json({ message: error.message, code: 'INTAKE_REQUIRED' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route POST /api/payments/webhook
const razorpayWebhook = async (req, res) => {
  try {
    const rawBody = req.body;
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!webhookSignature || !webhookSecret) return res.status(400).json({ message: 'Webhook verification is not configured' });

    const digest = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const digestBuffer = Buffer.from(digest);
    const signatureBuffer = Buffer.from(String(webhookSignature));
    if (digestBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const body = JSON.parse(rawBody.toString('utf8'));
    const event = body.event;
    if (event === 'payment.captured') {
      const entity = body.payload?.payment?.entity;
      const orderId = entity?.order_id;
      const paymentEntityId = entity?.id;
      const payment = orderId ? await Payment.findOne({ gateway_order_id: orderId }) : null;
      if (payment) await markPaidAndFinalize(payment, paymentEntityId);
    }
    if (event === 'payment.failed') {
      const orderId = body.payload?.payment?.entity?.order_id;
      if (orderId) await Payment.findOneAndUpdate({ gateway_order_id: orderId, status: 'created' }, { status: 'failed' });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    if (error?.code === 'SLOT_UNAVAILABLE') return res.status(200).json({ received: true, warning: 'Payment captured but booking slot became unavailable; manual review required.' });
    res.status(500).json({ message: 'Webhook error', error: error.message });
  }
};

const createPackage = async (req, res) => {
  try {
    const { name, numberOfSessions, pricePerSession, validityDays } = req.body;
    const sessions = Number(numberOfSessions);
    const price = Number(pricePerSession);
    const validity = Number(validityDays || 90);
    if (!name || ![3, 6, 12].includes(sessions) || !Number.isFinite(price) || price <= 0 || !Number.isInteger(validity) || validity <= 0) {
      return res.status(400).json({ message: 'Package must contain a name, 3/6/12 sessions, positive per-session price and positive validity days.' });
    }
    const pkg = await Package.create({
      therapist: req.therapist._id,
      name: name.trim(),
      numberOfSessions: sessions,
      pricePerSession: price,
      totalPrice: sessions * price,
      validityDays: validity,
    });
    res.status(201).json(pkg);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPackages = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ slug: req.params.slug });
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    const access = await canAccess(therapist._id, 'packages');
    if (!access.allowed) return res.status(403).json({ message: access.reason, code: 'FEATURE_LOCKED', feature: 'packages', tier: access.tier });
    const packages = await Package.find({ therapist: therapist._id, isActive: true }).sort({ numberOfSessions: 1 });
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getInvoice = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment || payment.status !== 'paid' || !payment.invoiceGenerated || !payment.invoiceFileName) {
      return res.status(404).json({ message: 'Invoice not available' });
    }
    const authorizedTherapist = req.therapist && String(payment.therapist) === String(req.therapist._id);
    const authorizedClient = req.client && String(payment.client) === String(req.client._id);
    if (!authorizedTherapist && !authorizedClient) return res.status(403).json({ message: 'Not authorized to access this invoice' });

    const filePath = require('path').join(__dirname, '..', '..', 'invoices', payment.invoiceFileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Invoice file not found' });
    return res.download(filePath, `${payment.invoiceNumber || 'unfazed-invoice'}.pdf`);
  } catch (error) {
    res.status(500).json({ message: 'Could not download invoice', error: error.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  razorpayWebhook,
  createPackage,
  getPackages,
  getInvoice,
};
