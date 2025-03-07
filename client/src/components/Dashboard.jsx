import React, { useEffect, useState } from "react";
import { fetchSensorData } from "../services/api";
import Speedometer from "./Speedometer";
import SensorLineChart from "./SensorLineChart";
import Pagination from "./Pagination";
import Filter from "./Filter";
import DownloadCSV from "./DownloadCSV";
import HiddenSensors from "./HiddenSensors";
import RelayControl from "./RelayControl";
import TimeRangeSelector from './TimeRangeSelector';
import CombinedLineChart from './CombinedLineChart';
import socketService from '../services/socketService';

const Dashboard = () => {
  const [sensorData, setSensorData] = useState([]);
  const [averageData, setAverageData] = useState({
    soilMoisture: { 0: null, 1: null },
    airTemp: null,
    airHumidity: null,
    waterTemp: null,
    airQuality: null,
    lightIntensity: null
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [dataPerPage] = useState(15);
  const [filters, setFilters] = useState({ startDate: null, endDate: null });
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hiddenSensors, setHiddenSensors] = useState([]);
  const [timeInterval, setTimeInterval] = useState(60);

  useEffect(() => {
    loadInitialData();
    
    // Set up WebSocket connection for real-time updates
    const unsubscribe = socketService.onSensorData((data) => {
      if (data.type === 'update') {
        setSensorData(prevData => {
          const newReading = data.data;
          
          // Don't update if date filter is active
          if (filters.startDate || filters.endDate) return prevData;
          
          // Update averages with new reading
          setAverageData(calculateAverages([newReading]));
          
          // Add new reading to the start and maintain last 15 readings
          return [newReading, ...prevData].slice(0, 15);
        });
      }
    });

    // Connect to WebSocket
    socketService.connect();

    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, [filters]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const startDate = filters.startDate?.toISOString();
      const endDate = filters.endDate?.toISOString();
      const data = await fetchSensorData(1, 15, startDate, endDate);
      if (data.items && Array.isArray(data.items)) {
        setSensorData(data.items);
        if (data.items.length > 0) {
          setAverageData(calculateAverages([data.items[0]]));
        }
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError(error.message || "Failed to load data");
    }
    setLoading(false);
  };

  const fetchLatestData = async () => {
    if (filters.startDate || filters.endDate) return; // Don't update if date filter is active
    
    try {
      const data = await fetchSensorData(1, 15);
      if (!data.items || !Array.isArray(data.items)) return;

      setSensorData(prevData => {
        // Get the latest timestamp from current data
        const currentLatestTimestamp = prevData[0]?.timestamp 
          ? new Date(prevData[0].timestamp).getTime()
          : 0;

        // Filter new data points
        const newData = data.items.filter(item => 
          new Date(item.timestamp).getTime() > currentLatestTimestamp
        );

        if (newData.length === 0) return prevData;

        // Combine new and existing data, keeping only latest 15 points
        const updatedData = [...newData, ...prevData].slice(0, 15);
        
        // Update averages with latest reading
        setAverageData(calculateAverages([newData[0]]));
        
        return updatedData;
      });
    } catch (error) {
      console.error("Error fetching latest data:", error);
    }
  };

  const calculateAverages = (data) => {
    if (data.length === 0) {
      return {
        soilMoisture: { 0: null, 1: null },
        airTemp: null,
        airHumidity: null,
        waterTemp: null,
        airQuality: null,
        lightIntensity: null
      };
    }

    const latestReading = data[0];
    console.log('Processing latest reading:', latestReading);

    // Parse soil moisture values, removing '%' if present
    const soilMoisture0 = latestReading.soilMoisture?.[0] ? parseFloat(latestReading.soilMoisture[0].replace('%', '')) : null;
    const soilMoisture1 = latestReading.soilMoisture?.[1] ? parseFloat(latestReading.soilMoisture[1].replace('%', '')) : null;

    return {
      soilMoisture: {
        0: soilMoisture0,
        1: soilMoisture1
      },
      airTemp: latestReading.dht22?.temp || null,
      airHumidity: latestReading.dht22?.hum || null,
      waterTemp: latestReading.waterTemperature?.value || null,
      airQuality: latestReading.airQuality?.value || null,
      lightIntensity: latestReading.lightIntensity?.value || null
    };
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

  return (
    <div className="dashboard container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8 text-center">Sensor Dashboard</h1>

      {/* Add TimeRangeSelector before other components */}
      <div className="mb-8">
        <TimeRangeSelector 
          onRangeChange={handleTimeRangeChange}
          onIntervalChange={handleIntervalChange}
        />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
        <Filter onFilter={handleFilter} />
        <DownloadCSV filters={filters} />
      </div>

      {error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        <>
          <div className="mb-8">
            <RelayControl />
          </div>

          {loading && sensorData.length === 0 ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <p className="text-blue-500">Loading data...</p>
            </div>
          ) : (
            <>
              <HiddenSensors 
                hiddenSensors={hiddenSensors}
                onUnhide={handleUnhideSensor}
                onUnhideAll={handleUnhideAll}
              />

              {/* Combined chart now uses the same data as individual charts */}
              <div className="mb-12">
                <CombinedLineChart 
                  data={sensorData}
                  timeInterval={timeInterval}
                />
              </div>

              <div className="speedometers mb-12">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-center">Current Readings</h2>
                  {hiddenSensors.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {hiddenSensors.length} sensor{hiddenSensors.length !== 1 ? 's' : ''} hidden
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Soil Moisture Sensors */}
                  {[0, 1].map((index) => (
                    !hiddenSensors.includes(`soil-${index + 1}`) && (
                      <Speedometer
                        key={`soil-${index + 1}`}
                        id={`soil-${index + 1}`}
                        label={`Soil Moisture ${index + 1}`}
                        value={averageData.soilMoisture[index] || "Not working"}
                        max={100}  // Raw ADC value max
                        unit="%"
                        onHide={handleHideSensor}
                      />
                    )
                  ))}

                  {/* DHT22 Temperature */}
                  {!hiddenSensors.includes('air-temp') && (
                    <Speedometer
                      key="air-temp"
                      id="air-temp"
                      label="Air Temperature"
                      value={averageData.airTemp || "Not working"}
                      max={100}
                      unit="°C"
                      onHide={handleHideSensor}
                    />
                  )}

                  {/* DHT22 Humidity */}
                  {!hiddenSensors.includes('air-humidity') && (
                    <Speedometer
                      key="air-humidity"
                      id="air-humidity"
                      label="Air Humidity"
                      value={averageData.airHumidity || "Not working"}
                      max={100}
                      unit="%"
                      onHide={handleHideSensor}
                    />
                  )}

                  {/* Water Temperature */}
                  {!hiddenSensors.includes('water-temp') && (
                    <Speedometer
                      key="water-temp"
                      id="water-temp"
                      label="Water Temperature"
                      value={averageData.waterTemp || "Not working"}
                      max={100}
                      unit="°C"
                      onHide={handleHideSensor}
                    />
                  )}

                  {/* Air Quality */}
                  {!hiddenSensors.includes('air-quality') && (
                    <Speedometer
                      key="air-quality"
                      id="air-quality"
                      label="Air Quality"
                      value={averageData.airQuality || "Not working"}
                      max={400}  // Raw ADC value max
                      unit="ppm"
                      onHide={handleHideSensor}
                    />
                  )}

                  {/* Light Intensity */}
                  {!hiddenSensors.includes('light') && (
                    <Speedometer
                      key="light"
                      id="light"
                      label="Light Intensity"
                      value={averageData.lightIntensity || "Not working"}
                      max={400}  // Raw ADC value max
                      unit=""
                      onHide={handleHideSensor}
                    />
                  )}
                </div>
              </div>

              <div className="charts mb-12">
                <h2 className="text-2xl font-semibold mb-6 text-center">Individual Sensor Charts</h2>
                <div className="max-w-7xl mx-auto">
                  <SensorLineChart data={sensorData} />
                </div>
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
