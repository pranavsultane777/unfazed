const Lead = require('../models/Lead');
const Therapist = require('../models/Therapist');
const { createNotification } = require('./notificationService');

// Every therapist's branded link is its own distribution target, so
// "distribution" here is: attach the lead to the therapist behind the slug
// and notify them immediately. Kept as its own service (rather than inline
// in a controller) so a future multi-therapist matching/routing rule can
// replace this function without touching the capture endpoint.
const captureLead = async ({ slug, name, email, phone, message }) => {
  const therapist = await Therapist.findOne({ slug });
  if (!therapist) {
    const err = new Error('Therapist not found');
    err.status = 404;
    throw err;
  }

  const lead = await Lead.create({
    therapist: therapist._id,
    name,
    email,
    phone: phone || '',
    message: message || '',
  });

  await createNotification({
    recipientId: therapist._id,
    recipientRole: 'therapist',
    type: 'new-lead',
    message: `New inquiry from ${name} via your branded page.`,
    link: '/dashboard/clients',
  });

  return lead;
};

const getLeadsForTherapist = (therapistId) => Lead.find({ therapist: therapistId }).sort({ createdAt: -1 });

module.exports = { captureLead, getLeadsForTherapist };
