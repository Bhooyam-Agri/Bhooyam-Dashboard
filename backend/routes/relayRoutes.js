const express = require('express');
const router = express.Router();
const relayController = require('../controllers/relayController');

// Add debug route
router.get('/debug', (req, res) => {
  res.json({
    ESP32_URL: process.env.ESP32_URL || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set'
  });
});

router.post('/toggle', relayController.toggleRelay);
router.get('/state', relayController.getRelayState);

module.exports = router; 