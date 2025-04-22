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
    enum: ['esp1', 'esp2', 'esp3', 'esp4', 'esp5']
  },
  soilMoisture: [{
    type: String
  }],
  // ESP1 specific fields
  dht22: {
    temp: {
      type: Number,
      default: null,
      set: v => v === null || v === undefined || isNaN(v) ? null : Number(v)
    },
    hum: {
      type: Number,
      default: null,
      set: v => v === null || v === undefined || isNaN(v) ? null : Number(v)
    },
    status: String
  },
  airQuality: {
    value: {
      type: Number,
      default: null,
      set: v => v === null || v === undefined || isNaN(v) ? null : Number(v)
    },
    status: String
  },
  lightIntensity: {
    value: {
      type: Number,
      default: null,
      set: v => v === null || v === undefined || isNaN(v) ? null : Number(v)
    },
    status: String
  },
  waterTemperature: {
    value: {
      type: Number,
      default: null,
      set: v => v === null || v === undefined || isNaN(v) ? null : Number(v)
    },
    status: String
  },
  uvIndex: {
    value: {
      type: Number,
      default: null,
      set: v => v === null || v === undefined || isNaN(v) ? null : Number(v)
    },
    status: String
  },
  ec: {
    value: {
      type: Number,
      default: null,
      set: v => v === null || v === undefined || isNaN(v) ? null : Number(v)
    },
    status: String
  },
  ph: {
    value: {
      type: Number,
      default: null,
      set: v => v === null || v === undefined || isNaN(v) ? null : Number(v)
    },
    status: String
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  strict: true  // Only allow defined schema fields
});

// Add compound index for efficient querying
sensorDataSchema.index({ espId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
