const express = require('express');
const router = express.Router();
const { protectClient } = require('../middleware/authMiddleware');
const { submitPublicIntake, getMyIntake, submitMyIntake, getMyPortalData } = require('../controllers/clientController');

router.post('/public-intake', submitPublicIntake);
router.get('/me', protectClient, getMyPortalData);
router.get('/intake', protectClient, getMyIntake);
router.put('/intake', protectClient, submitMyIntake);

module.exports = router;
