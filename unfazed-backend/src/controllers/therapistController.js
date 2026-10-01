const Therapist = require('../models/Therapist');

// @route  GET /api/therapist/profile/:slug   (Public)
const getPublicProfile = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ slug: req.params.slug }).select(
      '-password_hash -email'
    );

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    res.status(200).json(therapist);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/therapist/me   (Private - logged in therapist)
const getMyProfile = async (req, res) => {
  res.status(200).json(req.therapist);
};

// @route  PUT /api/therapist/me   (Private - logged in therapist)
const updateMyProfile = async (req, res) => {
  try {
    const { name, bio, specializations, languages, sessionPrice } = req.body;

    const therapist = await Therapist.findById(req.therapist._id);
    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    if (name) therapist.name = name;
    if (bio !== undefined) therapist.bio = bio;
    if (specializations) therapist.specializations = specializations;
    if (languages) therapist.languages = languages;
    if (sessionPrice !== undefined) {
      const price = Number(sessionPrice);
      if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ message: 'Session price must be greater than zero' });
      therapist.sessionPrice = price;
    }

    const updated = await therapist.save();

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getPublicProfile, getMyProfile, updateMyProfile };