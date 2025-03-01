// backend/controllers/relayController.js

const axios = require('axios');
require('dotenv').config();

// Track relay state - initialize as false (OFF)
let relayState = false;

// ESP32 URL - should be configured in .env
const ESP32_URL = process.env.ESP32_URL;

// Add debug logging
console.log('ESP32_URL:', ESP32_URL);

// Add timeout to axios requests
const axiosConfig = {
  timeout: 5000, // 5 seconds timeout
};

// Initialize relay state to OFF when server starts
const initializeRelay = async () => {
  try {
    if (!ESP32_URL) {
      console.error('ESP32_URL not configured. Please check your .env file');
      return;
    }

    console.log('Initializing relay with URL:', ESP32_URL);

    // Send OFF command to ESP32 at the correct endpoint
    const response = await axios.post(`${ESP32_URL}/api/relay/toggle`, {
      state: false
    }, axiosConfig);
    
    relayState = false;
    console.log('Relay initialized to OFF state');
  } catch (error) {
    console.error('Failed to initialize relay:', error.message);
    console.error('Full error:', error);
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
      const response = await axios.post(`${ESP32_URL}/api/relay/toggle`, {
        state: command
      }, { timeout: 5000 });

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
      const response = await axios.get(`${ESP32_URL}/api/relay/state`, { 
        timeout: 5000 
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