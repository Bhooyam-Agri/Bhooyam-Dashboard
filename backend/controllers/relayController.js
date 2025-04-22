const axios = require('axios');
const WaterPumpSettings = require('../models/WaterPumpSettings');
require('dotenv').config();

// ESP32 URL - should be configured in .env
const ESP32_URL = process.env.ESP32_URL;

// Increase timeout and add retry logic
const axiosConfig = {
  timeout: 10000, // 10 seconds timeout
  retries: 3,
  retryDelay: 1000
};

const axiosWithRetry = async (config) => {
  let lastError;
  for (let i = 0; i < axiosConfig.retries; i++) {
    try {
      return await axios(config);
    } catch (error) {
      lastError = error;
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        await new Promise(resolve => setTimeout(resolve, axiosConfig.retryDelay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

exports.updatePumpSettings = async (req, res) => {
  try {
    const { espId, onDuration, offDuration } = req.body;

    if (!espId || !['esp1', 'esp2', 'esp3', 'esp4', 'esp5'].includes(espId)) {
      return res.status(400).json({ error: 'Valid ESP ID is required' });
    }

    // Validate durations
    if (onDuration < 1 || onDuration > 3600) {
      return res.status(400).json({ error: 'ON duration must be between 1 and 3600 seconds' });
    }
    if (offDuration < 1 || offDuration > 7200) {
      return res.status(400).json({ error: 'OFF duration must be between 1 and 7200 seconds' });
    }

    // Find and update settings in database
    let settings = await WaterPumpSettings.findOne({ espId });
    if (!settings) {
      settings = new WaterPumpSettings({ espId, onDuration, offDuration });
    } else {
      settings.onDuration = onDuration;
      settings.offDuration = offDuration;
      settings.lastUpdated = new Date();
    }
    await settings.save();

    // Send settings to ESP32 in the required format
    if (ESP32_URL) {
      try {
        const espData = {
          pump: {
            esp_id: espId,
            on_time: onDuration,    // in seconds
            off_time: offDuration,  // in seconds
          }
        };

        console.log(`Sending pump settings to ${espId}:`, espData);

        await axiosWithRetry({
          method: 'post',
          url: `${ESP32_URL}/api/pump/settings`,
          data: espData,
          timeout: axiosConfig.timeout
        });
      } catch (error) {
        console.error(`Failed to send settings to ${espId}:`, error);
        // Still save settings even if ESP32 is unreachable
      }
    }

    res.json({
      message: 'Water pump settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating pump settings:', error);
    res.status(500).json({ error: 'Failed to update pump settings' });
  }
};

exports.getPumpSettings = async (req, res) => {
  try {
    const { espId } = req.query;

    if (!espId || !['esp1', 'esp2', 'esp3', 'esp4', 'esp5'].includes(espId)) {
      return res.status(400).json({ error: 'Valid ESP ID is required' });
    }

    let settings = await WaterPumpSettings.findOne({ espId });
    if (!settings) {
      settings = new WaterPumpSettings({ espId });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching pump settings:', error);
    res.status(500).json({ error: 'Failed to fetch pump settings' });
  }
};