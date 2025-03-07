const express = require('express');
const router = express.Router();
const { 
  receiveESPData, 
  getData, 
  exportData 
} = require('../controllers/dataController');
const SensorData = require('../models/SensorData');

// Combined ESP data route
router.post('/sensor', receiveESPData);

// Get all data with optional filtering
router.get('/', getData);

// Export data as CSV
router.get('/export', exportData);

// Add a test route to check raw data
router.get('/raw', async (req, res) => {
  try {
    const data = await SensorData.find().sort({ timestamp: -1 }).limit(1);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
