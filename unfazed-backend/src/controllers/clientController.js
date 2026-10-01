const Client = require('../models/Client');
const Session = require('../models/Session');
const ClientPackage = require('../models/ClientPackage');
const Payment = require('../models/Payment');
const SessionNote = require('../models/SessionNote');

const normalizeTags = (tags) => Array.isArray(tags)
  ? [...new Set(tags.map((t) => String(t).trim()).filter(Boolean))]
  : [];

const addConsentAudit = (client, source = 'therapist') => {
  client.intake.consentGiven = true;
  client.intake.consentTimestamp = new Date();
  client.intake.consentHistory = client.intake.consentHistory || [];
  client.intake.consentHistory.push({
    givenAt: client.intake.consentTimestamp,
    source,
  });
};

const createClient = async (req, res) => {
  try {
    const { name, email, phone, tags } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Client.findOne({ therapist: req.therapist._id, email: normalizedEmail });
    if (existing) return res.status(409).json({ message: 'A client with this email already exists' });
    const client = await Client.create({ therapist: req.therapist._id, name: name.trim(), email: normalizedEmail, phone: phone || '', tags: normalizeTags(tags) });
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getClients = async (req, res) => {
  try {
    const { status, tag, search = '', sortBy = 'name', order = 'asc' } = req.query;
    const filter = { therapist: req.therapist._id };
    if (status && ['active', 'inactive'].includes(status)) filter.status = status;
    if (tag) filter.tags = tag;
    if (search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    const clients = await Client.find(filter).lean();
    const ids = clients.map((c) => c._id);
    const sessions = ids.length
      ? await Session.find({ therapist: req.therapist._id, client: { $in: ids } }).select('client date startTime status').lean()
      : [];
    const lastByClient = {};
    sessions.forEach((s) => {
      if (s.status === 'cancelled') return;
      const key = String(s.client);
      const iso = `${s.date}T${s.startTime}:00`;
      if (!lastByClient[key] || iso > lastByClient[key].iso) lastByClient[key] = { iso, date: s.date, startTime: s.startTime, status: s.status };
    });

    const result = clients.map((c) => ({
      ...c,
      lastSession: lastByClient[String(c._id)] || null,
    }));

    const direction = order === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      let av; let bv;
      if (sortBy === 'lastSession') { av = a.lastSession?.iso || ''; bv = b.lastSession?.iso || ''; }
      else if (sortBy === 'status') { av = a.status || ''; bv = b.status || ''; }
      else av = (a.name || '').toLowerCase(), bv = (b.name || '').toLowerCase();
      return String(av).localeCompare(String(bv)) * direction;
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getClientById = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, therapist: req.therapist._id }).lean();
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const [sessions, payments, notes, packageInfo] = await Promise.all([
      Session.find({ client: client._id, therapist: req.therapist._id }).sort({ date: -1, startTime: -1 }).lean(),
      Payment.find({ client: client._id, therapist: req.therapist._id }).populate('session', 'date startTime endTime').sort({ createdAt: -1 }).lean(),
      SessionNote.find({ client: client._id, therapist: req.therapist._id }).select('session type format content createdAt updatedAt').sort({ updatedAt: -1 }).lean(),
      ClientPackage.findOne({ client: client._id, therapist: req.therapist._id, status: 'active' }).populate('package', 'name pricePerSession numberOfSessions totalPrice validityDays').sort({ purchaseDate: -1 }).lean(),
    ]);

    res.status(200).json({ client, sessions, payments, notes, package: packageInfo });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const submitIntake = async (req, res) => {
  try {
    const { demographics = {}, presentingConcern = '', history = '', consentGiven } = req.body;
    const client = await Client.findOne({ _id: req.params.id, therapist: req.therapist._id });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    client.intake.demographics = {
      age: demographics.age === '' || demographics.age == null ? undefined : Number(demographics.age),
      gender: demographics.gender || '',
      occupation: demographics.occupation || '',
    };
    client.intake.presentingConcern = String(presentingConcern || '').trim();
    client.intake.history = String(history || '').trim();
    if (consentGiven) addConsentAudit(client, 'therapist');
    const updated = await client.save();
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Could not save intake' });
  }
};

const getClientPackage = async (req, res) => {
  try {
    const clientPackage = await ClientPackage.findOne({ client: req.params.id, therapist: req.therapist._id, status: 'active' })
      .populate('package', 'name pricePerSession numberOfSessions totalPrice validityDays')
      .sort({ purchaseDate: -1 });
    res.status(200).json(clientPackage || null);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Public pre-booking intake: used by the branded client portal before the first session.
// It creates/updates the client record identified by therapist + email and stores
// an auditable digital-consent timestamp. No client authentication is required
// because this is the first-step intake flow; subsequent portal operations remain protected.
const submitPublicIntake = async (req, res) => {
  try {
    const { slug, name, email, phone = '', demographics = {}, presentingConcern = '', history = '', consentGiven } = req.body;
    if (!slug || !name || !email) {
      return res.status(400).json({ message: 'Therapist slug, name and email are required' });
    }
    if (consentGiven !== true) {
      return res.status(400).json({ message: 'Digital consent is required before booking your first session.', code: 'CONSENT_REQUIRED' });
    }
    if (!String(presentingConcern).trim() || !String(history).trim()) {
      return res.status(400).json({ message: 'Presenting concern and relevant history are required for the intake form.', code: 'INTAKE_REQUIRED' });
    }

    const Therapist = require('../models/Therapist');
    const therapist = await Therapist.findOne({ slug: String(slug).toLowerCase().trim() });
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });

    const normalizedEmail = String(email).toLowerCase().trim();
    let client = await Client.findOne({ therapist: therapist._id, email: normalizedEmail });
    if (!client) {
      client = new Client({
        therapist: therapist._id,
        name: String(name).trim(),
        email: normalizedEmail,
        phone: String(phone || '').trim(),
      });
    } else if (client.hasAccount) {
      return res.status(409).json({
        message: 'This client account is already activated. Log in to the client portal to update the intake.',
        code: 'CLIENT_AUTH_REQUIRED',
      });
    } else if (client.intake?.consentGiven) {
      return res.status(200).json({
        message: 'Intake and digital consent are already complete. You can continue to booking.',
        client: { _id: client._id, name: client.name, email: client.email, hasAccount: client.hasAccount },
        intakeComplete: true,
      });
    } else {
      client.name = String(name).trim() || client.name;
      if (phone !== undefined) client.phone = String(phone || '').trim();
    }

    client.intake.demographics = {
      age: demographics.age === '' || demographics.age == null ? undefined : Number(demographics.age),
      gender: String(demographics.gender || '').trim(),
      occupation: String(demographics.occupation || '').trim(),
    };
    client.intake.presentingConcern = String(presentingConcern).trim();
    client.intake.history = String(history).trim();
    if (!client.intake.consentGiven) addConsentAudit(client, 'client-portal');

    await client.save();
    res.status(200).json({
      message: 'Intake and digital consent saved. You can continue to booking.',
      client: { _id: client._id, name: client.name, email: client.email, hasAccount: client.hasAccount },
      intakeComplete: true,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Could not save intake' });
  }
};

// Client-facing intake: only the authenticated client can update their own record.
const getMyIntake = async (req, res) => {
  res.status(200).json({
    _id: req.client._id,
    name: req.client.name,
    email: req.client.email,
    phone: req.client.phone,
    intake: req.client.intake || {},
  });
};

const submitMyIntake = async (req, res) => {
  try {
    const { demographics = {}, presentingConcern = '', history = '', consentGiven } = req.body;
    const client = await Client.findById(req.client._id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    client.intake.demographics = {
      age: demographics.age === '' || demographics.age == null ? undefined : Number(demographics.age),
      gender: String(demographics.gender || '').trim(),
      occupation: String(demographics.occupation || '').trim(),
    };
    client.intake.presentingConcern = String(presentingConcern || '').trim();
    client.intake.history = String(history || '').trim();

    if (consentGiven === true && !client.intake.consentGiven) addConsentAudit(client, 'client-portal');
    if (consentGiven === false) return res.status(400).json({ message: 'Digital consent is required before submitting the intake form.' });

    const saved = await client.save();
    res.status(200).json({ message: 'Intake and consent saved successfully', client: saved });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Could not save intake' });
  }
};

const getMyPortalData = async (req, res) => {
  try {
    const client = await Client.findById(req.client._id).populate('therapist', 'name slug bio specializations languages');
    const [sessions, payments, notes, packageInfo] = await Promise.all([
      Session.find({ client: req.client._id }).sort({ date: -1, startTime: -1 }).lean(),
      Payment.find({ client: req.client._id, status: 'paid' }).populate('session', 'date startTime endTime').sort({ createdAt: -1 }).lean(),
      SessionNote.find({ client: req.client._id, type: 'shared' }).select('session format content createdAt updatedAt').sort({ updatedAt: -1 }).lean(),
      ClientPackage.findOne({ client: req.client._id, status: 'active' }).populate('package', 'name pricePerSession numberOfSessions totalPrice validityDays').sort({ purchaseDate: -1 }).lean(),
    ]);
    res.status(200).json({ client, sessions, payments, notes, package: packageInfo });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getClients,
  createClient,
  getClientById,
  submitIntake,
  getClientPackage,
  submitPublicIntake,
  getMyIntake,
  submitMyIntake,
  getMyPortalData,
};
