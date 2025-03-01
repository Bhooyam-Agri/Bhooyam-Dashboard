const express = require('express');
const router = express.Router();
const { 
  receiveESP1Data, 
  receiveESP2Data, 
  getData, 
  exportData 
} = require('../controllers/dataController');
const SensorData = require('../models/SensorData');

// ESP1 data route (soil moisture and DHT22)
router.post('/esp1', receiveESP1Data);

// ESP2 data route (soil temp, air quality, light)
router.post('/esp2', receiveESP2Data);

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
