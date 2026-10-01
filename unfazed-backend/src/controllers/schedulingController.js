const Availability = require('../models/Availability');
const Session = require('../models/Session');
const Therapist = require('../models/Therapist');
const { findUsablePackage, consumeSession } = require('../utils/entitlementHelper');
const { findOrCreateClient } = require('../utils/clientHelper');
const { notifyBookingConfirmed } = require('../services/notificationService');

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const assertIntakeComplete = (client) => {
  const intake = client?.intake || {};
  if (!intake.consentGiven || !String(intake.presentingConcern || '').trim() || !String(intake.history || '').trim()) {
    const error = new Error('Complete the intake form and digital consent before booking your first session.');
    error.code = 'INTAKE_REQUIRED';
    throw error;
  }
};

const VALID_DURATIONS = [30, 45, 60, 90];

const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
const minutesOf = (value) => {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};
const timeOf = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const getDatePartsInTimeZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
};

const weekdayInTimeZone = (date, timeZone) => {
  const label = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(label);
};

// Converts a local wall-clock date/time in a named IANA timezone into a UTC Date.
// Uses Intl only, so the backend does not need a second timezone dependency.
const zonedLocalToUtc = (dateString, timeString, timeZone) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute));

  for (let i = 0; i < 4; i += 1) {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(guess).reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
    const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    guess = new Date(guess.getTime() + (desired - asUtc));
  }
  return guess;
};

const formatInZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
};

const getDateStringForOffset = (date, offsetDays, timeZone) => {
  const base = getDatePartsInTimeZone(date, timeZone);
  const utc = new Date(Date.UTC(base.year, base.month - 1, base.day + offsetDays, 12, 0));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(utc);
};

const dateMatchesOverride = (overrides, date) => overrides.find((o) => o.date === date);

const validateWeeklySlots = (slots) => {
  if (!Array.isArray(slots)) throw new Error('weeklySlots must be an array');
  for (const slot of slots) {
    if (![0,1,2,3,4,5,6].includes(Number(slot.dayOfWeek))) throw new Error('Invalid dayOfWeek');
    if (!isValidTime(slot.startTime) || !isValidTime(slot.endTime)) throw new Error('Invalid availability time');
    if (minutesOf(slot.endTime) <= minutesOf(slot.startTime)) throw new Error('Availability endTime must be after startTime');
  }
};

const validateOverrides = (overrides) => {
  if (!Array.isArray(overrides)) throw new Error('overrides must be an array');
  for (const item of overrides) {
    if (!isValidDate(item.date)) throw new Error('Invalid override date');
    if (item.isBlocked) continue;
    if (!isValidTime(item.startTime) || !isValidTime(item.endTime) || minutesOf(item.endTime) <= minutesOf(item.startTime)) {
      throw new Error('Invalid override time range');
    }
  }
};


const getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({ therapist: req.therapist._id })
      .populate('client', 'name email')
      .sort({ date: 1, startTime: 1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Could not load sessions', error: error.message });
  }
};

const updateSessionStatus = async (req, res) => {
  try {
    const allowed = ['booked', 'completed', 'cancelled', 'no-show'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid session status' });
    const session = await Session.findOne({ _id: req.params.id, therapist: req.therapist._id });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    session.status = req.body.status;
    await session.save();
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Could not update session status', error: error.message });
  }
};

const setAvailability = async (req, res) => {
  try {
    const { sessionDuration, bufferTime, weeklySlots, overrides, timezone } = req.body;
    const duration = Number(sessionDuration || 60);
    const buffer = Number(bufferTime || 0);
    if (!VALID_DURATIONS.includes(duration)) return res.status(400).json({ message: 'Session duration must be 30, 45, 60 or 90 minutes' });
    if (!Number.isInteger(buffer) || buffer < 0 || buffer > 120) return res.status(400).json({ message: 'Buffer time must be between 0 and 120 minutes' });
    validateWeeklySlots(weeklySlots || []);
    validateOverrides(overrides || []);
    if (timezone) {
      try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(); } catch { return res.status(400).json({ message: 'Invalid IANA timezone' }); }
    }

    let availability = await Availability.findOne({ therapist: req.therapist._id });
    if (!availability) availability = new Availability({ therapist: req.therapist._id });
    availability.sessionDuration = duration;
    availability.bufferTime = buffer;
    availability.weeklySlots = weeklySlots || [];
    availability.overrides = overrides || [];
    availability.timezone = timezone || availability.timezone || DEFAULT_TIMEZONE;
    const saved = await availability.save();
    res.status(200).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Could not save availability' });
  }
};

