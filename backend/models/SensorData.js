const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    validate: {
      validator: function(v) {
        return !isNaN(v.getTime());
      },
      message: props => `${props.value} is not a valid timestamp!`
    }
  },
  espId: {
    type: String,
    required: true,
    default: 'ESP1'
  },
  soilMoisture: [{
    type: String,
    default: "Not working"
  }],
  dht22: {
    temp: {
      type: Number,
      default: null
    },
    hum: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      default: 'OK'
    }
  },
  airQuality: {
    value: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      default: 'OK'
    }
  },
  lightIntensity: {
    value: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      default: 'OK'
    }
  },
  waterTemperature: {
    value: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      default: 'OK'
    }
  }
});

// Add a pre-save middleware to ensure timestamp is always valid
sensorDataSchema.pre('save', function(next) {
  if (!this.timestamp || isNaN(this.timestamp.getTime())) {
    this.timestamp = new Date();
  }
  next();
});

module.exports = mongoose.model('SensorData', sensorDataSchema);
