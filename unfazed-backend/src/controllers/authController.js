const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Therapist = require('../models/Therapist');
const generateSlug = require('../utils/generateSlug');

// Generate JWT token
const generateToken = (therapistId) => {
  return jwt.sign({ id: therapistId, role: 'therapist' }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// @route  POST /api/auth/register
const registerTherapist = async (req, res) => {
  try {
    const { email, password, name, bio, specializations, languages } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password and name are required' });
    }

    const existingTherapist = await Therapist.findOne({ email: email.toLowerCase() });
    if (existingTherapist) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const slug = await generateSlug(name, Therapist);

    const therapist = await Therapist.create({
      email,
      password_hash,
      name,
      slug,
      bio: bio || '',
      specializations: specializations || [],
      languages: languages || [],
    });

    const token = generateToken(therapist._id);

    res.status(201).json({
      _id: therapist._id,
      name: therapist.name,
      email: therapist.email,
      slug: therapist.slug,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  POST /api/auth/login
const loginTherapist = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const therapist = await Therapist.findOne({ email: email.toLowerCase() });
    if (!therapist) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, therapist.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(therapist._id);

    res.status(200).json({
      _id: therapist._id,
      name: therapist.name,
      email: therapist.email,
      slug: therapist.slug,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { registerTherapist, loginTherapist };