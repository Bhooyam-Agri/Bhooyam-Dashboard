const axios = require('axios');
const PeristalticPumpSettings = require('../models/PeristalticPumpSettings');
require('dotenv').config();

const ESP32_URL = process.env.ESP32_URL;

const axiosConfig = {
  timeout: 5000,
  retries: 2,
  retryDelay: 500
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
    const { pumpNumber, targetVolume } = req.body;

    // Validate input
    if (!pumpNumber || pumpNumber < 1 || pumpNumber > 4) {
      return res.status(400).json({ error: 'Invalid pump number (1-4)' });
    }
    if (targetVolume < 0 || targetVolume > 1000) {
      return res.status(400).json({ error: 'Target volume must be between 0-1000 ml' });
    }

    // Create or update pump settings
    // Flow rate will be automatically determined in the model's pre-save middleware
    let settings = await PeristalticPumpSettings.findOne({ pumpNumber });
    if (!settings) {
      settings = new PeristalticPumpSettings({
        pumpNumber,
        targetVolume,
        flowRate: 1 // Default value that will be overridden by pre-save hook
      });
    } else {
      settings.targetVolume = targetVolume;
      settings.lastUpdated = new Date();
      // Flow rate will be automatically set in the pre-save hook
    }
    await settings.save();

    // Calculate duration based on flow rate and target volume
    // Duration (seconds) = (Target Volume (ml) / Flow Rate (ml/min)) * 60
    const durationSeconds = targetVolume > 0 && settings.flowRate > 0 
      ? Math.round((targetVolume / settings.flowRate) * 60)
      : 0;

    // Send settings to ESP32
    if (ESP32_URL) {
      try {
        const espData = {
          peristaltic: {
            pump: pumpNumber,
            pwm: settings.pwmValue,      // PWM value (0-255) calculated in model
            duration: durationSeconds     // Duration in seconds
          }
        };

        console.log('Sending peristaltic pump settings to ESP32:', espData);

        await axiosWithRetry({
          method: 'post',
          url: `${ESP32_URL}/api/peristaltic/control`,
          data: espData,
          timeout: axiosConfig.timeout
        });

        settings.isActive = true;
        await settings.save();

      } catch (error) {
        console.error('Failed to send settings to ESP32:', error);
        return res.status(503).json({ 
          error: 'Failed to communicate with ESP32',
          settings: settings,
          calculatedValues: {
            pwm: settings.pwmValue,
            durationSeconds: durationSeconds,
            autoFlowRate: settings.flowRate
          }
        });
      }
    }

    res.json({
      message: 'Peristaltic pump settings updated successfully',
      settings,
      calculatedValues: {
        pwm: settings.pwmValue,
        durationSeconds: durationSeconds,
        autoFlowRate: settings.flowRate
      }
    });

  } catch (error) {
    console.error('Error updating peristaltic pump settings:', error);
    res.status(500).json({ error: 'Failed to update pump settings' });
  }
};

exports.getPumpSettings = async (req, res) => {
  try {
    const { pumpNumber } = req.params;
    
    if (!pumpNumber || pumpNumber < 1 || pumpNumber > 4) {
      return res.status(400).json({ error: 'Invalid pump number (1-4)' });
    }

    const settings = await PeristalticPumpSettings.findOne({ pumpNumber });
    if (!settings) {
      return res.status(404).json({ error: 'Pump settings not found' });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching pump settings:', error);
    res.status(500).json({ error: 'Failed to fetch pump settings' });
  }
};

exports.getAllPumpSettings = async (req, res) => {
  try {
    const settings = await PeristalticPumpSettings.find().sort({ pumpNumber: 1 });
    res.json(settings);
  } catch (error) {
    console.error('Error fetching all pump settings:', error);
    res.status(500).json({ error: 'Failed to fetch pump settings' });
  }
};

exports.stopPump = async (req, res) => {
  try {
    const { pumpNumber } = req.params;

    if (!pumpNumber || pumpNumber < 1 || pumpNumber > 4) {
      return res.status(400).json({ error: 'Invalid pump number (1-4)' });
    }

    if (ESP32_URL) {
      try {
        const espData = {
          peristaltic: {
            pump: parseInt(pumpNumber),
            pwm: 0,
            duration: 0
          }
        };

        await axiosWithRetry({
          method: 'post',
          url: `${ESP32_URL}/api/peristaltic/control`,
          data: espData,
          timeout: axiosConfig.timeout
        });

        // Update pump status in database
        const settings = await PeristalticPumpSettings.findOne({ pumpNumber });
        if (settings) {
          settings.isActive = false;
          await settings.save();
        }

        res.json({ message: 'Pump stopped successfully' });
      } catch (error) {
        console.error('Failed to stop pump:', error);
        res.status(503).json({ error: 'Failed to communicate with ESP32' });
      }
    } else {
      res.status(500).json({ error: 'ESP32_URL not configured' });
    }
  } catch (error) {
    console.error('Error stopping pump:', error);
    res.status(500).json({ error: 'Failed to stop pump' });
  }
};