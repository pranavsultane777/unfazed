const mongoose = require('mongoose');
const Message = require('../models/Message');
const Client = require('../models/Client');

const parseRoom = (roomId) => {
  if (typeof roomId !== 'string') return null;
  const ids = roomId.split('-');
  if (ids.length !== 2 || !ids.every((id) => mongoose.isValidObjectId(id))) return null;
  return ids;
};

// @desc    Get chat history for a specific therapist/client conversation
// @route   GET /api/messages/:roomId
// @access  Private (therapist OR client - protectAny)
const getMessagesByRoom = async (req, res) => {
  try {
    const ids = parseRoom(req.params.roomId);
    if (!ids) return res.status(400).json({ message: 'Invalid conversation room' });

    const requesterId = String(req.therapist?._id || req.client?._id || '');
    if (!ids.includes(requesterId)) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const therapistId = req.therapist ? requesterId : ids.find((id) => id !== requesterId);
    const clientId = req.client ? requesterId : ids.find((id) => id !== requesterId);
    if (!therapistId || !clientId) return res.status(403).json({ message: 'Invalid conversation participants' });

    // Do not rely only on the room id: confirm that this client actually
    // belongs to this therapist. This mirrors the Socket.io authorization.
    const relationship = await Client.findOne({ _id: clientId, therapist: therapistId }).select('_id');
    if (!relationship) return res.status(403).json({ message: 'Not authorized for this conversation' });

    const messages = await Message.find({ roomId: req.params.roomId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getMessagesByRoom };
