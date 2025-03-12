import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Filter = ({ onFilter }) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const applyFilter = () => {
    // Convert dates to HH:mm:ss format before filtering
    const formatTimeForESP = (date) => {
      if (!date) return null;
      return date.toLocaleTimeString('en-IN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    onFilter(
      formatTimeForESP(startDate),
      formatTimeForESP(endDate)
    );
  };

  const resetFilter = () => {
    setStartDate(null);
    setEndDate(null);
    onFilter(null, null);
  };

  return (
    <div className="filter-container bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row items-center gap-4">
      <div className="flex flex-col">
        <label className="mb-2 font-medium">Start Date:</label>
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          showTimeSelect
          dateFormat="Pp"
          placeholderText="Select start date"
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col">
        <label className="mb-2 font-medium">End Date:</label>
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          showTimeSelect
          dateFormat="Pp"
          placeholderText="Select end date"
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col space-y-2">
        <button
          onClick={applyFilter}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Apply Filter
        </button>
        <button
          onClick={resetFilter}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
};

export default Filter;
