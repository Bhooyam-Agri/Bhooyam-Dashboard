const SensorData = require('../models/SensorData');
const mongoose = require('mongoose');
const { Parser } = require('json2csv');
const moment = require('moment-timezone');

// Utility function to parse and validate sensor values
const parseSensorValue = (value) => {
  if (value === null || value === undefined || value === 'nan' || value === NaN || Number.isNaN(value)) {
    return null;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

// Utility function to parse soil moisture percentage
const parseSoilMoisture = (value) => {
  if (!value) return "Not working";
  // Remove the % symbol if present and convert to number
  const numValue = parseFloat(value.replace('%', ''));
  return Number.isFinite(numValue) ? String(numValue) + "%" : "Not working";
};

// Utility function to create a valid timestamp
const createValidTimestamp = (timeString) => {
  // If it's already a valid date object or timestamp, return it
  if (timeString instanceof Date || typeof timeString === 'number') {
    return new Date(timeString);
  }

  // If it's a time string (HH:mm:ss), create today's date with that time
  if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const now = new Date();
    now.setHours(hours, minutes, seconds);
    return now;
  }

  // Try parsing as ISO string or other formats
  const parsed = new Date(timeString);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // If all else fails, return current time
  return new Date();
};

// @desc    Receive combined ESP data
// @route   POST /data/sensor
// @access  Public
exports.receiveESPData = async (req, res) => {
  try {
    let rawData;
    
    try {
      // Handle raw body if it's a string
      if (typeof req.body === 'string') {
        // Replace any NaN values with null before parsing
        const sanitizedJson = req.body
          .replace(/:\s*nan\b/g, ': null')
          .replace(/:\s*NaN\b/g, ': null')
          .replace(/:\s*undefined\b/g, ': null');
        rawData = JSON.parse(sanitizedJson);
      } else {
        rawData = req.body;
      }

      console.log('Received data:', rawData); // Debug log
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw body:', req.body);
      return res.status(400).json({ error: 'Invalid JSON data format' });
    }

    // Extract and validate timestamp
    const timestamp = createValidTimestamp(rawData.timestamp);
    console.log('Parsed timestamp:', timestamp); // Debug log

    // Extract other data with proper type checking
    const {
      soilMoisture = ["Not working", "Not working"],
      dht22 = { temp: null, hum: null, status: "Not working" },
      airQuality = { value: null, status: "Not working" },
      lightIntensity = { value: null, status: "Not working" },
      waterTemperature = { value: null, status: "Not working" }
    } = rawData;

    // Create new sensor data with validated values
    const newSensorData = new SensorData({
      timestamp: timestamp,
      espId: 'ESP1',
      soilMoisture: Array.isArray(soilMoisture) 
        ? soilMoisture.map(parseSoilMoisture)
        : ["Not working", "Not working"],
      dht22: {
        temp: parseSensorValue(dht22.temp),
        hum: parseSensorValue(dht22.hum),
        status: dht22.status || 'Not working'
      },
      airQuality: {
        value: parseSensorValue(airQuality.value),
        status: airQuality.status || 'Not working'
      },
      lightIntensity: {
        value: parseSensorValue(lightIntensity.value),
        status: lightIntensity.status || 'Not working'
      },
      waterTemperature: {
        value: parseSensorValue(waterTemperature.value),
        status: waterTemperature.status || 'Not working'
      }
    });

    console.log('Saving sensor data:', {
      ...newSensorData.toObject(),
      timestamp: timestamp.toISOString()
    });

    await newSensorData.save();

    // Emit the new data via WebSocket
    if (global.io) {
      global.io.emit('sensorData', {
        type: 'update',
        data: newSensorData
      });
    }

    res.status(201).json({ 
      message: 'Sensor data saved successfully',
      timestamp: timestamp.toISOString()
    });

  } catch (error) {
    console.error('Error saving sensor data:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// @desc    Fetch sensor data with pagination and filters
// @route   GET /data
// @access  Public
exports.getData = async (req, res) => {
  try {
    const { page = 1, limit = 15, startDate, endDate } = req.query;
    let query = {};

    // Handle real-time updates by setting the query to get latest data
    if (!startDate && !endDate) {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - (30 * 60 * 1000));
      query.timestamp = { $gte: thirtyMinutesAgo };
    } else {
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }
    }

    // Set headers for real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // Fetch latest data
    const sensorData = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      items: sensorData,
      totalPages: 1,
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Error in getData:', error);
    res.status(500).json({ error: 'Server error while fetching data' });
  }
};

// @desc    Export sensor data as CSV
// @route   GET /data/export
// @access  Public
exports.exportData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build the query object
    let query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Fetch all matching data
    const sensorData = await SensorData.find(query).sort({ timestamp: -1 });

    if (sensorData.length === 0) {
      return res.status(404).json({ error: 'No data available for the specified filters.' });
    }

    // Prepare data for CSV
    const fields = [
      'timestamp',
      ...sensorData[0].soilMoisture.map((_, index) => `soilMoisture${index + 1}`),
      ...sensorData[0].dht22.map((_, index) => `dht22${index + 1}_temp`),
      ...sensorData[0].dht22.map((_, index) => `dht22${index + 1}_hum`),
      ...sensorData[0].waterTemperature.map((_, index) => `waterTemperature${index + 1}`),
      ...sensorData[0].airQuality.map((_, index) => `airQuality${index + 1}`),
      ...sensorData[0].lightIntensity.map((_, index) => `lightIntensity${index + 1}`),
    ];

    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(
      sensorData.map((entry) => ({
        timestamp: moment(entry.timestamp).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
        ...entry.soilMoisture.reduce((acc, value, index) => {
          acc[`soilMoisture${index + 1}`] = value;
          return acc;
        }, {}),
        ...entry.dht22.reduce((acc, dht, index) => {
          acc[`dht22${index + 1}_temp`] = dht.temp !== undefined ? dht.temp : 'Not working';
          acc[`dht22${index + 1}_hum`] = dht.hum !== undefined ? dht.hum : 'Not working';
          return acc;
        }, {}),
        ...entry.waterTemperature.reduce((acc, value, index) => {
          acc[`waterTemperature${index + 1}`] = value.value;
          acc[`waterTemperature${index + 1}_status`] = value.status;
          return acc;
        }, {}),
        ...entry.airQuality.reduce((acc, value, index) => {
          acc[`airQuality${index + 1}`] = value.value;
          acc[`airQuality${index + 1}_status`] = value.status;
          return acc;
        }, {}),
        ...entry.lightIntensity.reduce((acc, value, index) => {
          acc[`lightIntensity${index + 1}`] = value.value;
          acc[`lightIntensity${index + 1}_status`] = value.status;
          return acc;
        }, {}),
      }))
    );

    res.setHeader('Content-disposition', 'attachment; filename=sensor_data.csv');
    res.set('Content-Type', 'text/csv');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting sensor data:', error.message);
    res.status(500).json({ error: 'Server error while exporting data.' });
  }
};
