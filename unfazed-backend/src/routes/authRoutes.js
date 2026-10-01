const express = require('express');
const router = express.Router();
const { registerTherapist, loginTherapist } = require('../controllers/authController');

router.post('/register', registerTherapist);
router.post('/login', loginTherapist);

module.exports = router;