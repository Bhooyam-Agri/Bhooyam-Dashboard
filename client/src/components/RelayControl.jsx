import React, { useState, useEffect } from 'react';
import { FaPowerOff } from 'react-icons/fa';
import axios from 'axios';

const RelayControl = () => {
  const [isOn, setIsOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch initial state
  useEffect(() => {
    fetchRelayState();
  }, []);

  const fetchRelayState = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/relay/state`, {
        timeout: 5000
      });
      
      if (response.ok) {
        setIsOn(response.data.state);
        setError(null);
      } else {
        throw new Error(response.data.error || 'Failed to get relay state');
      }
    } catch (err) {
      if (err.response) {
        // Server responded with a status code outside the 2xx range
        setError(err.response.data.error || 'Failed to get relay state');
      } else if (err.request) {
        // Request was made but no response received
        setError('No response from server. Check connection.');
      } else {
        // Something else happened
        setError(err.message);
      }
      console.error('Relay state error:', err);
    }
  };

  const toggleRelay = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`http://localhost:5001/api/relay/toggle`, {
        state: !isOn
      }, {
        timeout: 5000
      });
      
      if (response.ok) {
        setIsOn(response.data.state);
        setError(null);
      } else {
        throw new Error(response.data.error || 'Failed to toggle relay');
      }

    } catch (err) {
      setError(err.message);
      console.error('Relay control error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Water Pump Control</h3>
        {error && (
          <span className="text-sm text-red-500 animate-fade-in">
            {error}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div 
            className={`w-3 h-3 rounded-full ${
              isOn ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} 
          />
          <span className="text-sm font-medium text-gray-600">
            {isOn ? 'Pump Running' : 'Pump Off'}
          </span>
        </div>

        <button
          onClick={toggleRelay}
          disabled={loading}
          className={`
            relative inline-flex items-center px-4 py-2 rounded-lg
            ${isOn 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
            }
            text-white font-medium transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <FaPowerOff className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Processing...' : (isOn ? 'Turn Off' : 'Turn On')}
        </button>
      </div>
    </div>
  );
};

export default RelayControl; 