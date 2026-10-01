const express = require('express');
const router = express.Router();
const {
  getClients,
  createClient,
  getClientById,
  submitIntake,
  getClientPackage,
} = require('../controllers/clientController');
const { protect } = require('../middleware/authMiddleware');
const { enforceActiveClientCap } = require('../middleware/entitlementMiddleware');

router.post('/', protect, enforceActiveClientCap, createClient);
router.get('/', protect, getClients);
router.get('/:id/package', protect, getClientPackage);
router.get('/:id', protect, getClientById);
router.put('/:id/intake', protect, submitIntake);

module.exports = router;
