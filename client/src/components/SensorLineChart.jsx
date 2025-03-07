import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SensorLineChart = ({ data }) => {
  const [chartTypes, setChartTypes] = useState({
    moisture: 'line',
    temperatures: 'line',
    environmental: 'line'
  });

  const formatData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort by timestamp ascending for proper line plotting
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
        'Air Temp': parseValue(entry.dht22?.temp),
        'Air Humidity': parseValue(entry.dht22?.hum),
        'Water Temp': parseValue(entry.waterTemperature?.value),
        'Air Quality': parseValue(entry.airQuality?.value),
        'Light Level': parseValue(entry.lightIntensity?.value)
      };
    });
  }, [data]); // Only recompute when data changes

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
    if (!formatData.length) {
      return <div className="text-center p-4">No data available</div>;
    }

    const isBar = chartTypes[chartId] === 'bar';
    const ChartComponent = isBar ? BarChart : LineChart;
    const DataComponent = isBar ? Bar : Line;

    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{config.title}</h3>
          <button 
            onClick={() => toggleChartType(chartId)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Switch to {isBar ? 'Line' : 'Bar'} Chart
          </button>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={formatData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                domain={config.yAxisDomain}
                tickFormatter={(value) => Math.round(value)}
              />
              <Tooltip 
                formatter={(value) => {
                  if (value === null) return 'No data';
                  if (value === 0) return '0';
                  return value.toFixed(2);
                }}
                labelFormatter={(label) => new Date(label).toLocaleString()}
              />
              <Legend />
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
