const Notification = require('../models/Notification');
const Session = require('../models/Session');

const createNotification = async ({ recipientId, recipientRole, type, message, link = '' }) => {
  return Notification.create({ recipientId, recipientRole, type, message, link });
};

// Real WhatsApp Business API access requires business approval, so this is
// a stub: it logs/queues the event instead of failing the whole feature.
const whatsappQueue = [];
const notifyWhatsAppStub = (event) => {
  whatsappQueue.push({ ...event, queuedAt: new Date() });
  console.log(`[whatsapp-stub] queued "${event.type}" for ${event.recipientRole} ${event.recipientId}`);
  return Promise.resolve({ queued: true });
};

const notifyBookingConfirmed = async (session) => {
  await notifyWhatsAppStub({ type: 'booking-confirmed', recipientId: session.client, recipientRole: 'client' });
  await Promise.all([
    createNotification({
      recipientId: session.therapist,
      recipientRole: 'therapist',
      type: 'new-appointment',
      message: `A new session was booked for ${session.date} at ${session.startTime}.`,
      link: '/dashboard/schedule',
    }),
    createNotification({
      recipientId: session.client,
      recipientRole: 'client',
      type: 'new-appointment',
      message: `Your therapy session is confirmed for ${session.date} at ${session.startTime}.`,
      link: '/client/portal',
    }),
  ]);
};

const notifyPaymentConfirmed = (payment) => createNotification({
  recipientId: payment.therapist,
  recipientRole: 'therapist',
  type: 'payment-received',
  message: `Payment of ₹${payment.amount} was received.`,
  link: '/dashboard/analytics',
});

// Convert a therapist-local wall-clock date/time into an absolute UTC Date.
// Session.date/startTime are intentionally stored in the therapist's timezone.
const zonedLocalToUtc = (dateString, timeString, timeZone) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute));

  for (let i = 0; i < 4; i += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(guess).reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
    const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    guess = new Date(guess.getTime() + (desired - asUtc));
  }
  return guess;
};

const sessionStartUtc = (session) => zonedLocalToUtc(session.date, session.startTime, session.timezone || 'Asia/Kolkata');
const sessionEndUtc = (session) => zonedLocalToUtc(session.date, session.endTime, session.timezone || 'Asia/Kolkata');

// Fires ~24h before a booked session, once, for both sides.
const notifyReminder24h = async (session) => {
  await notifyWhatsAppStub({ type: '24hr-reminder', recipientId: session.client, recipientRole: 'client' });
  await Promise.all([
    createNotification({
      recipientId: session.therapist,
      recipientRole: 'therapist',
      type: '24hr-reminder',
      message: `Reminder: your session on ${session.date} at ${session.startTime} is in about 24 hours.`,
      link: '/dashboard/schedule',
    }),
    createNotification({
      recipientId: session.client,
      recipientRole: 'client',
      type: '24hr-reminder',
      message: `Reminder: your therapy session on ${session.date} at ${session.startTime} is in about 24 hours.`,
      link: '/client/portal',
    }),
  ]);
  session.reminderSent = true;
  await session.save();
};

// Fires once after the session's end time has passed.
const notifyFollowUp = async (session) => {
  await notifyWhatsAppStub({ type: 'post-session-follow-up', recipientId: session.client, recipientRole: 'client' });
  await Promise.all([
    createNotification({
      recipientId: session.therapist,
      recipientRole: 'therapist',
      type: 'post-session-follow-up',
      message: `Your session on ${session.date} has ended — consider a follow-up.`,
      link: '/dashboard/clients',
    }),
    createNotification({
      recipientId: session.client,
      recipientRole: 'client',
      type: 'post-session-follow-up',
      message: 'Your therapy session has ended. You can return to your client portal for follow-up information.',
      link: '/client/portal',
    }),
  ]);
  session.followUpSent = true;
  await session.save();
};

// Event-driven sweep: checks session timestamps in the therapist's configured
// timezone and fires each event at most once using the boolean flags.
const runNotificationSweep = async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dueForReminder = await Session.find({ status: 'booked', reminderSent: false });
  for (const session of dueForReminder) {
    const start = sessionStartUtc(session);
    if (start <= in24h && start > now) await notifyReminder24h(session);
  }

  const dueForFollowUp = await Session.find({ status: { $in: ['booked', 'completed'] }, followUpSent: false });
  for (const session of dueForFollowUp) {
    const end = sessionEndUtc(session);
    if (end <= now) await notifyFollowUp(session);
  }
};

module.exports = {
  createNotification,
  notifyBookingConfirmed,
  notifyPaymentConfirmed,
  notifyReminder24h,
  notifyFollowUp,
  notifyWhatsAppStub,
  runNotificationSweep,
  whatsappQueue,
};
