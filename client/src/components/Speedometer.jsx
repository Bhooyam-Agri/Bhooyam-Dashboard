import React, { memo } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { FaEyeSlash } from 'react-icons/fa';

// Use memo to prevent unnecessary re-renders
const Speedometer = memo(({ id, label, value, max, unit, onHide }) => {
  // Convert value to number and handle invalid cases
  const numericValue = value === null || value === undefined || value === "Not working" 
    ? 0 
    : parseFloat(value);

  // Check if sensor is working
  const isWorking = value !== null && value !== undefined && value !== "Not working";

  // Calculate percentage for the progress bar
  const percentage = isWorking ? (numericValue / max) * 100 : 0;

  // Determine color based on value ranges
  const getColor = () => {
    if (!isWorking) return '#9CA3AF'; // Gray for non-working sensors
    const percent = (numericValue / max) * 100;
    
    // Different color ranges for different sensor types
    if (label.includes('Temperature')) {
      if (percent < 30) return '#3B82F6'; // Cold - Blue
      if (percent < 60) return '#10B981'; // Normal - Green
      return '#EF4444'; // Hot - Red
    } else if (label.includes('Humidity') || label.includes('Moisture')) {
      if (percent < 30) return '#EF4444'; // Dry - Red
      if (percent < 70) return '#10B981'; // Good - Green
      return '#3B82F6'; // Wet - Blue
    } else if (label.includes('Air Quality')) {
      if (percent < 30) return '#10B981'; // Good - Green
      if (percent < 60) return '#F59E0B'; // Moderate - Yellow
      return '#EF4444'; // Poor - Red
    }
    
    // Default color scheme
    if (percent < 30) return '#EF4444'; // Red
    if (percent < 70) return '#F59E0B'; // Yellow
    return '#10B981'; // Green
  };

  const formatValue = (val) => {
    if (val === 0 || val === '0') return `0${unit}`;
    if (val === null || val === undefined || Number.isNaN(val) || val === 'nan' || val === 'NaN') {
      return "Not Working";
    }
    return `${val}${unit}`;
  };

  const getRotation = () => {
    if (value === null || value === undefined || Number.isNaN(value) || value === 'nan' || value === 'NaN') {
      return 0; // Return to zero position when not working
    }
    const percentage = ((value - 0) / (max - 0)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  };

  const rotation = getRotation();
  const displayValue = formatValue(value);
  const isNotWorking = displayValue === "Not Working";

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg relative hover:shadow-xl transition-shadow duration-300">
      <button
        onClick={() => onHide(id)}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
        title="Hide sensor"
      >
        <FaEyeSlash size={16} />
      </button>
      
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{label}</h3>
        
        <div className="w-32 h-32 mb-4">
          <CircularProgressbar
            value={percentage}
            text={isWorking ? `${numericValue.toFixed(1)}${unit}` : 'N/A'}
            styles={buildStyles({
              rotation: 0.25,
              strokeLinecap: 'round',
              textSize: '16px',
              pathTransitionDuration: 0.3, // Faster transition for live updates
              pathColor: getColor(),
              textColor: getColor(),
              trailColor: '#F3F4F6',
              backgroundColor: '#3e98c7'
            })}
          />
        </div>
        
        {isWorking ? (
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: getColor() }}>
              {percentage < 30 ? 'Low' : percentage < 70 ? 'Normal' : 'High'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Range: 0 - {max}{unit}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium">Sensor not working</p>
            <p className="text-xs text-gray-400 mt-1">Check connection</p>
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="absolute top-3 left-3">
        <div 
          className={`w-2 h-2 rounded-full ${
            isWorking 
              ? 'bg-green-500 animate-pulse' 
              : 'bg-red-500'
          }`}
          title={isWorking ? 'Sensor active' : 'Sensor inactive'}
        />
      </div>

      {/* Mini Trend Indicator (if you have historical data) */}
      {isWorking && (
        <div className="absolute bottom-3 right-3 text-xs font-medium">
          {percentage > 50 ? '↗' : '↘'}
        </div>
      )}
    </div>
  );
});

Speedometer.displayName = 'Speedometer';
export default Speedometer;
