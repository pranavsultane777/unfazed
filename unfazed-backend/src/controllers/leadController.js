const { captureLead, getLeadsForTherapist } = require('../services/leadDistributionService');

// @route  POST /api/leads/:slug   (Public - visitor inquiry on branded page)
const createLead = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }
    const lead = await captureLead({ slug: req.params.slug, name, email, phone, message });
    res.status(201).json(lead);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Server error' });
  }
};

// @route  GET /api/leads   (Private - therapist's own inbound inquiries)
const listLeads = async (req, res) => {
  try {
    const leads = await getLeadsForTherapist(req.therapist._id);
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createLead, listLeads };
