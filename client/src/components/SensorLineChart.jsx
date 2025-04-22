import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Modal from 'react-modal';

const parseValue = (value) => {
  if (value === 0 || value === '0') return 0;
  if (value === null || value === undefined || Number.isNaN(value) || value === 'nan' || value === 'NaN') {
    return 0; // Return 0 instead of null for invalid values
  }
  return parseFloat(value);
};

const parseSoilMoisture = (value) => {
  if (value === '0%' || value === 0) return 0;
  if (!value || value === 'NaN%' || value === 'null%' || value === 'nan%') return 0;
  return parseFloat(value.replace('%', ''));
};

const SensorLineChart = ({ data, espId }) => {
  const [selectedChart, setSelectedChart] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [showLineChart, setShowLineChart] = useState(false);

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
    if (!data || data.length === 0) return [];
    
    return data.map(entry => ({
      timestamp: formatTimestamp(entry.timestamp),
      'Soil Moisture 1': parseSoilMoisture(entry.soilMoisture?.[0]),
      'Soil Moisture 2': parseSoilMoisture(entry.soilMoisture?.[1]),
      'Air Temperature': parseValue(entry.dht22?.temp || 0),
      'Air Humidity': parseValue(entry.dht22?.hum || 0),
      'Water Temperature': parseValue(entry.waterTemperature?.value || 0),
      'Air Quality': parseValue(entry.airQuality?.value || 0),
      'Light Level': parseValue(entry.lightIntensity?.value || 0),
      'UV Index': parseValue(entry.uvIndex?.value || 0),
      'EC': parseValue(entry.ec?.value || 0),
      'pH': parseValue(entry.ph?.value || 0)
    }));
  }, [data]);

  const chartConfigs = {
    moisture: {
      title: 'Soil Moisture Readings',
      dataKeys: ['Soil Moisture 1', 'Soil Moisture 2'],
      colors: ['#3B82F6', '#10B981'],
      yAxisDomain: [0, 100]
    },
    environmental: {
      title: 'Environmental Readings',
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
      yAxisDomain: [0, 'auto']
    }
  };

  const renderChart = (config, chartId) => {
    if (!formatData.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col mb-4">
            <h3 className="text-lg font-semibold">{config.title}</h3>
          </div>
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            No data available
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow"
           onClick={() => {
             setSelectedChart({ ...config, id: chartId });
             setModalIsOpen(true);
             setShowLineChart(true);
           }}>
        <div className="flex flex-col mb-4">
          <h3 className="text-lg font-semibold">{config.title}</h3>
          <p className="text-sm text-gray-500">Click to view detailed line chart</p>
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formatData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                interval="preserveStart"
                angle={-45}
                textAnchor="end"
                height={60}
                minTickGap={10}
              />
              <YAxis domain={config.yAxisDomain} />
              <Tooltip
                formatter={(value, name) => [value.toFixed(2), name]}
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

  const renderDetailModal = () => {
    if (!selectedChart) return null;

    return (
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => {
          setModalIsOpen(false);
          setShowLineChart(false);
        }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                   bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-6xl max-h-[90vh] overflow-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{selectedChart.title} - Detailed View</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowLineChart(!showLineChart)}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {showLineChart ? 'Show Bar Chart' : 'Show Line Chart'}
            </button>
            <button
              onClick={() => {
                setModalIsOpen(false);
                setShowLineChart(false);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="h-[600px]">
          <ResponsiveContainer width="100%" height="100%">
            {showLineChart ? (
              <LineChart data={formatData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  minTickGap={10}
                />
                <YAxis domain={selectedChart.yAxisDomain} />
                <Tooltip
                  formatter={(value, name) => [value.toFixed(2), name]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend />
                {selectedChart.dataKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={selectedChart.colors[index]}
                    dot={false}
                    activeDot={{ r: 6 }}
                    name={key}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart data={formatData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  minTickGap={10}
                />
                <YAxis domain={selectedChart.yAxisDomain} />
                <Tooltip
                  formatter={(value, name) => [value.toFixed(2), name]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend />
                {selectedChart.dataKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={selectedChart.colors[index]}
                    name={key}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderChart(chartConfigs.moisture, 'moisture')}
        {espId === 'esp1' && renderChart(chartConfigs.environmental, 'environmental')}
      </div>
      {renderDetailModal()}
    </div>
  );
};

export default SensorLineChart;
