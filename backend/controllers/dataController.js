const SensorData = require('../models/SensorData');
const mongoose = require('mongoose');
const { Parser } = require('json2csv');
const moment = require('moment-timezone');

// Utility function to parse sensor values
const parseSensorValue = (value) => {
  if (value === 0 || value === '0') return 0;  // Keep 0 as valid value
  if (value === null || value === undefined || value === 'nan' || value === 'NaN' || Number.isNaN(value)) {
    return null;
  }
  const numValue = parseFloat(value);
  return Number.isFinite(numValue) ? numValue : null;
};

// Utility function to parse soil moisture percentage
const parseSoilMoisture = (value) => {
  if (!value) return "Not working";
  if (typeof value === 'string' && value.includes('%')) {
    // If value already has %, don't add another
    return value;
  }
  // Convert to number and add %
  const numValue = parseFloat(value);
  return Number.isFinite(numValue) ? `${numValue}%` : "Not working";
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
    now.setHours(hours, minutes, seconds, 0); // Set milliseconds to 0
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

const convertToIST = (timestamp) => {
  return new Date(timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatISOTimestamp = (timestamp) => {
  if (!timestamp) return new Date().toISOString();
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

// @desc    Receive combined ESP data
// @route   POST /data/sensor
// @access  Public
exports.receiveESPData = async (req, res) => {
  try {
    const rawData = req.body;
    console.log('Raw ESP Data:', rawData);

    // Ensure consistent timestamp format
    rawData.timestamp = formatISOTimestamp(rawData.timestamp);

    // Format soil moisture data consistently
    if (rawData.soil_moisture_1 !== undefined && rawData.soil_moisture_2 !== undefined) {
      rawData.soilMoisture = [
        parseSoilMoisture(rawData.soil_moisture_1),
        parseSoilMoisture(rawData.soil_moisture_2)
      ];
    } else if (rawData.soilMoisture) {
      rawData.soilMoisture = rawData.soilMoisture.map(parseSoilMoisture);
    }

    // Convert esp_id to espId if needed
    if (!rawData.espId && rawData.esp_id) {
      rawData.espId = rawData.esp_id.toLowerCase();
    }

    // Ensure timestamp exists
    if (!rawData.timestamp) {
      rawData.timestamp = new Date().toISOString();
    }

    // Parse numeric values for sensors
    const sensorData = {
      ...rawData,
      dht22: rawData.dht22 ? {
        temp: parseSensorValue(rawData.dht22.temp),
        hum: parseSensorValue(rawData.dht22.hum),
        status: rawData.dht22.status || 'OK'
      } : undefined,
      waterTemperature: rawData.waterTemperature ? {
        value: parseSensorValue(rawData.waterTemperature.value),
        status: rawData.waterTemperature.status || 'OK'
      } : undefined,
      airQuality: rawData.airQuality ? {
        value: parseSensorValue(rawData.airQuality.value),
        status: rawData.airQuality.status || 'OK'
      } : undefined,
      lightIntensity: rawData.lightIntensity ? {
        value: parseSensorValue(rawData.lightIntensity.value),
        status: rawData.lightIntensity.status || 'OK'
      } : undefined,
      uvIndex: rawData.uvIndex ? {
        value: parseSensorValue(rawData.uvIndex.value),
        status: rawData.uvIndex.status || 'OK'
      } : undefined,
      ec: rawData.ec ? {
        value: parseSensorValue(rawData.ec.value),
        status: rawData.ec.status || 'OK'
      } : undefined,
      ph: rawData.ph ? {
        value: parseSensorValue(rawData.ph.value),
        status: rawData.ph.status || 'OK'
      } : undefined
    };

    // Clean up legacy fields
    delete sensorData.soil_moisture_1;
    delete sensorData.soil_moisture_2;
    delete sensorData.esp_id;

    const newSensorData = new SensorData(sensorData);
    await newSensorData.save();

    if (global.io) {
      global.io.emit('sensorData', {
        type: 'update',
        data: newSensorData
      });
    }

    res.status(201).json({ 
      message: 'Sensor data saved successfully',
      data: newSensorData
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
    const { page = 1, limit = 100, startDate, endDate, espId } = req.query;

    let query = {};
    
    // Filter by ESP ID if provided
    if (espId) {
      query.espId = espId.toLowerCase();
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

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
    const { startDate, endDate, espId } = req.query;

    let query = {};
    if (espId) {
      query.espId = espId.toLowerCase();
    }
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const sensorData = await SensorData.find(query).sort({ timestamp: -1 });

    if (sensorData.length === 0) {
      return res.status(404).json({ error: 'No data available for the specified filters.' });
    }

    // Define fields based on ESP type
    let fields = ['timestamp', 'espId', 'soilMoisture1', 'soilMoisture2'];
    
    // Add ESP1-specific fields if data is from ESP1
    if (espId === 'esp1' || !espId) {
      fields = fields.concat([
        'airTemperature',
        'airHumidity',
        'waterTemperature',
        'airQuality',
        'lightIntensity',
        'uvIndex',
        'ec',
        'ph'
      ]);
    }

    const opts = { fields };
    const parser = new Parser(opts);

    // Transform data for CSV
    const csvData = sensorData.map(entry => {
      const baseData = {
        timestamp: entry.timestamp,
        espId: entry.espId,
        soilMoisture1: entry.soilMoisture?.[0]?.replace('%', '') || 'N/A',
        soilMoisture2: entry.soilMoisture?.[1]?.replace('%', '') || 'N/A'
      };

      // Add ESP1-specific data if available
      if (entry.espId === 'esp1') {
        return {
          ...baseData,
          airTemperature: entry.dht22?.temp || 'N/A',
          airHumidity: entry.dht22?.hum || 'N/A',
          waterTemperature: entry.waterTemperature?.value || 'N/A',
          airQuality: entry.airQuality?.value || 'N/A',
          lightIntensity: entry.lightIntensity?.value || 'N/A',
          uvIndex: entry.uvIndex?.value || 'N/A',
          ec: entry.ec?.value || 'N/A',
          ph: entry.ph?.value || 'N/A'
        };
      }

      return baseData;
    });

    const csv = parser.parse(csvData);

    res.setHeader('Content-disposition', 'attachment; filename=sensor_data.csv');
    res.set('Content-Type', 'text/csv');
    res.status(200).send(csv);

  } catch (error) {
    console.error('Error exporting sensor data:', error);
    res.status(500).json({ error: 'Server error while exporting data.' });
  }
};
