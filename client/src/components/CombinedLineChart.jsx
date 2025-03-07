import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CombinedLineChart = ({ data, timeInterval }) => {
  const memoizedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort by timestamp ascending
    const sortedData = [...data]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return sortedData.map(entry => {
      const parseValue = (value) => {
        if (value === 0 || value === '0') return 0;
        if (value === null || value === undefined || isNaN(value)) return 0;
        return Number(value);
      };

      const parsePercentage = (value) => {
        if (!value) return 0;
        const numValue = parseFloat(value.replace('%', ''));
        return isNaN(numValue) ? 0 : numValue;
      };

      return {
        timestamp: new Date(entry.timestamp).toLocaleString(),
        'Soil Moisture 1': parsePercentage(entry.soilMoisture?.[0]),
        'Soil Moisture 2': parsePercentage(entry.soilMoisture?.[1]),
        'Air Temperature': parseValue(entry.dht22?.temp),
        'Air Humidity': parseValue(entry.dht22?.hum),
        'Water Temperature': parseValue(entry.waterTemperature?.value),
        'Air Quality': parseValue(entry.airQuality?.value),
        'Light Level': parseValue(entry.lightIntensity?.value)
      };
    });
  }, [data]); // Only recompute when data changes

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
      <p className="text-sm text-gray-500 mb-4">Time interval: {timeInterval} minutes</p>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={memoizedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp"
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              yAxisId="left"
              orientation="left"
              domain={['auto', 'auto']}
              label={{ value: 'Temperature (°C) / Humidity (%)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={['auto', 'auto']}
              label={{ value: 'Air Quality (ppm) / Light', angle: 90, position: 'insideRight' }}
            />
            <Tooltip 
              formatter={(value, name) => {
                const config = sensorConfigs.find(c => c.key === name);
                return [`${value.toFixed(2)}${config?.unit || ''}`, name];
              }}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend />
            {sensorConfigs.map(({ key, color }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                yAxisId={key.includes('Air Quality') || key.includes('Light Level') ? 'right' : 'left'}
                connectNulls={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CombinedLineChart;