// backend/controllers/relayController.js

const axios = require('axios');
require('dotenv').config();

// Track relay state - initialize as false (OFF)
let relayState = false;

// ESP32 URL - should be configured in .env
const ESP32_URL = process.env.ESP32_URL;

// Add debug logging
console.log('ESP32_URL:', ESP32_URL);

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

// Initialize relay state to OFF when server starts
const initializeRelay = async () => {
  try {
    if (!ESP32_URL) {
      console.error('ESP32_URL not configured. Please check your .env file');
      return;
    }

    console.log('Initializing relay with URL:', ESP32_URL);

    try {
      // Send OFF command to ESP32 at the correct endpoint
      const response = await axiosWithRetry({
        method: 'post',
        url: `${ESP32_URL}/api/relay/toggle`,
        data: { state: false },
        timeout: axiosConfig.timeout
      });
      
      console.log('Relay initialized successfully:', response.data);
      relayState = false;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        console.error('Failed to initialize relay: connection timeout. Will retry on next request.');
      } else {
        console.error('Failed to initialize relay:', error.message);
      }
    }
  } catch (error) {
    console.error('Relay initialization error:', error);
  }
};

// Call initialization when module loads
initializeRelay();

exports.toggleRelay = async (req, res) => {
  try {
    if (!ESP32_URL) {
      return res.status(500).json({ error: 'ESP32_URL not configured' });
    }

    const newState = req.body.state;
    const command = newState ? 'ON' : 'OFF';

    try {
      // Send command to ESP32 at the correct endpoint
      const response = await axiosWithRetry({
        method: 'post',
        url: `${ESP32_URL}/api/relay/toggle`,
        data: { state: command },
        timeout: axiosConfig.timeout
      });

      if (response.status === 200) {
        relayState = newState;
        return res.json({ state: relayState });
      }
    } catch (error) {
      console.error('ESP32 communication error:', error.message);
      return res.status(503).json({ 
        error: 'ESP32 not reachable. Check connection.',
        details: error.message 
      });
    }
  } catch (error) {
    console.error('Relay toggle error:', error);
    return res.status(500).json({ 
      error: 'Failed to control relay',
      details: error.message 
    });
  }
};

exports.getRelayState = async (req, res) => {
  try {
    if (!ESP32_URL) {
      return res.status(500).json({ error: 'ESP32_URL not configured' });
    }

    try {
      // Fetch relay state from ESP32
      const response = await axiosWithRetry({
        method: 'get',
        url: `${ESP32_URL}/api/relay/state`,
        timeout: axiosConfig.timeout
      });
      relayState = response.data.state === 'ON';
      return res.json({ state: relayState });
      
    } catch (error) {
      console.error('ESP32 communication error:', error.message);
      return res.status(503).json({ 
        error: 'ESP32 not reachable. Check connection.',
        details: error.message 
      });
    }
  } catch (error) {
    console.error('Failed to get relay state:', error);
    return res.status(500).json({ 
      error: 'Failed to get relay state',
      details: error.message 
    });
  }
};