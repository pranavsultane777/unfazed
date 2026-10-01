const Client = require('../models/Client');

// Client abhi login karke book nahi karta (public booking page), isliye har
// booking/payment attempt par uska email dekh ke ya to existing Client record
// mil jata hai, ya naya bin jata hai. Isse client baad me /client/set-password
// par jaake apna account activate kar sakta hai.
const findOrCreateClient = async (therapistId, { name, email, phone }) => {
  if (!email) {
    throw new Error('Email is required to identify the client');
  }

  const normalizedEmail = email.toLowerCase().trim();

  let client = await Client.findOne({ therapist: therapistId, email: normalizedEmail });

  if (!client) {
    client = await Client.create({
      therapist: therapistId,
      name: (name || '').trim() || 'Client',
      email: normalizedEmail,
      phone: phone || '',
    });
  }

  return client;
};

module.exports = { findOrCreateClient };
