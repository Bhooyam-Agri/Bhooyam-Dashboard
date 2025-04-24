import React, { useEffect, useState } from "react";
import { fetchSensorData } from "../services/api";
import Speedometer from "./Speedometer";
import SensorLineChart from "./SensorLineChart";
import Pagination from "./Pagination";
import Filter from "./Filter";
import DownloadCSV from "./DownloadCSV";
import HiddenSensors from "./HiddenSensors";
import socketService from '../services/socketService';
import HistoricalChart from './HistoricalChart';
import WaterPumpControl from './WaterPumpControl';
import PeristalticPumpControl from './PeristalticPumpControl';
import { Link } from "react-router-dom";
import Navbar from "./navbar";

const espOptions = [
  { value: 'esp1', label: 'ESP1 - Main Control' },
  { value: 'esp2', label: 'ESP2 - Moisture Control' },
  { value: 'esp3', label: 'ESP3 - Light Control' },
  { value: 'esp4', label: 'ESP4 - Temperature Control' },
  { value: 'esp5', label: 'ESP5 - Backup Control' }
];

const Dashboard = () => {
  const [sensorData, setSensorData] = useState([]);
  const [selectedEsp, setSelectedEsp] = useState('esp1');
  const [averageData, setAverageData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hiddenSensors, setHiddenSensors] = useState([]);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    espId: 'esp1'
  });

  // Keep track of latest environmental data from ESP1
  const [environmentalData, setEnvironmentalData] = useState({
    temp: 0,
    hum: 0,
    waterTemp: 0,
    airQuality: 0,
    lightLevel: 0,
    uvIndex: 0,
    ec: 0,
    ph: 0
  });

  useEffect(() => {
    loadInitialData();
    
    const cleanup = socketService.onSensorData((message) => {
      if (message.type === 'update' && message.data) {
        // Update environmental data if message is from ESP1
        if (message.data.espId === 'esp1') {
          setEnvironmentalData({
            temp: message.data.dht22?.temp || 0,
            hum: message.data.dht22?.hum || 0,
            waterTemp: message.data.waterTemperature?.value || 0,
            airQuality: message.data.airQuality?.value || 0,
            lightLevel: message.data.lightIntensity?.value || 0,
            uvIndex: message.data.uvIndex?.value || 0,
            ec: message.data.ec?.value || 0,
            ph: message.data.ph?.value || 0
          });
        }

        setSensorData(prevData => {
          if (message.data.espId !== selectedEsp) return prevData;
          
          const newData = [...prevData];
          newData.unshift(message.data); // Add new data at the beginning
          if (newData.length > 30) {
            newData.pop(); // Remove oldest data point
          }
          
          // Update averages with latest data
          setAverageData(calculateAverages([message.data], selectedEsp));
          
          return newData;
        });
      }
    });

    socketService.connect();

    return () => {
      if (cleanup) cleanup();
      socketService.disconnect();
    };
  }, [selectedEsp]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load data for selected ESP
      const data = await fetchSensorData(1, 30, null, null, selectedEsp);
      
      // Also load ESP1 data if not currently selected
      if (selectedEsp !== 'esp1') {
        const esp1Data = await fetchSensorData(1, 1, null, null, 'esp1');
        if (esp1Data.items && esp1Data.items.length > 0) {
          const latestEsp1Data = esp1Data.items[0];
          setEnvironmentalData({
            temp: latestEsp1Data.dht22?.temp || 0,
            hum: latestEsp1Data.dht22?.hum || 0,
            waterTemp: latestEsp1Data.waterTemperature?.value || 0,
            airQuality: latestEsp1Data.airQuality?.value || 0,
            lightLevel: latestEsp1Data.lightIntensity?.value || 0,
            uvIndex: latestEsp1Data.uvIndex?.value || 0,
            ec: latestEsp1Data.ec?.value || 0,
            ph: latestEsp1Data.ph?.value || 0
          });
        }
      }

      if (data.items && Array.isArray(data.items)) {
        const filteredData = data.items
          .filter(item => item.espId === selectedEsp)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Sort oldest to newest
        setSensorData(filteredData);
        if (filteredData.length > 0) {
          setAverageData(calculateAverages([filteredData[filteredData.length - 1]], selectedEsp));
        }
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError(error.message || "Failed to load data");
    }
    setLoading(false);
  };

  const formatIndianTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const fetchLatestData = async () => {
    if (filters.startDate || filters.endDate) return;
    
    try {
      const data = await fetchSensorData(1, 15);
      if (!data.items || !Array.isArray(data.items)) return;

      setSensorData(prevData => {
        // Get the latest timestamp as string
        const currentLatestTimestamp = prevData[0]?.timestamp || '';

        // Filter new data points using string comparison
        const newData = data.items.filter(item => 
          item.timestamp > currentLatestTimestamp
        );

        if (newData.length === 0) return prevData;

        const updatedData = [...newData, ...prevData].slice(0, 15);
        setAverageData(calculateAverages([newData[0]]));
        
        return updatedData;
      });
    } catch (error) {
      console.error("Error fetching latest data:", error);
    }
  };

  const formatSensorValue = (value, unit = '') => {
    if (value === 0 || value === '0') return `0${unit}`;
    if (value === null || value === undefined || Number.isNaN(value) || value === 'nan' || value === 'NaN') {
      return "Not Working";
    }
    return `${value}${unit}`;
  };

  const calculateAverages = (data, espId) => {
    if (!data || data.length === 0) return {};

    const parseValue = (value) => {
      if (value === 0 || value === '0') return 0;
      if (value === null || value === undefined || Number.isNaN(value) || value === 'nan' || value === 'NaN') return null;
      return parseFloat(value);
    };

    const parseSoilMoisture = (value) => {
      if (value === '0%' || value === 0) return 0;
      if (!value || value === 'NaN%' || value === 'null%' || value === 'nan%') return null;
      return parseFloat(value.replace('%', ''));
    };

    let averages = {
      soilMoisture: {
        0: parseSoilMoisture(data[0]?.soilMoisture?.[0]),
        1: parseSoilMoisture(data[0]?.soilMoisture?.[1])
      }
    };

    // Add ESP1-specific averages
    if (espId === 'esp1') {
      averages = {
        ...averages,
        airTemp: parseValue(data[0]?.dht22?.temp),
        airHumidity: parseValue(data[0]?.dht22?.hum),
        waterTemp: parseValue(data[0]?.waterTemperature?.value),
        airQuality: parseValue(data[0]?.airQuality?.value),
        lightIntensity: parseValue(data[0]?.lightIntensity?.value),
        uvIndex: parseValue(data[0]?.uvIndex?.value),
        ec: parseValue(data[0]?.ec?.value),
        ph: parseValue(data[0]?.ph?.value)
      };
    }

    return averages;
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleFilter = (start, end) => {
    setFilters({ startDate: start, endDate: end });
    setCurrentPage(1);
  };

  const handleTimeRangeChange = (start, end) => {
    setFilters({ startDate: start, endDate: end });
    setCurrentPage(1);
  };

  const handleIntervalChange = (interval) => {
    setTimeInterval(interval);
    setCurrentPage(1);
  };

  // Define maximum values for each sensor type
  const maxValues = {
    soil: 100, // Adjust based on your soil moisture sensor's range
    temperature: 100, // Adjust based on expected maximum temperature
    humidity: 100, // Humidity is always 0-100%
    light: 100, // Adjust based on your light sensor's range
  };

  const handleHideSensor = (sensorId) => {
    setHiddenSensors(prev => [...prev, sensorId]);
  };

  const handleUnhideSensor = (sensorId) => {
    setHiddenSensors(prev => prev.filter(id => id !== sensorId));
  };

  const handleUnhideAll = () => {
    setHiddenSensors([]);
  };

  const handleEspChange = (e) => {
    const newEspId = e.target.value;
    setSelectedEsp(newEspId);
    setFilters(prev => ({
      ...prev,
      espId: newEspId
    }));
  };

  return (
    <div className="flex justify-center items-center flex-col">
    <Navbar/>
       <div className="dashboard container mx-auto p-4">
      <h1 className="text-2xl font-sm mb-8 text-center">Sensor Dashboard</h1>

      {/* ESP Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select ESP Device:
        </label>
        <select
          value={selectedEsp}
          onChange={handleEspChange}
          className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {espOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        <>
          <div className="space-y-8">
            {/* Show water pump control for all ESPs */}
            <div className="mb-8">
              <WaterPumpControl espId={selectedEsp} />
            </div>

            {/* Show peristaltic pump control only for ESP1 */}
            {selectedEsp === 'esp1' && (
              <div className="mb-8">
                <PeristalticPumpControl />
              </div>
            )}

            {/* Real-time data section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Real-time Monitoring - {selectedEsp.toUpperCase()}</h2>
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
                <Filter onFilter={handleFilter} />
                <DownloadCSV filters={{ ...filters, espId: selectedEsp }} />
              </div>

              {loading ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <p className="text-blue-500">Loading data...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Values Display */}
                  <div className="space-y-6">
                    {/* Soil Moisture Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Soil Moisture Readings</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="text-sm font-medium text-gray-500">Soil Moisture 1</h4>
                          <p className="text-2xl font-bold">{formatSensorValue(averageData.soilMoisture[0], '%')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="text-sm font-medium text-gray-500">Soil Moisture 2</h4>
                          <p className="text-2xl font-bold">{formatSensorValue(averageData.soilMoisture[1], '%')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Environmental Readings Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Environmental Readings</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="text-sm font-medium text-gray-500">Air Temperature</h4>
                          <p className="text-2xl font-bold">{formatSensorValue(environmentalData.temp, '°C')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="text-sm font-medium text-gray-500">Air Humidity</h4>
                          <p className="text-2xl font-bold">{formatSensorValue(environmentalData.hum, '%')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="text-sm font-medium text-gray-500">Water Temperature</h4>
                          <p className="text-2xl font-bold">{formatSensorValue(environmentalData.waterTemp, '°C')}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="text-sm font-medium text-gray-500">Air Quality</h4>
                          <p className="text-2xl font-bold">{formatSensorValue(environmentalData.airQuality)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="text-sm font-medium text-gray-500">Light Level</h4>
                          <p className="text-2xl font-bold">{formatSensorValue(environmentalData.lightLevel)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="text-sm font-medium text-gray-500">UV Index</h4>
                          <p className="text-2xl font-bold">{formatSensorValue(averageData.uvIndex)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="text-sm font-medium text-gray-500">EC</h4>
                          <p className="text-2xl font-bold">{formatSensorValue(averageData.ec)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <h4 className="text-sm font-medium text-gray-500">pH</h4>
                          <p className="text-2xl font-bold">{formatSensorValue(averageData.ph)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <SensorLineChart 
                    data={sensorData} 
                    espId={selectedEsp}
                    environmentalData={environmentalData} 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Historical data section */}
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold mb-4">Historical Data Analysis - {selectedEsp.toUpperCase()}</h2>
            <HistoricalChart espId={selectedEsp} />
          </div>
        </>
      )}
    </div>
    </div>
   
  );
};

export default Dashboard;
