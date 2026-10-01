require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/db');
const Therapist = require('../src/models/Therapist');
const Client = require('../src/models/Client');
const Availability = require('../src/models/Availability');
const Session = require('../src/models/Session');
const { ensureDefaultTiers } = require('../src/services/entitlementService');

const required = (name) => {
  if (!process.env[name]) throw new Error(`${name} is required for demo seeding`);
  return process.env[name];
};

const dateAfter = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};

const run = async () => {
  await connectDB();
  await ensureDefaultTiers();

  const email = process.env.SEED_THERAPIST_EMAIL || 'demo.therapist@example.com';
  const password = required('SEED_THERAPIST_PASSWORD');
  const sessionPrice = Number(process.env.SEED_SESSION_PRICE || process.env.DEFAULT_SESSION_PRICE || 0);
  if (!Number.isFinite(sessionPrice) || sessionPrice <= 0) throw new Error('SEED_SESSION_PRICE must be configured as a positive amount');

  let therapist = await Therapist.findOne({ email });
  if (!therapist) {
    therapist = await Therapist.create({
      name: process.env.SEED_THERAPIST_NAME || 'Demo Therapist',
      email,
      password_hash: await bcrypt.hash(password, 12),
      slug: process.env.SEED_THERAPIST_SLUG || 'demo-therapist',
      bio: 'Demo therapist profile for local testing.',
      specializations: ['Individual Therapy', 'Stress Management'],
      languages: ['English', 'Hindi'],
      sessionPrice,
    });
  } else {
    therapist.sessionPrice = sessionPrice;
    await therapist.save();
  }

  await Availability.findOneAndUpdate(
    { therapist: therapist._id },
    {
      therapist: therapist._id,
      sessionDuration: 60,
      bufferTime: 15,
      timezone: 'Asia/Kolkata',
      weeklySlots: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '17:00' })),
      overrides: [],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const clientEmail = process.env.SEED_CLIENT_EMAIL || 'demo.client@example.com';
  let client = await Client.findOne({ therapist: therapist._id, email: clientEmail });
  if (!client) {
    client = await Client.create({
      therapist: therapist._id,
      name: process.env.SEED_CLIENT_NAME || 'Demo Client',
      email: clientEmail,
      phone: '',
      intake: {
        demographics: { age: 28, gender: 'Prefer not to say', occupation: 'Professional' },
        presentingConcern: 'Stress and work-life balance',
        history: 'Demo intake record for local testing.',
        consentGiven: true,
        consentTimestamp: new Date(),
        consentHistory: [{ givenAt: new Date(), source: 'seed-script' }],
      },
    });
  }

  const existingSession = await Session.findOne({ therapist: therapist._id, client: client._id, date: dateAfter(3), startTime: '10:00' });
  if (!existingSession) {
    await Session.create({
      therapist: therapist._id,
      client: client._id,
      date: dateAfter(3),
      startTime: '10:00',
      endTime: '11:00',
      timezone: 'Asia/Kolkata',
      clientTimezone: 'Asia/Kolkata',
      status: 'booked',
    });
  }

  console.log(`Demo seed ready: therapist=${therapist.email}, client=${client.email}, slug=/${therapist.slug}`);
  process.exit(0);
};

run().catch((error) => {
  console.error(`[seed:demo] ${error.message}`);
  process.exit(1);
});
