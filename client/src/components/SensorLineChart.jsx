import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SensorLineChart = ({ data }) => {
  const [showHistoric, setShowHistoric] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [formatData, setFormatData] = useState([]);

  // Memoize the formatted data based on `data`
  const memoizedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map(entry => {
      console.log('Processing entry:', entry);
      return {
        timestamp: new Date(entry.timestamp).toLocaleString(),
        'Soil Moisture 1': entry.soilMoisture?.[0] || entry.soilSensors?.[0] || "Not working",
        'Soil Moisture 2': entry.soilMoisture?.[1] || entry.soilSensors?.[1] || "Not working",
        'Air Temp': entry.dht22?.temp || (entry.dhtSensors?.[0]?.temp) || "Not working",
        'Air Humidity': entry.dht22?.hum || (entry.dhtSensors?.[0]?.hum) || "Not working",
        'Soil Temperature': entry.soilTemp?.value || entry.soilTempSensor?.temperature || "Not working",
        'Air Quality': entry.airQuality?.value || entry.airQualitySensor?.ppm || "Not working",
        'Light Level': entry.lightIntensity?.value || entry.lightSensor?.value || "Not working"
      };
    });
  }, [data]);

  // Update local state when memoized data changes
  useEffect(() => {
    console.log('Formatted data:', memoizedData);
    setFormatData(memoizedData);
  }, [memoizedData]);

  const chartConfigs = {
    moisture: {
      title: 'Moisture & Humidity Readings',
      dataKeys: ['Soil Moisture 1', 'Soil Moisture 2', 'Air Humidity'],
      colors: ['#3B82F6', '#10B981', '#8B5CF6'],
      yAxisDomain: [0, 100]  // 0-100 for moisture and humidity
    },
    temperatures: {
      title: 'Temperature Readings',
      dataKeys: ['Air Temp', 'Soil Temperature'],
      colors: ['#EF4444', '#F59E0B'],
      yAxisDomain: [0, 50]   // 0-50 for temperature
    },
    environmental: {
      title: 'Environmental Conditions',
      dataKeys: ['Light Level', 'Air Quality'],
      colors: ['#6366F1', '#14B8A6'],
      yAxisDomain: ['auto', 'auto']  // Auto scale for air quality
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value === 0 ? "Not working" : entry.value}${entry.value === 0 ? "" : getUnit(entry.name)}`}
          </p>
        ))}
      </div>
    );
  };

  const getUnit = (name) => {
    if (name.includes('Temp')) return '°C';
    if (name.includes('Humidity') || name.includes('Moisture') || name.includes('Light')) return '%';
    if (name.includes('Quality')) return ' PPM';
    return '';
  };

  const renderBarChart = (config, type) => {
    if (!formatData.length) return null;

    const latestData = formatData[0];
    const barData = config.dataKeys.map((key, index) => ({
      name: key,
      value: latestData[key] === "Not working" ? 0 : parseFloat(latestData[key]),
      color: config.colors[index]
    }));

    return (
      <div 
        className="bg-white p-4 rounded-lg shadow-md mb-6 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => {
          setSelectedMetric(type);
          setShowHistoric(true);
        }}
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-700">{config.title}</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
              <YAxis domain={config.yAxisDomain} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value">
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderHistoricChart = (config) => {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">{config.title} - Historic Data</h3>
          <button 
            onClick={() => setShowHistoric(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            Back to Overview
          </button>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formatData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="timestamp" 
                angle={-45} 
                textAnchor="end"
                height={80}
                interval="preserveStartEnd"
              />
              <YAxis domain={config.yAxisDomain} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {config.dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={config.colors[index]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  if (showHistoric && selectedMetric) {
    return renderHistoricChart(chartConfigs[selectedMetric]);
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderBarChart(chartConfigs.moisture, 'moisture')}
        {renderBarChart(chartConfigs.temperatures, 'temperatures')}
      </div>
      <div className="col-span-1">
        {renderBarChart(chartConfigs.environmental, 'environmental')}
      </div>
    </div>
  );
};

export default SensorLineChart;
