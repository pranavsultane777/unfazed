const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');

const generateClientToken = (clientId) => {
  return jwt.sign({ id: clientId, role: 'client' }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// @desc    Client apna account activate karta hai (password set karta hai)
//          Client record pehle se exist karna chahiye - ye tab bana tha
//          jab client ne booking/payment kiya tha (email se match hota hai).
// @route   POST /api/client-auth/set-password
// @access  Public
const setPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const client = await Client.findOne({ email: email.toLowerCase().trim() });

    if (!client) {
      return res.status(404).json({
        message:
          'No client record found with this email. Please book a session with your therapist first.',
      });
    }

    if (client.hasAccount) {
      return res.status(400).json({ message: 'Account already set up. Please log in instead.' });
    }

    const salt = await bcrypt.genSalt(10);
    client.password_hash = await bcrypt.hash(password, salt);
    client.hasAccount = true;
    await client.save();
    await client.populate('therapist', 'name slug');

    const token = generateClientToken(client._id);

    res.status(201).json({
      _id: client._id,
      name: client.name,
      email: client.email,
      therapist: client.therapist,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   POST /api/client-auth/login
// @access  Public
const loginClient = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const client = await Client.findOne({ email: email.toLowerCase().trim() })
      .select('+password_hash')
      .populate('therapist', 'name slug');

    if (!client || !client.password_hash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, client.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateClientToken(client._id);

    res.status(200).json({
      _id: client._id,
      name: client.name,
      email: client.email,
      therapist: client.therapist,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route   GET /api/client-auth/me
// @access  Private (client)
const getMe = async (req, res) => {
  try {
    const client = await Client.findById(req.client._id).populate('therapist', 'name slug');
    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { setPassword, loginClient, getMe };
