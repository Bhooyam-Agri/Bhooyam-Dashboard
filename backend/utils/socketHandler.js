const Alert = require('../models/Alert');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map();
    this.recentData = new Map(); // Store recent data for each ESP
    this.MAX_RECENT_DATA = 100;
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return new Date().toISOString();
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  // Handle new sensor data
  handleNewData(data) {
    if (!data.espId) return;

    // Ensure consistent timestamp format
    const formattedData = {
      ...data,
      timestamp: this.formatTimestamp(data.timestamp)
    };

    // Store data in recent history
    if (!this.recentData.has(data.espId)) {
      this.recentData.set(data.espId, []);
    }

    const espData = this.recentData.get(data.espId);
    espData.unshift(formattedData); // Add to beginning for newest first

    // Keep only last MAX_RECENT_DATA points
    if (espData.length > this.MAX_RECENT_DATA) {
      espData.pop(); // Remove oldest data point
    }

    this.recentData.set(data.espId, espData);

    // Emit to all connected clients
    this.io.emit('sensorData', {
      type: 'update',
      data: formattedData
    });
    
    // Check for alerts
    this.checkAlerts(formattedData);
  }

  // Get recent data for an ESP
  getRecentData(espId) {
    return this.recentData.get(espId) || [];
  }

  // Check if any sensor readings trigger alerts
  async checkAlerts(data) {
    try {
      const alerts = await Alert.find({}).populate('user');
      
      alerts.forEach(alert => {
        const violations = this.checkThresholds(data, alert.thresholds);
        if (violations.length > 0) {
          this.io.to(alert.user._id.toString()).emit('alert', {
            message: `Sensor threshold violated on ${data.espId}`,
            violations,
            espId: data.espId
          });
        }
      });
    } catch (error) {
      console.error('Alert check error:', error);
    }
  }

  // Check if readings violate thresholds
  checkThresholds(data, thresholds) {
    const violations = [];

    if (data.espId === 'ESP1') {
      // Check soil moisture
      if (data.soilMoisture) {
        data.soilMoisture.forEach((value, index) => {
          if (value !== "Not working") {
            const numValue = parseInt(value, 10);
            if (numValue < thresholds.soilMoisture.min || 
                numValue > thresholds.soilMoisture.max) {
              violations.push({
                sensor: `Soil Moisture ${index + 1}`,
                value: numValue,
                threshold: numValue < thresholds.soilMoisture.min ? 'min' : 'max'
              });
            }
          }
        });
      }

      // Check DHT22
      if (data.dht22) {
        if (data.dht22.temp < thresholds.temperature.min || 
            data.dht22.temp > thresholds.temperature.max) {
          violations.push({
            sensor: 'Temperature',
            value: data.dht22.temp,
            threshold: data.dht22.temp < thresholds.temperature.min ? 'min' : 'max'
          });
        }

        if (data.dht22.hum < thresholds.humidity.min || 
            data.dht22.hum > thresholds.humidity.max) {
          violations.push({
            sensor: 'Humidity',
            value: data.dht22.hum,
            threshold: data.dht22.hum < thresholds.humidity.min ? 'min' : 'max'
          });
        }
      }
    }

    if (data.espId === 'ESP2') {
      // Check soil temperature
      if (data.soilTemp && data.soilTemp.value !== undefined) {
        if (data.soilTemp.value < thresholds.soilTemperature.min || 
            data.soilTemp.value > thresholds.soilTemperature.max) {
          violations.push({
            sensor: 'Soil Temperature',
            value: data.soilTemp.value,
            threshold: data.soilTemp.value < thresholds.soilTemperature.min ? 'min' : 'max'
          });
        }
      }

      // Check air quality
      if (data.airQuality && data.airQuality.value !== undefined) {
        if (data.airQuality.value < thresholds.airQuality.min || 
            data.airQuality.value > thresholds.airQuality.max) {
          violations.push({
            sensor: 'Air Quality',
            value: data.airQuality.value,
            threshold: data.airQuality.value < thresholds.airQuality.min ? 'min' : 'max'
          });
        }
      }

      // Check light intensity
      if (data.lightIntensity && data.lightIntensity.value !== undefined) {
        if (data.lightIntensity.value < thresholds.lightIntensity.min || 
            data.lightIntensity.value > thresholds.lightIntensity.max) {
          violations.push({
            sensor: 'Light Intensity',
            value: data.lightIntensity.value,
            threshold: data.lightIntensity.value < thresholds.lightIntensity.min ? 'min' : 'max'
          });
        }
      }
    }

    return violations;
  }
}

module.exports = SocketHandler;