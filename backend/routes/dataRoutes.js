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

// Debug route to check raw timestamp
router.get('/debug/latest', async (req, res) => {
  try {
    const latestData = await SensorData.find()
      .sort({ timestamp: -1 })
      .limit(1)
      .lean();
    
    res.json({ 
      raw: latestData[0],
      receivedAt: new Date().toISOString(),
      timestamp: latestData[0]?.timestamp,
      timestampType: typeof latestData[0]?.timestamp
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Test route to check data format
router.get('/test', async (req, res) => {
  try {
    const latest = await SensorData.findOne().sort({ timestamp: -1 }).lean();
    res.json({ 
      data: latest,
      timestamp_raw: latest?.timestamp,
      timestamp_type: typeof latest?.timestamp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
