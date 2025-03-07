const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  timestamp: {
    type: String,  // Store raw timestamp string from ESP32
    required: true,
    trim: true
  },
  espId: {
    type: String,
    required: true,
    default: 'ESP1'
  },
  soilMoisture: [{
    type: String
  }],
  dht22: {
    temp: Number,
    hum: Number,
    status: String
  },
  airQuality: {
    value: Number,
    status: String
  },
  lightIntensity: {
    value: Number,
    status: String
  },
  waterTemperature: {
    value: Number,
    status: String
  }
}, {
  strict: true  // Only allow defined schema fields
});

module.exports = mongoose.model('SensorData', sensorDataSchema);
