const Alert = require('../models/Alert');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Set();
  }

  // Handle new sensor data
  handleNewData(data) {
    // Emit to all connected clients with ESP identifier
    this.io.emit('newSensorData', {
      espId: data.espId,
      ...data
    });
    
    // Check for alerts
    this.checkAlerts(data);
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