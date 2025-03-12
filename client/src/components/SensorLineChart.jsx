import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SensorLineChart = ({ data }) => {
  const [chartTypes, setChartTypes] = useState({
    moisture: 'line',
    temperatures: 'line',
    environmental: 'line'
  });

  const getDateHeader = (data) => {
    if (!data || data.length === 0) return '';
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-IN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Compare only the time portion
    return currentTime.split(':')[0] === data[0].timestamp.split(':')[0] ? 'Current Hour' : data[0].timestamp;
  };

  const formatData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort by timestamp to ensure proper ordering
    return [...data].sort((a, b) => {
      // Sort timestamps directly as strings (HH:mm:ss format)
      return b.timestamp.localeCompare(a.timestamp);
    }).map(entry => ({
      timestamp: entry.timestamp,
      'Soil Moisture 1': entry.soilMoisture?.[0]?.replace('%', '') || null,
      'Soil Moisture 2': entry.soilMoisture?.[1]?.replace('%', '') || null,
      'Air Temp': entry.dht22?.temp || null,
      'Air Humidity': entry.dht22?.hum || null,
      'Water Temp': entry.waterTemperature?.value || null,
      'Air Quality': entry.airQuality?.value || null,
      'Light Level': entry.lightIntensity?.value || null
    }));
  }, [data]);

  const chartConfigs = {
    moisture: {
      title: 'Moisture & Humidity Readings',
      dataKeys: ['Soil Moisture 1', 'Soil Moisture 2', 'Air Humidity'],
      colors: ['#3B82F6', '#10B981', '#8B5CF6'],
      yAxisDomain: [0, 100]
    },
    temperatures: {
      title: 'Temperature Readings',
      dataKeys: ['Air Temp', 'Water Temp'],
      colors: ['#EF4444', '#F59E0B'],
      yAxisDomain: [0, 50]
    },
    environmental: {
      title: 'Environmental Conditions',
      dataKeys: ['Air Quality', 'Light Level'],
      colors: ['#6366F1', '#F59E0B'],
      yAxisDomain: [0, 400]
    }
  };

  const toggleChartType = (chartId) => {
    setChartTypes(prev => ({
      ...prev,
      [chartId]: prev[chartId] === 'bar' ? 'line' : 'bar'
    }));
  };

  const renderChart = (config, chartId) => {
    if (!formatData.length) return null;

    const calculateTickInterval = () => {
      // Show fewer ticks for better readability
      const dataLength = formatData.length;
      if (dataLength <= 5) return 0;  // Show all points for small datasets
      if (dataLength <= 8) return 1;  // Show every other point
      return 2;  // Show every third point for larger datasets
    };

    const isBar = chartTypes[chartId] === 'bar';
    const ChartComponent = isBar ? BarChart : LineChart;
    const DataComponent = isBar ? Bar : Line;

    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col mb-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{config.title}</h3>
            <button 
              onClick={() => toggleChartType(chartId)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Switch to {isBar ? 'Line' : 'Bar'} Chart
            </button>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {getDateHeader(data)}
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent 
              data={formatData}
              margin={{ top: 20, right: 30, left: 20, bottom: 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp"
                tick={{ 
                  fontSize: 12,
                  fill: '#374151',
                }}
                interval={1}
                angle={-45}
                textAnchor="end"
                height={85}
                tickMargin={25}
                minTickGap={20}
                scale="band"
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                domain={config.yAxisDomain}
                allowDataOverflow={false}
                tickFormatter={(value) => Math.round(value)}
              />
              <Tooltip 
                formatter={(value) => {
                  if (value === null || value === undefined) return 'No data';
                  return value;
                }}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Legend verticalAlign="top" height={36}/>
              {config.dataKeys.map((key, index) => (
                <DataComponent
                  key={key}
                  type={isBar ? undefined : "monotone"}
                  dataKey={key}
                  fill={config.colors[index]}
                  stroke={config.colors[index]}
                  strokeWidth={isBar ? undefined : 2}
                  dot={isBar ? undefined : { r: 2 }}
                  activeDot={isBar ? undefined : { r: 6 }}
                  connectNulls={true}
                  name={key}
                  isAnimationActive={false}
                />
              ))}
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderChart(chartConfigs.moisture, 'moisture')}
        {renderChart(chartConfigs.temperatures, 'temperatures')}
      </div>
      <div className="col-span-1">
        {renderChart(chartConfigs.environmental, 'environmental')}
      </div>
    </div>
  );
};

export default SensorLineChart;