const getMyAvailability = async (req, res) => {
  try {
    const availability = await Availability.findOne({ therapist: req.therapist._id });
    res.status(200).json(availability || { sessionDuration: 60, bufferTime: 0, weeklySlots: [], overrides: [], timezone: DEFAULT_TIMEZONE });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const buildSlots = ({ availability, bookedSessions, clientTimezone, days = 30 }) => {
  const therapistTimezone = availability.timezone || DEFAULT_TIMEZONE;
  const safeClientTimezone = clientTimezone || therapistTimezone;
  try { new Intl.DateTimeFormat('en-US', { timeZone: safeClientTimezone }).format(); } catch { throw new Error('Invalid client timezone'); }

  const now = new Date();
  const slots = [];
  const booked = bookedSessions.map((s) => ({
    start: zonedLocalToUtc(s.date, s.startTime, therapistTimezone).getTime(),
    end: zonedLocalToUtc(s.date, s.endTime, therapistTimezone).getTime(),
  }));

  for (let offset = 0; offset < days; offset += 1) {
    const dateString = getDateStringForOffset(now, offset, therapistTimezone);
    const localDate = zonedLocalToUtc(dateString, '12:00', therapistTimezone);
    const weekday = weekdayInTimeZone(localDate, therapistTimezone);
    const override = dateMatchesOverride(availability.overrides || [], dateString);
    if (override?.isBlocked) continue;

    const ranges = override && !override.isBlocked
      ? [{ dayOfWeek: weekday, startTime: override.startTime, endTime: override.endTime }]
      : (availability.weeklySlots || []).filter((s) => Number(s.dayOfWeek) === weekday);

    for (const range of ranges) {
      if (!range.startTime || !range.endTime) continue;
      const start = minutesOf(range.startTime);
      const end = minutesOf(range.endTime);
      const step = availability.sessionDuration + availability.bufferTime;
      for (let cursor = start; cursor + availability.sessionDuration <= end; cursor += step) {
        const slotStartLocal = timeOf(cursor);
        const slotEndLocal = timeOf(cursor + availability.sessionDuration);
        const slotStartUtc = zonedLocalToUtc(dateString, slotStartLocal, therapistTimezone);
        const slotEndUtc = zonedLocalToUtc(dateString, slotEndLocal, therapistTimezone);
        if (slotStartUtc.getTime() <= Date.now()) continue;
        const overlaps = booked.some((b) => slotStartUtc.getTime() < b.end && slotEndUtc.getTime() > b.start);
        if (overlaps) continue;
        const clientStart = formatInZone(slotStartUtc, safeClientTimezone);
        const clientEnd = formatInZone(slotEndUtc, safeClientTimezone);
        slots.push({
          date: clientStart.date,
          startTime: clientStart.time,
          endTime: clientEnd.time,
          therapistDate: dateString,
          therapistStartTime: slotStartLocal,
          therapistEndTime: slotEndLocal,
          timezone: safeClientTimezone,
          therapistTimezone,
          startUtc: slotStartUtc.toISOString(),
          endUtc: slotEndUtc.toISOString(),
        });
      }
    }
  }
  const unique = new Map();
  slots.forEach((slot) => {
    if (!unique.has(slot.startUtc)) unique.set(slot.startUtc, slot);
  });
  return [...unique.values()].sort((a, b) => new Date(a.startUtc) - new Date(b.startUtc));
};

const getAvailableSlots = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ slug: req.params.slug });
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    const availability = await Availability.findOne({ therapist: therapist._id });
    if (!availability) return res.status(200).json({ sessionDuration: 60, bufferTime: 0, timezone: DEFAULT_TIMEZONE, slots: [] });
    const bookedSessions = await Session.find({ therapist: therapist._id, status: { $in: ['booked', 'completed'] } }).select('date startTime endTime');
    const clientTimezone = req.query.timezone || availability.timezone || DEFAULT_TIMEZONE;
    const slots = buildSlots({ availability, bookedSessions, clientTimezone, days: 30 });
    res.status(200).json({ sessionDuration: availability.sessionDuration, bufferTime: availability.bufferTime, timezone: availability.timezone || DEFAULT_TIMEZONE, clientTimezone, sessionPrice: therapist.sessionPrice, slots });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Could not generate slots' });
  }
};

