import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WaterPumpControl = ({ espId }) => {
  const [settings, setSettings] = useState({
    espId: espId,
    onDuration: 300,  // Default 5 minutes
    offDuration: 1800 // Default 30 minutes
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, [espId]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/relay/pump/settings?espId=${espId}`);
      setSettings(prev => ({
        ...prev,
        ...response.data,
        espId: espId
      }));
    } catch (err) {
      setError('Failed to load pump settings');
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post('http://localhost:5001/api/relay/pump/settings', settings);
      setError('Settings updated successfully');
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Water Pump Timer Settings - {espId.toUpperCase()}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ON Duration (seconds)
            </label>
            <input
              type="number"
              name="onDuration"
              value={settings.onDuration}
              onChange={handleChange}
              min="1"
              max="3600"
              className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">1 - 3600 seconds (1 hour max)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OFF Duration (seconds)
            </label>
            <input
              type="number"
              name="offDuration"
              value={settings.offDuration}
              onChange={handleChange}
              min="1"
              max="7200"
              className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">1 - 7200 seconds (2 hours max)</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Settings'}
          </button>
        </div>

        {error && (
          <div className={`p-3 rounded-md ${error.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default WaterPumpControl;