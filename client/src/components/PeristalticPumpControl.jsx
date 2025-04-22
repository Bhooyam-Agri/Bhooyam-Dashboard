import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PeristalticPumpControl = () => {
  const [pumps, setPumps] = useState([
    { pumpNumber: 1, name: 'pH Up', flowRate: 1, targetVolume: 0, isActive: false },
    { pumpNumber: 2, name: 'pH Down', flowRate: 1, targetVolume: 0, isActive: false },
    { pumpNumber: 3, name: 'Solution A', flowRate: 1, targetVolume: 0, isActive: false },
    { pumpNumber: 4, name: 'Solution B', flowRate: 1, targetVolume: 0, isActive: false }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [waterVolume, setWaterVolume] = useState(0);
  const [solutionRates, setSolutionRates] = useState({
    'pH Up': 0,
    'pH Down': 0,
    'Solution A': 0,
    'Solution B': 0
  });

  useEffect(() => {
    fetchAllPumpSettings();
  }, []);

  const fetchAllPumpSettings = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/peristaltic/pumps');
      const pumpSettings = response.data;
      setPumps(prevPumps => 
        prevPumps.map(pump => {
          const settings = pumpSettings.find(s => s.pumpNumber === pump.pumpNumber);
          return settings ? { ...settings } : pump;
        })
      );
    } catch (err) {
      setError('Failed to load pump settings');
      console.error(err);
    }
  };

  const handleChange = (pumpNumber, field, value) => {
    setPumps(prevPumps =>
      prevPumps.map(pump =>
        pump.pumpNumber === pumpNumber
          ? { 
              ...pump, 
              [field]: field === 'flowRate' 
                ? Math.max(1, Math.min(100, Number(value))) // Clamp flow rate between 1-100
                : Number(value)
            }
          : pump
      )
    );
  };

  const handleSubmit = async (pumpNumber) => {
    setLoading(true);
    setError(null);
    const pump = pumps.find(p => p.pumpNumber === pumpNumber);

    try {
      await axios.post('http://localhost:5001/api/peristaltic/pump/settings', {
        pumpNumber,
        flowRate: pump.flowRate,
        targetVolume: pump.targetVolume
      });

      setError(`Pump ${pumpNumber} settings updated successfully`);
      fetchAllPumpSettings(); // Refresh all pump states
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to update pump ${pumpNumber} settings`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (pumpNumber) => {
    try {
      await axios.post(`http://localhost:5001/api/peristaltic/pump/${pumpNumber}/stop`);
      fetchAllPumpSettings(); // Refresh all pump states
    } catch (err) {
      setError(`Failed to stop pump ${pumpNumber}`);
    }
  };

  const handleSolutionRateChange = (solutionName, value) => {
    setSolutionRates(prev => ({
      ...prev,
      [solutionName]: Number(value)
    }));
  };

  const calculateSolutionVolumes = () => {
    if (waterVolume <= 0) {
      setError('Water volume must be greater than 0 liters');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Calculate target volumes based on water volume and solution rates
    setPumps(prevPumps =>
      prevPumps.map(pump => {
        const rate = solutionRates[pump.name];
        const calculatedVolume = waterVolume * rate;
        return {
          ...pump,
          targetVolume: calculatedVolume
        };
      })
    );

    setError('Solution volumes calculated successfully');
    setTimeout(() => setError(null), 3000);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold mb-6">Peristaltic Pump Control</h3>
      
      {/* Water Volume and Solution Rate Input Section */}
      <div className="mb-8 p-4 border rounded-lg bg-blue-50">
        <h4 className="text-lg font-medium mb-4">Solution Calculator</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Water Volume (Liters)
            </label>
            <input
              type="number"
              value={waterVolume}
              onChange={(e) => setWaterVolume(Number(e.target.value))}
              min="0"
              step="0.1"
              className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter total water volume in liters"
            />
          </div>
          
          <div className="space-y-2">
            {pumps.map(pump => (
              <div key={`rate-${pump.pumpNumber}`} className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-1/3">
                  {pump.name} (ml/L):
                </label>
                <input
                  type="number"
                  value={solutionRates[pump.name]}
                  onChange={(e) => handleSolutionRateChange(pump.name, e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-2/3 border rounded-md px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`ml per liter`}
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={calculateSolutionVolumes}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 
                     focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Calculate Solution Volumes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pumps.map((pump) => (
          <div 
            key={pump.pumpNumber}
            className="border rounded-lg p-4 bg-gray-50"
          >
            <h4 className="text-lg font-medium mb-2">Pump {pump.pumpNumber}</h4>
            <p className="text-sm text-blue-600 font-medium mb-4">{pump.name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flow Rate (ml/min)
                </label>
                <input
                  type="number"
                  value={pump.flowRate}
                  onChange={(e) => handleChange(pump.pumpNumber, 'flowRate', e.target.value)}
                  min="1"
                  max="100"
                  className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Range: 1-100 ml/min</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Volume (ml)
                </label>
                <input
                  type="number"
                  value={pump.targetVolume}
                  onChange={(e) => handleChange(pump.pumpNumber, 'targetVolume', e.target.value)}
                  min="0"
                  max="1000"
                  className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Range: 0-1000 ml</p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleSubmit(pump.pumpNumber)}
                  disabled={loading || pump.isActive}
                  className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start {pump.name}
                </button>
                <button
                  onClick={() => handleStop(pump.pumpNumber)}
                  disabled={loading || !pump.isActive}
                  className="flex-1 bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 
                           focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Stop
                </button>
              </div>

              {pump.isActive && (
                <div className="text-sm text-green-600 mt-2">
                  {pump.name} is running
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className={`mt-4 p-3 rounded-md ${error.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {error}
        </div>
      )}
    </div>
  );
};

export default PeristalticPumpControl;