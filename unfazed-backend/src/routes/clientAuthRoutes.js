const express = require('express');
const router = express.Router();
const { setPassword, loginClient, getMe } = require('../controllers/clientAuthController');
const { protectClient } = require('../middleware/authMiddleware');

router.post('/set-password', setPassword);
router.post('/login', loginClient);
router.get('/me', protectClient, getMe);

module.exports = router;
