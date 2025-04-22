const mongoose = require('mongoose');

const peristalticPumpSettingsSchema = new mongoose.Schema({
  pumpNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  flowRate: {
    type: Number,
    required: true,
    min: 1,
    max: 100  // Maximum 100 ml per minute
  },
  targetVolume: {
    type: Number,
    required: true,
    min: 0,
    max: 1000  // maximum 1 liter
  },
  pwmValue: {
    type: Number,
    min: 10,    // Minimum PWM value changed to 10
    max: 255    // Maximum PWM value remains 255
  },
  isActive: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate PWM value
peristalticPumpSettingsSchema.pre('save', function(next) {
  // Map flow rate (1-100 ml/min) to PWM value (10-255)
  // Using the formula: PWM = (flow - minFlow) * (maxPWM - minPWM) / (maxFlow - minFlow) + minPWM
  const minFlow = 1;     // Minimum flow rate in ml/min
  const maxFlow = 100;   // Maximum flow rate in ml/min
  const minPWM = 10;     // Minimum PWM value
  const maxPWM = 255;    // Maximum PWM value
  
  this.pwmValue = Math.round((this.flowRate - minFlow) * (maxPWM - minPWM) / (maxFlow - minFlow) + minPWM);
  
  // Ensure PWM value stays within bounds
  this.pwmValue = Math.min(Math.max(this.pwmValue, minPWM), maxPWM);
  
  next();
});

module.exports = mongoose.model('PeristalticPumpSettings', peristalticPumpSettingsSchema);