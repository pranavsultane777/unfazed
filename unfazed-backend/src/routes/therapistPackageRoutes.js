const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/entitlementMiddleware');
const { listMyPackages } = require('../controllers/packageController');

router.get('/', protect, requireFeature('packages'), listMyPackages);

module.exports = router;
