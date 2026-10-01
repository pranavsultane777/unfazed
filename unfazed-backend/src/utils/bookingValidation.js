const Availability = require('../models/Availability');
const Session = require('../models/Session');
const scheduling = require('../controllers/schedulingController');

// Reuses the same slot-generation/validation implementation used by the
// normal booking endpoint without creating a Session. This is used before a
// Razorpay order is created so an unpaid checkout never reserves a slot.
const getAvailableSlotsForBooking = async ({ therapist, booking }) => {
  const availability = await Availability.findOne({ therapist: therapist._id });
  if (!availability) return false;
  const existing = await Session.find({
    therapist: therapist._id,
    status: { $in: ['booked', 'completed'] },
  }).select('date startTime endTime');

  return scheduling.__isRequestedSlotValid({
    availability,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    timezone: booking.timezone,
    bookedSessions: existing,
  });
};

module.exports = { getAvailableSlotsForBooking };
