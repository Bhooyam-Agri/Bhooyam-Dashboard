import React, { useState, useEffect } from 'react';

const TimeRangeSelector = ({ onRangeChange, onIntervalChange }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [interval, setInterval] = useState(60); // Default 1 hour in minutes

  useEffect(() => {
    // Set default range to last 12 hours
    const end = new Date();
    const start = new Date(end.getTime() - (12 * 60 * 60 * 1000));
    
    setStartDate(start.toISOString().slice(0, 16));
    setEndDate(end.toISOString().slice(0, 16));
    
    handleRangeChange(start, end);
  }, []);

  const handleRangeChange = (start, end) => {
    onRangeChange(new Date(start), new Date(end));
  };

  const handleStartChange = (e) => {
    setStartDate(e.target.value);
    if (endDate) {
      handleRangeChange(e.target.value, endDate);
    }
  };

  const handleEndChange = (e) => {
    setEndDate(e.target.value);
    if (startDate) {
      handleRangeChange(startDate, e.target.value);
    }
  };

  const handleIntervalChange = (e) => {
    const newInterval = parseInt(e.target.value);
    setInterval(newInterval);
    onIntervalChange(newInterval);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-lg shadow">
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Start Date & Time:</label>
        <input
          type="datetime-local"
          value={startDate}
          onChange={handleStartChange}
          className="border rounded p-2"
        />
      </div>
      
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">End Date & Time:</label>
        <input
          type="datetime-local"
          value={endDate}
          onChange={handleEndChange}
          className="border rounded p-2"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Time Interval (minutes):</label>
        <select
          value={interval}
          onChange={handleIntervalChange}
          className="border rounded p-2"
        >
          <option value="1">1 minute</option>
          <option value="5">5 minutes</option>
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="120">2 hours</option>
          <option value="360">6 hours</option>
          <option value="720">12 hours</option>
        </select>
      </div>
    </div>
  );
};

export default TimeRangeSelector;