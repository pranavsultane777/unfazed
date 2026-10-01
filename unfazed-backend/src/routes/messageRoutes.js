const express = require('express');
const router = express.Router();
const { getMessagesByRoom } = require('../controllers/messageController');
const { protectAny } = require('../middleware/authMiddleware');

router.get('/:roomId', protectAny, getMessagesByRoom);

module.exports = router;