const Package = require('../models/Package');

const listMyPackages = async (req, res) => {
  try {
    const packages = await Package.find({ therapist: req.therapist._id, isActive: true }).sort({ numberOfSessions: 1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Could not load packages', error: error.message });
  }
};

module.exports = { listMyPackages };
