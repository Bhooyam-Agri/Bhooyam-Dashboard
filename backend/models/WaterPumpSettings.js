const mongoose = require('mongoose');

const waterPumpSettingsSchema = new mongoose.Schema({
  espId: {
    type: String,
    required: true,
    enum: ['esp1', 'esp2', 'esp3', 'esp4', 'esp5']
  },
  onDuration: {
    type: Number,
    required: true,
    min: 1,
    max: 3600,  // Maximum 1 hour in seconds
    default: 300 // Default 5 minutes
  },
  offDuration: {
    type: Number,
    required: true,
    min: 1,
    max: 7200,  // Maximum 2 hours in seconds
    default: 1800 // Default 30 minutes
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

waterPumpSettingsSchema.index({ espId: 1 });

module.exports = mongoose.model('WaterPumpSettings', waterPumpSettingsSchema);