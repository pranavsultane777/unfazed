const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getPublicProfile,
  getMyProfile,
  updateMyProfile,
} = require('../controllers/therapistController');

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.get('/profile/:slug', getPublicProfile);

module.exports = router;