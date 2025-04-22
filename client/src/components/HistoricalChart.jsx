import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { fetchSensorData } from '../services/api';

const MAX_VISIBLE_POINTS = 30;

const HistoricalChart = ({ espId }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: MAX_VISIBLE_POINTS });

  const handleScroll = (direction) => {
    setVisibleRange(prev => {
      if (direction === 'left' && prev.end < historicalData.length) {
        return {
          start: prev.start + MAX_VISIBLE_POINTS,
          end: Math.min(prev.end + MAX_VISIBLE_POINTS, historicalData.length)
        };
      }
      if (direction === 'right' && prev.start > 0) {
        return {
          start: Math.max(0, prev.start - MAX_VISIBLE_POINTS),
          end: prev.start
        };
      }
      return prev;
    });
  };

  const fetchHistoricalData = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSensorData(1, 1000, startDate, endDate, espId);
      if (response.items && Array.isArray(response.items)) {
        // Filter for selected ESP
        const filteredData = response.items.filter(item => item.espId === espId);
        setHistoricalData(filteredData);
      } else {
        setError('No data available for selected period');
      }
    } catch (error) {
      setError('Failed to fetch historical data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatData = useMemo(() => {
    const parseValue = (value) => {
      if (value === 0) return 0; // Keep 0 as a valid value
      if (value === null || value === undefined || Number.isNaN(value)) return null;
      return parseFloat(value);
    };

    const parseSoilMoisture = (value) => {
      if (value === '0%' || value === 0) return 0;
      if (!value || value === 'NaN%' || value === 'null%') return null;
      return parseFloat(value.replace('%', ''));
    };

    return historicalData
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(entry => ({
        timestamp: formatTimestamp(entry.timestamp),
        'Soil Moisture 1': parseSoilMoisture(entry.soilMoisture?.[0]),
        'Soil Moisture 2': parseSoilMoisture(entry.soilMoisture?.[1]),
        ...(entry.espId === 'esp1' ? {
          'Air Temperature': parseValue(entry.dht22?.temp),
          'Air Humidity': parseValue(entry.dht22?.hum),
          'Water Temperature': parseValue(entry.waterTemperature?.value),
          'Air Quality': parseValue(entry.airQuality?.value),
          'Light Level': parseValue(entry.lightIntensity?.value),
          'UV Index': parseValue(entry.uvIndex?.value),
          'EC': parseValue(entry.ec?.value),
          'pH': parseValue(entry.ph?.value)
        } : {})
      }))
      .filter(entry => entry.timestamp); // Remove entries with invalid timestamps
  }, [historicalData, visibleRange]);

  const chartConfigs = {
    moisture: {
      title: 'Historical Soil Moisture',
      dataKeys: ['Soil Moisture 1', 'Soil Moisture 2'],
      colors: ['#3B82F6', '#10B981'],
      yAxisDomain: [0, 100]
    },
    environmental: {
      title: 'Historical Environmental Readings',
      dataKeys: [
        'Air Temperature',
        'Air Humidity',
        'Water Temperature',
        'Air Quality',
        'Light Level',
        'UV Index',
        'EC',
        'pH'
      ],
      colors: [
        '#EF4444', // Air Temperature
        '#8B5CF6', // Air Humidity
        '#F59E0B', // Water Temperature
        '#6366F1', // Air Quality
        '#EC4899', // Light Level
        '#10B981', // UV Index
        '#14B8A6', // EC
        '#6366F1'  // pH
      ],
      yAxisDomain: [0, 400]
    }
  };

  const renderChart = (config) => {
    if (!formatData.length) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">{config.title}</h3>
          <p className="text-sm text-gray-500">
            {startDate?.toLocaleDateString('en-IN')} to {endDate?.toLocaleDateString('en-IN')}
          </p>
        </div>

        {/* Navigation controls */}
        <div className="flex justify-between mb-4">
          <button
            onClick={() => handleScroll('right')}
            disabled={visibleRange.start === 0}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            ← Older Data
          </button>
          <span className="text-sm text-gray-500">
            Showing {Math.min(MAX_VISIBLE_POINTS, formatData.length)} points
          </span>
          <button
            onClick={() => handleScroll('left')}
            disabled={visibleRange.end >= historicalData.length}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Newer Data →
          </button>
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
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
                interval="preserveStart"
                angle={-45}
                textAnchor="end"
                height={60}
                minTickGap={10}
              />
              <YAxis
                domain={config.yAxisDomain}
                tickFormatter={(value) => Math.round(value)}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (value === null) return ['Not Working', name];
                  return [value.toFixed(2), name];
                }}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Legend />
              {config.dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={config.colors[index]}
                  name={key}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
              ))}
            </BarChart>
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
          {/* Soil Moisture Chart */}
          {renderChart(chartConfigs.moisture)}
          
          {/* Environmental Readings Chart */}
          {renderChart(chartConfigs.environmental)}
        </>
      )}
    </div>
  );
};

export default HistoricalChart;