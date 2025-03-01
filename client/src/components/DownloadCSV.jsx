import React from 'react';
import { downloadCSV } from '../../../client/src/services/api';

const DownloadCSV = ({ filters }) => {
  const handleDownload = async () => {
    try {
      const data = await downloadCSV(
        filters.startDate ? filters.startDate.toISOString() : undefined,
        filters.endDate ? filters.endDate.toISOString() : undefined
      );

      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sensor_data.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  return (
    <div className="download-csv">
      <button
        onClick={handleDownload}
        className="bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600 transition-colors w-full md:w-auto"
      >
        Download CSV
      </button>
    </div>
  );
};

export default DownloadCSV;
