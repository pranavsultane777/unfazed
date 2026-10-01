const express = require('express');
const router = express.Router();
const { getSummary } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { enforceAnalyticsDepth } = require('../middleware/entitlementMiddleware');

router.get('/summary', protect, enforceAnalyticsDepth, getSummary);

module.exports = router;