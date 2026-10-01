const express = require('express');
const router = express.Router();
const { protect, protectClient } = require('../middleware/authMiddleware');
const { requireNoteFormat } = require('../middleware/entitlementMiddleware');
const {
  createNote,
  getTherapistNotesForClient,
  updateNote,
  getSharedNotesForClient,
} = require('../controllers/noteController');

router.post('/', protect, requireNoteFormat, createNote);
router.get('/client/:clientId', protect, getTherapistNotesForClient);
router.put('/:id', protect, requireNoteFormat, updateNote);
router.get('/shared/:clientId', protectClient, getSharedNotesForClient);

module.exports = router;