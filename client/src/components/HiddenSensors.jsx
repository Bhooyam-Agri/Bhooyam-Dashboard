import React from 'react';
import { FaEye } from 'react-icons/fa';

const HiddenSensors = ({ hiddenSensors, onUnhide, onUnhideAll }) => {
  if (hiddenSensors.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Hidden Sensors</h3>
        <button
          onClick={onUnhideAll}
          className="text-sm text-blue-500 hover:text-blue-600 font-medium"
        >
          Show All
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {hiddenSensors.map((sensorId) => (
          <div
            key={sensorId}
            className="flex items-center justify-between bg-gray-50 p-2 rounded-lg"
          >
            <span className="text-sm text-gray-600">
              {formatSensorName(sensorId)}
            </span>
            <button
              onClick={() => onUnhide(sensorId)}
              className="text-gray-400 hover:text-blue-500 transition-colors duration-200"
              title="Show sensor"
            >
              <FaEye size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to format sensor IDs into readable names
const formatSensorName = (sensorId) => {
  return sensorId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default HiddenSensors; 