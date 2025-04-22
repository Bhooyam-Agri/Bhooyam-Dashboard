const express = require('express');
const router = express.Router();
const { 
    updatePumpSettings,
    getPumpSettings
} = require('../controllers/relayController');

// Water pump settings routes
router.post('/pump/settings', updatePumpSettings);
router.get('/pump/settings', getPumpSettings);

module.exports = router;