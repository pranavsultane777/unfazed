const SessionNote = require('../models/SessionNote');
const Client = require('../models/Client');
const Session = require('../models/Session');

const sanitizeRichText = (value = '') => String(value)
  .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  .replace(/\s+on[a-z]+\s*=\s*(?:\"[^\"]*\"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/javascript:/gi, '');

// @route  POST /api/notes   (Private - therapist only)
const createNote = async (req, res) => {
  try {
    const { clientId, sessionId, type, format, content } = req.body;
    if (!clientId || !type) return res.status(400).json({ message: 'clientId and type are required' });
    if (!['private', 'shared'].includes(type)) return res.status(400).json({ message: 'Invalid note type' });
    if (format && !['freeform', 'soap', 'dap'].includes(format)) return res.status(400).json({ message: 'Invalid note format' });

    const client = await Client.findOne({ _id: clientId, therapist: req.therapist._id });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    let session;
    if (sessionId) {
      session = await Session.findOne({ _id: sessionId, client: clientId, therapist: req.therapist._id });
      if (!session) return res.status(404).json({ message: 'Session not found for this client' });
    }

    const cleanContent = sanitizeRichText(content || '');
    if (!cleanContent.replace(/<[^>]*>/g, '').trim()) {
      return res.status(400).json({ message: 'Note content cannot be empty' });
    }

    const note = await SessionNote.create({
      therapist: req.therapist._id,
      client: clientId,
      session: session?._id,
      type,
      format: format || 'freeform',
      content: cleanContent,
    });
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getTherapistNotesForClient = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.clientId, therapist: req.therapist._id });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    const notes = await SessionNote.find({ client: req.params.clientId, therapist: req.therapist._id })
      .populate('session', 'date startTime endTime timezone status')
      .sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateNote = async (req, res) => {
  try {
    const { content, type, format } = req.body;
    const note = await SessionNote.findOne({ _id: req.params.id, therapist: req.therapist._id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (content !== undefined) note.content = sanitizeRichText(content);
    if (type) note.type = type;
    if (format) note.format = format;
    const updated = await note.save();
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getSharedNotesForClient = async (req, res) => {
  try {
    if (String(req.client._id) !== String(req.params.clientId)) return res.status(403).json({ message: 'Not authorized to view these notes' });
    const notes = await SessionNote.find({ client: req.params.clientId, type: 'shared' })
      .populate('session', 'date startTime endTime timezone')
      .sort({ createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createNote, getTherapistNotesForClient, updateNote, getSharedNotesForClient };
