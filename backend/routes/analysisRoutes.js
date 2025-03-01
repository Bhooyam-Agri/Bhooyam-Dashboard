const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

// Keep only basic data analysis routes
router.get('/alerts', analysisController.getAlerts);
router.post('/alerts/configure', analysisController.configureAlerts);

module.exports = router; 