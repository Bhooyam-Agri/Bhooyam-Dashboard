const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  espId: {
    type: String,
    required: true,
    enum: ['ESP1', 'ESP2']  // To identify which ESP sent the data
  },
  // ESP1 Data
  soilMoisture: {
    type: [String],
    required: function() { return this.espId === 'ESP1'; }
  },
  dht22: {
    temp: {
      type: Number,
      required: function() { return this.espId === 'ESP1'; }
    },
    hum: {
      type: Number,
      required: function() { return this.espId === 'ESP1'; }
    },
    status: {
      type: String,
      default: 'OK'
    }
  },
  // ESP2 Data
  soilTemp: {
    value: {
      type: Number,
      required: function() { return this.espId === 'ESP2'; }
    },
    status: {
      type: String,
      default: 'OK'
    }
  },
  airQuality: {
    value: {
      type: Number,
      required: function() { return this.espId === 'ESP2'; }
    },
    status: {
      type: String,
      default: 'OK'
    }
  },
  lightIntensity: {
    value: {
      type: Number,
      required: function() { return this.espId === 'ESP2'; }
    },
    status: {
      type: String,
      default: 'OK'
    }
  }
});

module.exports = mongoose.model('SensorData', sensorDataSchema);
