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
import { use } from "react";
import Plantsaver from "./NaniSaver";

const espOptions = [
  { value: 'esp1', label: '' },
 
];

const Dashboard = () => {
  const [sensorData, setSensorData] = useState([]);
  const [selectedEsp, setSelectedEsp] = useState('esp1');
  const [averageData, setAverageData] = useState({});
  const [N, setN] = useState(0.00);
  const [P, setP] = useState(0.00);
  const [K, setK] = useState(0.00);
  const [fine, setFine] = useState(0.00);
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

  // Simulate realistic Jalandhar values after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      // Helper function to keep values within range
      const getRandomInRange = (base, variation, min, max) => {
      const value = base + (Math.random() * 2 - 1) * variation;
      return Math.min(max, Math.max(min, Number(value.toFixed(1))));
      };
      
      // Realistic values for Jalandhar with controlled random variations
      setEnvironmentalData({
      temp: getRandomInRange(32, 1.5, 28, 36),         // 28-36°C
      hum: getRandomInRange(65, 5, 55, 80),            // 55-80%
      waterTemp: getRandomInRange(26, 1, 24, 28),      // 24-28°C
      airQuality: Math.floor(getRandomInRange(180, 20, 140, 220)), // 140-220
      lightLevel: Math.floor(getRandomInRange(850, 50, 750, 950)), // 750-950 (bright daylight)
      uvIndex: getRandomInRange(9, 0.5, 7, 11),        // 7-11 (high to extreme)
      ec: getRandomInRange(1.2, 0.2, 0.8, 1.6),        // 0.8-1.6 mS/cm
      ph: getRandomInRange(7.2, 0.3, 6.5, 7.8)         // 6.5-7.8 pH
      });
      console.log("Updated to realistic Jalandhar environmental values");
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

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
  const handleNPKChange = (newFine, newN, newP, newK) => {
    setFine(parseFloat(newFine));
    setN(parseFloat(newN));
    setP(parseFloat(newP));
    setK(parseFloat(newK));
  }
  async function downloadImage() {
    const response = await fetch('/n64.png'); // Fetch the image from the server
    const blob = await response.blob(); // Get image as blob
    const url = URL.createObjectURL(blob);
  
    // Create a temporary <a> element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = '/p64.png'; // Set the filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  
    // Cleanup the object URL
    URL.revokeObjectURL(url);
  }
  
  // Call the function
  downloadImage();
const fetchNPK = async () => {
    try {
      const captureUrl = '/p64.png'; // Capture endpoint
      const imageUrl = '/p64.png';
      
      // First hit the capture endpoint
      const isCaptured = await fetch(captureUrl);
      if (!isCaptured.ok) {
          throw new Error('Failed to capture image: ' + isCaptured.statusText);
      }
      
      // const response = await fetch(imageUrl);
    

      // Fetch the image from the server
      const response = await fetch('/p64.png');
      if (!response.ok) {
        throw new Error('Failed to fetch image: ' + response.statusText);
      }

      const blob = await response.blob();

      // Create a File object from the Blob
      const file = new File([blob], 'img.jpg', { type: blob.type || 'image/jpeg' });

      // Create a FormData object and append the file
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch("http://127.0.0.1:5000/predict", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        console.log("Prediction response:", data);

        handleNPKChange(data.Fine, data.N, data.P, data.K);
      } catch (error) {
        console.error("Error fetching NPK readings:", error);
      }
    } catch (error) {
      console.error("Error in NPK capture process:", error);
    }
  };
  
  // Add tab state
  const [activeTab, setActiveTab] = useState('realtime');
  const [waterPumpActive, setWaterPumpActive] = useState(false);
  const [autoWatering, setAutoWatering] = useState(true);

  // Function to get status color based on sensor value
  const getStatusColor = (value, type) => {
    if (value === null || value === undefined) return "text-gray-400";
    
    if (type === 'moisture') {
      if (value < 20) return "text-red-600";
      if (value < 40) return "text-yellow-600";
      return "text-green-600";
    }
    
    return "text-green-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Top navigation bar */}
      <div className="flex justify-center items-center w-1/2.5 py-4"><Navbar/></div>
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header area */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-green-800 flex items-center">
            <svg className="mr-2 h-7 w-7 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Intelligent Hydrophonics System
          </h1>
          
          <div className="mt-4 md:mt-0 w-full md:w-auto">
            <div className="relative inline-block w-full md:w-64">
              <select
                value={selectedEsp}
                onChange={handleEspChange}
                className="w-full pl-4 pr-10 py-2.5 text-green-800 bg-white border-2 border-green-200 rounded-lg 
                           shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
              >
                {espOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main tabs */}
        <div className="mb-6 border-b border-green-200">
          
          <div className="flex space-x-6">
            <button 
              onClick={() => setActiveTab('realtime')}
              className={`pb-3 px-1 font-medium ${activeTab === 'realtime' ? 
                'text-green-600 border-b-2 border-green-500' : 'text-green-400 hover:text-green-600'}`}
            >
              Real-time Monitoring
            </button>
            <button 
              onClick={() => setActiveTab('controls')}
              className={`pb-3 px-1 font-medium ${activeTab === 'controls' ? 
                'text-green-600 border-b-2 border-green-500' : 'text-green-400 hover:text-green-600'}`}
            >
              System Controls
            </button>
            <button 
              onClick={() => setActiveTab('historical')}
              className={`pb-3 px-1 font-medium ${activeTab === 'historical' ? 
                'text-green-600 border-b-2 border-green-500' : 'text-green-400 hover:text-green-600'}`}
            >
              Historical Data
            </button>
          </div>
        </div>
        
        {/* Alert notification
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md flex items-start">
          <svg className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-yellow-700">Low soil moisture detected in Sensor 1</p>
            <p className="text-sm text-yellow-600 mt-1">Consider activating water pump or adjusting watering schedule.</p>
          </div>
        </div> */}
        
        <div><Plantsaver/></div>
        
        {activeTab === 'realtime' && (
          <div className="space-y-8">
          {/* Status overview cards */}
        
          <div className="flex gap-4"><div className="w-64 h-64 flex-col  border-4 border-green-500 rounded-xl overflow-hidden flex justify-center items-center shadow-lg">

          <h1 className="relative top-2 text-white ">Live Feed</h1>
          <img
            src="/p64.png"
            alt="Live Cam Input"
            className="object-cover w-full h-full"
            id="video-feed"
          />

          </div>  <div className="flex top-2 right-2 w-full bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-sm shadow-md">

            <span className="text-green-600 px-2">AI Recommendations</span> 
            <div className="p-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-green-50 rounded-lg p-3">
                  <span className="text-xs text-green-600 font-semibold">Nitrogen (N)</span>
                  <div className="text-xl font-bold text-green-800">{N.toFixed(8) || '0'}</div>
                  <div className="mt-1 text-xs text-green-700">
                  {N < 40 ? "Low: Consider nitrogen-rich fertilizer" : 
                   N > 80 ? "High: Reduce nitrogen application" : 
                   "Optimal level"}
                  </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                  <span className="text-xs text-green-600 font-semibold">Phosphorus (P)</span>
                  <div className="text-xl font-bold text-green-800">{P.toFixed(8) || '0'}</div>
                  <div className="mt-1 text-xs text-green-700">
                  {P < 40 ? "Low: Add phosphate fertilizer" : 
                   P > 80 ? "High: Reduce phosphorus" : 
                   "Optimal level"}
                  </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                  <span className="text-xs text-green-600 font-semibold">Potassium (K)</span>
                  <div className="text-xl font-bold text-green-800">{K.toFixed(8) || '0'}</div>
                  <div className="mt-1 text-xs text-green-700">
                  {K < 40 ? "Low: Add potash supplement" : 
                   K > 80 ? "High: Reduce potassium" : 
                   "Optimal level"}
                  </div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-700">
                  <p className="font-medium mb-2">Suggested Actions:</p>
                  <ul className="list-disc pl-5 space-y-1">
                  {N < 0.40 && <li>Apply nitrogen-rich fertilizer within next 3 days</li>}
                  {P < 0.40 && <li>Increase phosphorus levels for better root development</li>}
                  {K < 0.40 && <li>Add potassium to improve plant resistance</li>}
                  {(N > 0.80 || P > 0.80 || K > 0.80) && <li>Consider flushing soil to reduce nutrient concentration</li>}
                  {(N >= 0.40 && N <= 0.80 && P >= 0.40 && P <= 0.80 && K >= 0.40 && K <= 0.80) && 
                  <li>Nutrient levels are optimal - maintain current feeding schedule</li>}
                  </ul>
                </div>
                <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                  <p className="font-medium text-green-800 mb-2">AI Plant Recommendations:</p>
                  <div id="dolphin-recommendations" className="text-sm">
                    {N < 0.40 ? "Apply organic compost for natural nitrogen boost." : ""}
                    {P < 0.40 ? "Use bone meal to increase phosphorus levels." : ""}
                    {K < 0.40 ? "Add wood ash to soil to improve potassium content." : ""}
                    {(N >= 0.40 && P >= 0.40 && K >= 0.40) ? "Maintain current nutrient levels with balanced fertilizer." : ""}
                  </div>
                </div>
                <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200">
                  Get Detailed Report
                </button>
                <button onClick={async () => {
                  fetchNPK();
                  try {
                    const prompt = `Based on soil nutrient levels of Nitrogen: ${N.toFixed(2)}, Phosphorus: ${P.toFixed(2)}, Potassium: ${K.toFixed(2)}, provide 4 concise recommendations for plant care. Keep each recommendation to one short sentence.`;
                    const response = await fetch("http://localhost:11434/api/generate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        model: "dolphin3:latest",
                        prompt: prompt,
                        stream: false
                      }),
                    });
                    const data = await response.json();
                    document.getElementById('dolphin-recommendations').innerText = data.response || "Unable to get recommendations at this time.";
                  } catch (error) {
                    console.error("Error fetching Dolphin recommendations:", error);
                  }
                }} className="mt-4 ml-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200">
                  Get AI Recommendations
                </button>
                </div>
                 
            </div>
            </div>  

            {/* Detailed sensor readings */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">Detailed Sensor Readings</h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Soil Moisture */}
                  <div className="bg-green-50 p-5 hidden rounded-lg">
                    <h4 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                      <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      Soil Moisture
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h5 className="text-sm text-green-600 mb-1">Sensor 1</h5>
                        <p className={`text-2xl font-bold ${getStatusColor(averageData.soilMoisture?.[0], 'moisture')}`}>
                    OFF      {/* {formatSensorValue(averageData.soilMoisture?.[0], '%')} */}
                        </p>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, averageData.soilMoisture?.[0] || 0)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h5 className="text-sm text-green-600 mb-1">Sensor 2</h5>
                        <p className={`text-2xl font-bold ${getStatusColor(averageData.soilMoisture?.[1], 'moisture')}`}>
                          {formatSensorValue(averageData.soilMoisture?.[1], '%')}
                        </p>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, averageData.soilMoisture?.[1] || 0)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 py-8 lg:grid-cols-3 gap-6">
         

         <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
         <div className="px-4 py-5 sm:p-6">
           <div className="flex items-center">
           <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
             <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10.5h14m-7-7v14" />
             </svg>
           </div>
           <div className="ml-5 w-0 flex-1">
             <dl>
             <dt className="text-sm font-medium text-gray-500 truncate">
               Air Temperature
             </dt>
             <dd className="flex items-baseline">
               <div className="text-2xl font-semibold text-gray-900">
            OFF   {/* {formatSensorValue(environmentalData.temp, '°C')} */}
               </div>
             </dd>
             </dl>
           </div>
           </div>
         </div>
         <div className="bg-gray-50 px-4 py-4 sm:px-6">
           <div className="text-sm">
           <a href="#" className="font-medium text-green-600 hover:text-green-500">
             View details →
           </a>
           </div>
         </div>
         </div>

         <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
         <div className="px-4 py-5 sm:p-6">
           <div className="flex items-center">
           <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
             <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
             </svg>
           </div>
           <div className="ml-5 w-0 flex-1">
             <dl>
             <dt className="text-sm font-medium text-gray-500 truncate">
               Air Humidity
             </dt>
             <dd className="flex items-baseline">
               <div className="text-2xl font-semibold text-gray-900">
             OFF  {/* {formatSensorValue(environmentalData.hum, '%')} */}
               </div>
             </dd>
             </dl>
           </div>
           </div>
         </div>
         <div className="bg-gray-50 px-4 py-4 sm:px-6">
           <div className="text-sm">
           <a href="#" className="font-medium text-green-600 hover:text-green-500">
             View details →
           </a>
           </div>
         </div>
         </div>

         <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
         <div className="px-4 py-5 sm:p-6">
           <div className="flex items-center">
           <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
             <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
             </svg>
           </div>
           <div className="ml-5 w-0 flex-1">
             <dl>
             <dt className="text-sm font-medium text-gray-500 truncate">
               Light Level
             </dt>
             <dd className="flex items-baseline">
               <div className="text-2xl font-semibold text-gray-900">
              OFF {/* {formatSensorValue(environmentalData.lightLevel)} */}
               </div>
             </dd>
             </dl>
           </div>
           </div>
         </div>
         <div className="bg-gray-50 px-4 py-4 sm:px-6">
           <div className="text-sm">
           <a href="#" className="font-medium text-green-600 hover:text-green-500">
             View details →
           </a>
           </div>
         </div>
         </div>
       </div>
                  {/* Environmental Readings */}
                  <div className="bg-green-50 p-5 rounded-lg">
                    <h4 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                      <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Environmental
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <h5 className="text-xs text-green-500">Air Quality</h5>
                        <p className="text-lg font-bold">
                          OFF
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <h5 className="text-xs text-green-500">Water Temp</h5>
                        <p className="text-lg font-bold">
                          {/* {formatSensorValue(environmentalData.waterTemp, '°C')} */}
                       OFF </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <h5 className="text-xs text-green-500">pH Level</h5>
                        <p className="text-lg font-bold">
                          {"OFF"}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <h5 className="text-xs text-green-500">NPK Value</h5>
                        <p className="text-lg font-bold">
                          {"OFF"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chart area */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Sensor Data Trends</h3>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200">
                    Last 24h
                  </button>
                  <button className="px-3 py-1 text-sm bg-white text-green-700 rounded-md hover:bg-green-100">
                    Last Week
                  </button>
                  <button className="px-3 py-1 text-sm bg-white text-green-700 rounded-md hover:bg-green-100">
                    Last Month
                  </button>
                </div>
              </div>
              
              <SensorLineChart
                data={sensorData}
                espId={selectedEsp}
                environmentalData={environmentalData}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'controls' && (
          <div className="space-y-8">
            {/* Water pump control */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">Water Pump Control</h3>
              </div>
              
              <div className="p-6">
                <WaterPumpControl espId={selectedEsp} />
                
                {selectedEsp === 'esp1' && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-4">Peristaltic Pump Control</h4>
                    <PeristalticPumpControl />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'historical' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900">Historical Data Analysis</h3>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div className="mb-4 md:mb-0">
                  <h4 className="font-medium text-gray-900">Data Explorer</h4>
                  <p className="text-sm text-gray-500">Analyze trends and patterns over time</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <DownloadCSV filters={{ ...filters, espId: selectedEsp }} />
                  <button className="px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50">
                    Generate Report
                  </button>
                </div>
              </div>
              
              <HistoricalChart espId={selectedEsp} />
            </div>
          </div>
        )}
      </div>
    </div>
  ); 
};

export default Dashboard;
