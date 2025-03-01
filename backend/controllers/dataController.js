const SensorData = require('../models/SensorData');
const mongoose = require('mongoose');
const { Parser } = require('json2csv');
const moment = require('moment-timezone');

// @desc    Receive data from ESP1 (soil moisture and DHT22)
// @route   POST /data/esp1
// @access  Public
exports.receiveESP1Data = async (req, res) => {
  try {
    const { soilMoisture, dht22 } = req.body;
    
    if (!soilMoisture || !dht22) {
      return res.status(400).json({ error: 'Incomplete ESP1 sensor data.' });
    }

    const newSensorData = new SensorData({
      espId: 'ESP1',
      soilMoisture,
      dht22: {
        temp: dht22.temp,
        hum: dht22.hum,
        status: dht22.status || 'OK'
      }
    });

    await newSensorData.save();
    res.status(201).json({ message: 'ESP1 data saved successfully' });
  } catch (error) {
    console.error('Error saving ESP1 sensor data:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// @desc    Receive data from ESP2 (soil temp, air quality, light)
// @route   POST /data/esp2
// @access  Public
exports.receiveESP2Data = async (req, res) => {
  try {
    const { soilTemp, airQuality, lightIntensity } = req.body;
    
    if (!soilTemp || !airQuality || !lightIntensity) {
      return res.status(400).json({ error: 'Incomplete ESP2 sensor data.' });
    }

    const newSensorData = new SensorData({
      espId: 'ESP2',
      soilTemp: {
        value: soilTemp.value,
        status: soilTemp.status || 'OK'
      },
      airQuality: {
        value: airQuality.value,
        status: airQuality.status || 'OK'
      },
      lightIntensity: {
        value: lightIntensity.value,
        status: lightIntensity.status || 'OK'
      }
    });

    await newSensorData.save();
    res.status(201).json({ message: 'ESP2 data saved successfully' });
  } catch (error) {
    console.error('Error saving ESP2 sensor data:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// @desc    Fetch sensor data with pagination and filters
// @route   GET /data
// @access  Public
exports.getData = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, espId } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (espId) {
      query.espId = espId;
    }

    const totalDocuments = await SensorData.countDocuments(query);
    const totalPages = Math.ceil(totalDocuments / limit);

    const sensorData = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      items: sensorData,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({ error: 'Server error while fetching data.' });
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
      ...sensorData[0].soilTemp.map((_, index) => `soilTemp${index + 1}`),
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
        ...entry.soilTemp.reduce((acc, value, index) => {
          acc[`soilTemp${index + 1}`] = value.value;
          acc[`soilTemp${index + 1}_status`] = value.status;
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
