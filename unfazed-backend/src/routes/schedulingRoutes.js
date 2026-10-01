const express = require('express');
const router = express.Router();
const { protect, protectClient } = require('../middleware/authMiddleware');
const {
  setAvailability,
  getMyAvailability,
  getAvailableSlots,
  bookSlot,
  getMySessions,
  updateSessionStatus,
} = require('../controllers/schedulingController');

router.put('/availability', protect, setAvailability);
router.get('/availability/me', protect, getMyAvailability);
router.get('/slots/:slug', getAvailableSlots);
router.post('/book', protectClient, bookSlot);
router.get('/sessions/me', protect, getMySessions);
router.patch('/sessions/:id/status', protect, updateSessionStatus);

module.exports = router;