import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { parseValue, parseSoilMoisture } from '../services/api';

const MAX_VISIBLE_POINTS = 30;

const CombinedLineChart = ({ data, timeInterval }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: MAX_VISIBLE_POINTS });

  const handleScroll = (direction) => {
    setVisibleRange(prev => {
      if (direction === 'left' && prev.end < data.length) {
        return {
          start: prev.start + MAX_VISIBLE_POINTS,
          end: Math.min(prev.end + MAX_VISIBLE_POINTS, data.length)
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

  // Format timestamp consistently
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

  const memoizedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort and format data to show oldest first
    return [...data]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(entry => ({
        timestamp: formatTimestamp(entry.timestamp),
        'Soil Moisture 1': parseSoilMoisture(entry.soilMoisture?.[0]),
        'Soil Moisture 2': parseSoilMoisture(entry.soilMoisture?.[1]),
        'Air Temperature': parseValue(entry.dht22?.temp),
        'Air Humidity': parseValue(entry.dht22?.hum),
        'Water Temperature': parseValue(entry.waterTemperature?.value),
        'Air Quality': parseValue(entry.airQuality?.value),
        'Light Level': parseValue(entry.lightIntensity?.value)
      }))
      .filter(entry => entry.timestamp); // Remove entries with invalid timestamps

  }, [data]);

  const sensorConfigs = [
    { key: 'Soil Moisture 1', color: '#3B82F6', unit: '%' },
    { key: 'Soil Moisture 2', color: '#10B981', unit: '%' },
    { key: 'Air Temperature', color: '#EF4444', unit: '°C' },
    { key: 'Water Temperature', color: '#F59E0B', unit: '°C' },
    { key: 'Air Humidity', color: '#8B5CF6', unit: '%' },
    { key: 'Air Quality', color: '#6366F1', unit: 'ppm' },
    { key: 'Light Level', color: '#EC4899', unit: '' }
  ];

  if (!memoizedData.length) {
    return <div className="text-center p-4">No data available</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Combined Sensor Readings</h3>
      
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
          Showing {Math.min(MAX_VISIBLE_POINTS, memoizedData.length)} points
        </span>
        <button
          onClick={() => handleScroll('left')}
          disabled={visibleRange.end >= data.length}
          className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Newer Data →
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">Time interval: {timeInterval} minutes</p>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={memoizedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp"
              tick={{ fontSize: 10 }}
              interval="preserveStart"
              angle={-45}
              textAnchor="end"
              height={60}
              minTickGap={10}
            />
            <YAxis 
              yAxisId="left"
              orientation="left"
              domain={[0, 'auto']}
              label={{ value: 'Temperature (°C) / Humidity (%)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={[0, 'auto']}
              label={{ value: 'Air Quality (ppm) / Light', angle: 90, position: 'insideRight' }}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (value === null) return ['Not Working', name];
                const config = sensorConfigs.find(c => c.key === name);
                return [`${value.toFixed(2)}${config?.unit || ''}`, name];
              }}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend />
            {sensorConfigs.map(({ key, color }) => (
              <Bar
                key={key}
                dataKey={key}
                fill={color}
                yAxisId={key.includes('Air Quality') || key.includes('Light Level') ? 'right' : 'left'}
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

export default CombinedLineChart;