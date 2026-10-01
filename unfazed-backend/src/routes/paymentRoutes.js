const express = require('express');
const router = express.Router();
const { protect, protectAny } = require('../middleware/authMiddleware');
const { requireFeature } = require('../middleware/entitlementMiddleware');
const {
  createOrder,
  verifyPayment,
  razorpayWebhook,
  createPackage,
  getPackages,
  getInvoice,
} = require('../controllers/paymentController');

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.post('/webhook', razorpayWebhook);
router.post('/packages', protect, requireFeature('packages'), createPackage);
router.get('/packages/:slug', getPackages);
router.get('/:paymentId/invoice', protectAny, getInvoice);

module.exports = router;
