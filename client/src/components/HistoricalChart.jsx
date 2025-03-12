import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { fetchSensorData } from '../services/api';

const HistoricalChart = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistoricalData = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSensorData(1, 1000, startDate.toISOString(), endDate.toISOString());
      if (response.items && Array.isArray(response.items)) {
        setHistoricalData(response.items);
      }
    } catch (err) {
      setError("Failed to fetch historical data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatData = useMemo(() => {
    return historicalData.map(entry => ({
      // Use raw timestamp directly
      timestamp: entry.timestamp,
      'Soil Moisture 1': entry.soilMoisture?.[0]?.replace('%', '') || null,
      'Soil Moisture 2': entry.soilMoisture?.[1]?.replace('%', '') || null,
      'Air Temp': entry.dht22?.temp || null,
      'Air Humidity': entry.dht22?.hum || null,
      'Water Temp': entry.waterTemperature?.value || null,
      'Air Quality': entry.airQuality?.value || null,
      'Light Level': entry.lightIntensity?.value || null
    }));
  }, [historicalData]);

  const chartConfigs = {
    moisture: {
      title: 'Historical Moisture & Humidity',
      dataKeys: ['Soil Moisture 1', 'Soil Moisture 2', 'Air Humidity'],
      colors: ['#3B82F6', '#10B981', '#8B5CF6'],
      yAxisDomain: [0, 100]
    },
    temperatures: {
      title: 'Historical Temperature',
      dataKeys: ['Air Temp', 'Water Temp'],
      colors: ['#EF4444', '#F59E0B'],
      yAxisDomain: [0, 50]
    },
    environmental: {
      title: 'Historical Environmental Conditions',
      dataKeys: ['Air Quality', 'Light Level'],
      colors: ['#6366F1', '#F59E0B'],
      yAxisDomain: [0, 400]
    }
  };

  const renderChart = (config) => {
    if (!formatData.length) return null;

    const calculateTickInterval = () => {
      const dataLength = formatData.length;
      // Show more ticks for smaller datasets, fewer for larger ones
      if (dataLength <= 10) return 0; // Show all ticks
      if (dataLength <= 20) return 1; // Show every other tick
      if (dataLength <= 40) return 2; // Show every third tick
      return Math.floor(dataLength / 10); // Show ~10 ticks for large datasets
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">{config.title}</h3>
          <p className="text-sm text-gray-500">
            {startDate?.toLocaleDateString('en-IN')} to {endDate?.toLocaleDateString('en-IN')}
          </p>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={formatData}
              margin={{ top: 20, right: 40, left: 20, bottom: 90 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="timestamp"
                tick={{ 
                  fontSize: 11,
                  fill: '#4B5563',
                }}
                interval={calculateTickInterval()}
                angle={-45}
                textAnchor="end"
                height={100}
                tickMargin={30}
                minTickGap={20}
                scale="band"
                padding={{ left: 30, right: 30 }}
              />
              <YAxis
                domain={config.yAxisDomain}
                tickFormatter={(value) => Math.round(value)}
              />
              <Tooltip 
                formatter={(value) => value ? value.toFixed(2) : 'No data'}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Legend />
              {config.dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={config.colors[index]}
                  dot={{ r: 1 }}
                  activeDot={{ r: 5 }}
                  name={key}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8">
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-4">Historical Data View</h2>
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <DatePicker
              selected={startDate}
              onChange={setStartDate}
              showTimeSelect
              dateFormat="yyyy-MM-dd HH:mm"
              className="border rounded p-2"
              placeholderText="Select start date"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <DatePicker
              selected={endDate}
              onChange={setEndDate}
              showTimeSelect
              dateFormat="yyyy-MM-dd HH:mm"
              className="border rounded p-2"
              placeholderText="Select end date"
              minDate={startDate}
            />
          </div>
          <button
            onClick={fetchHistoricalData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'View Data'}
          </button>
        </div>
        {error && (
          <div className="text-red-500 mb-4">{error}</div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading historical data...</div>
      ) : (
        <>
          {renderChart(chartConfigs.moisture)}
          {renderChart(chartConfigs.temperatures)}
          {renderChart(chartConfigs.environmental)}
        </>
      )}
    </div>
  );
};

export default HistoricalChart;