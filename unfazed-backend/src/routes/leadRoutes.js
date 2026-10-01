const express = require('express');
const router = express.Router();
const { createLead, listLeads } = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

router.post('/:slug', createLead);
router.get('/', protect, listLeads);

module.exports = router;
