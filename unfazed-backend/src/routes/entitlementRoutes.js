const router = require('express').Router();
const { getMyEntitlements, listTiers } = require('../controllers/entitlementController');
const { protect } = require('../middleware/authMiddleware');
router.get('/tiers', listTiers);
router.get('/me', protect, getMyEntitlements);
module.exports = router;