const isRequestedSlotValid = ({ availability, date, startTime, endTime, timezone, bookedSessions }) => {
  const therapistTimezone = availability.timezone || DEFAULT_TIMEZONE;
  const requestedStartUtc = zonedLocalToUtc(date, startTime, timezone);
  const requestedEndUtc = zonedLocalToUtc(date, endTime, timezone);
  if (requestedStartUtc.getTime() <= Date.now()) return false;
  const expectedDuration = availability.sessionDuration * 60 * 1000;
  if (requestedEndUtc.getTime() - requestedStartUtc.getTime() !== expectedDuration) return false;
  const generated = buildSlots({ availability, bookedSessions, clientTimezone: timezone, days: 31 });
  return generated.some((slot) => slot.startUtc === requestedStartUtc.toISOString() && slot.endUtc === requestedEndUtc.toISOString());
};

const createSessionForBooking = async ({ therapist, client, date, startTime, endTime, timezone }) => {
  assertIntakeComplete(client);
  const availability = await Availability.findOne({ therapist: therapist._id });
  if (!availability) throw new Error('Therapist has not configured availability');
  const clientTimezone = timezone || availability.timezone || DEFAULT_TIMEZONE;
  try { new Intl.DateTimeFormat('en-US', { timeZone: clientTimezone }).format(); } catch { throw new Error('Invalid timezone'); }

  const existing = await Session.find({
    therapist: therapist._id,
    status: { $in: ['booked', 'completed'] },
  }).select('date startTime endTime');

  if (!isRequestedSlotValid({
    availability,
    date,
    startTime,
    endTime,
    timezone: clientTimezone,
    bookedSessions: existing,
  })) {
    const error = new Error('Selected slot is no longer available. Please choose another slot.');
    error.code = 'SLOT_UNAVAILABLE';
    throw error;
  }

  const therapistStart = zonedLocalToUtc(date, startTime, clientTimezone);
  const therapistEnd = zonedLocalToUtc(date, endTime, clientTimezone);
  const therapistLocal = formatInZone(therapistStart, availability.timezone || DEFAULT_TIMEZONE);
  const therapistLocalEnd = formatInZone(therapistEnd, availability.timezone || DEFAULT_TIMEZONE);

  try {
    return await Session.create({
      therapist: therapist._id,
      client: client._id,
      date: therapistLocal.date,
      startTime: therapistLocal.time,
      endTime: therapistLocalEnd.time,
      timezone: availability.timezone || DEFAULT_TIMEZONE,
      clientTimezone,
      status: 'booked',
    });
  } catch (error) {
    if (error?.code === 11000) {
      const conflict = new Error('Selected slot was just booked by another client. Please choose another slot.');
      conflict.code = 'SLOT_UNAVAILABLE';
      throw conflict;
    }
    throw error;
  }
};

const bookSlot = async (req, res) => {
  try {
    // Direct booking is intentionally restricted to an authenticated client
    // using an already-paid active package. New single-session bookings must
    // go through the Razorpay checkout flow so payment cannot be bypassed.
    if (!req.client) return res.status(401).json({ message: 'Client login is required to book using a package.' });
    if (!req.body?.usePackage) return res.status(402).json({ message: 'Advance payment is required. Use the checkout flow for a single session.', code: 'PAYMENT_REQUIRED' });

    const { slug, date, startTime, endTime, timezone } = req.body;
    if (!slug || !date || !startTime || !endTime) return res.status(400).json({ message: 'Missing required booking fields' });

    const therapist = await Therapist.findOne({ slug: String(slug).toLowerCase().trim() });
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    if (String(req.client.therapist) !== String(therapist._id)) {
      return res.status(403).json({ message: 'This client is not associated with that therapist.' });
    }

    const clientPackageToUse = await findUsablePackage(req.client._id);
    if (!clientPackageToUse || String(clientPackageToUse.therapist) !== String(therapist._id)) {
      return res.status(403).json({ message: 'No active package with remaining sessions found.' });
    }

    const session = await createSessionForBooking({ therapist, client: req.client, date, startTime, endTime, timezone });
    await consumeSession(clientPackageToUse._id);
    await notifyBookingConfirmed(session);
    res.status(201).json({
      session,
      client: { _id: req.client._id, name: req.client.name, email: req.client.email, hasAccount: req.client.hasAccount },
      usedPackage: true,
    });
  } catch (error) {
    if (error?.code === 'SLOT_UNAVAILABLE') return res.status(409).json({ message: error.message });
    if (error?.code === 'INTAKE_REQUIRED') return res.status(422).json({ message: error.message, code: 'INTAKE_REQUIRED' });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { setAvailability, getMyAvailability, getAvailableSlots, bookSlot, createSessionForBooking, getMySessions, updateSessionStatus, __isRequestedSlotValid: isRequestedSlotValid };
