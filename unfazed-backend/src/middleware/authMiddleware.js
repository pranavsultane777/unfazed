const jwt = require('jsonwebtoken');
const Therapist = require('../models/Therapist');
const Client = require('../models/Client');

const getTokenFromHeader = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

// Therapist-only routes (dashboard). Old therapist tokens have no `role`
// field on their payload, so we only ever reject when role is explicitly 'client'.
const protect = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'client') {
      return res.status(401).json({ message: 'Not authorized for this route' });
    }

    const therapist = await Therapist.findById(decoded.id).select('-password_hash');
    if (!therapist) {
      return res.status(401).json({ message: 'Not authorized, therapist not found' });
    }

    req.therapist = therapist;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Client-only routes (client portal).
const protectClient = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'client') {
      return res.status(401).json({ message: 'Not authorized for this route' });
    }

    const client = await Client.findById(decoded.id).select('-password_hash');
    if (!client) {
      return res.status(401).json({ message: 'Not authorized, client not found' });
    }

    req.client = client;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Shared resources that BOTH a therapist and a client can access with their
// own token (chat history, notifications). Sets req.therapist OR req.client
// depending on who is asking - controllers should handle both.
const protectAny = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'client') {
      const client = await Client.findById(decoded.id).select('-password_hash');
      if (!client) {
        return res.status(401).json({ message: 'Not authorized, client not found' });
      }
      req.client = client;
    } else {
      const therapist = await Therapist.findById(decoded.id).select('-password_hash');
      if (!therapist) {
        return res.status(401).json({ message: 'Not authorized, therapist not found' });
      }
      req.therapist = therapist;
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protect, protectClient, protectAny };
