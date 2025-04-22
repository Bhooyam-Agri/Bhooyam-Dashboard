import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Plant profiles with recommended nutrient levels by growth stage
const plantProfiles = {
  tomato: {
    name: "Tomato",
    stages: {
      seedling: { // 0-3 weeks
        'pH Up': 0.5,
        'pH Down': 0.2,
        'Solution A': 1.0,
        'Solution B': 1.2
      },
      vegetative: { // 3-8 weeks
        'pH Up': 0.8,
        'pH Down': 0.3,
        'Solution A': 2.2,
        'Solution B': 2.0
      },
      flowering: { // 8+ weeks
        'pH Up': 1.0,
        'pH Down': 0.4,
        'Solution A': 2.8,
        'Solution B': 3.0
      }
    }
  },
  lettuce: {
    name: "Lettuce",
    stages: {
      seedling: { // 0-2 weeks
        'pH Up': 0.3,
        'pH Down': 0.2,
        'Solution A': 0.8,
        'Solution B': 0.7
      },
      vegetative: { // 2-4 weeks
        'pH Up': 0.5,
        'pH Down': 0.3,
        'Solution A': 1.5,
        'Solution B': 1.2
      },
      mature: { // 4+ weeks
        'pH Up': 0.6,
        'pH Down': 0.4,
        'Solution A': 1.8,
        'Solution B': 1.5
      }
    }
  },
  basil: {
    name: "Basil",
    stages: {
      seedling: { // 0-2 weeks
        'pH Up': 0.4,
        'pH Down': 0.2,
        'Solution A': 0.9,
        'Solution B': 0.8
      },
      vegetative: { // 2-6 weeks
        'pH Up': 0.6,
        'pH Down': 0.3,
        'Solution A': 1.7,
        'Solution B': 1.5
      },
      mature: { // 6+ weeks
        'pH Up': 0.7,
        'pH Down': 0.4,
        'Solution A': 2.0,
        'Solution B': 1.8
      }
    }
  },
  spinach: {
    name: "Spinach",
    stages: {
      seedling: { // 0-2 weeks
        'pH Up': 0.3,
        'pH Down': 0.1,
        'Solution A': 0.7,
        'Solution B': 0.6
      },
      vegetative: { // 2-5 weeks
        'pH Up': 0.5,
        'pH Down': 0.2,
        'Solution A': 1.3,
        'Solution B': 1.1
      },
      mature: { // 5+ weeks
        'pH Up': 0.6,
        'pH Down': 0.3,
        'Solution A': 1.6,
        'Solution B': 1.4
      }
    }
  }
};

const PeristalticPumpControl = () => {
  const [pumps, setPumps] = useState([
    { pumpNumber: 1, name: 'pH Up', flowRate: 0, targetVolume: 0, isActive: false },
    { pumpNumber: 2, name: 'pH Down', flowRate: 0, targetVolume: 0, isActive: false },
    { pumpNumber: 3, name: 'Solution A', flowRate: 0, targetVolume: 0, isActive: false },
    { pumpNumber: 4, name: 'Solution B', flowRate: 0, targetVolume: 0, isActive: false }
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
  const [selectedPlant, setSelectedPlant] = useState("");
  const [plantAge, setPlantAge] = useState(0);

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
              [field]: Number(value)
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
      const response = await axios.post('http://localhost:5001/api/peristaltic/pump/settings', {
        pumpNumber,
        targetVolume: pump.targetVolume
      });

      const autoFlowRate = response.data.calculatedValues?.autoFlowRate || 'unknown';
      setError(`Pump ${pumpNumber} started with auto flow rate: ${autoFlowRate} ml/min`);
      
      fetchAllPumpSettings();
      setTimeout(() => setError(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to update pump ${pumpNumber} settings`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (pumpNumber) => {
    try {
      await axios.post(`http://localhost:5001/api/peristaltic/pump/${pumpNumber}/stop`);
      fetchAllPumpSettings();
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

  const getGrowthStage = (plant, ageInWeeks) => {
    if (!plantProfiles[plant]) return null;
    
    const stages = plantProfiles[plant].stages;
    
    if (plant === 'tomato') {
      if (ageInWeeks < 3) return 'seedling';
      if (ageInWeeks < 8) return 'vegetative';
      return 'flowering';
    } else if (plant === 'lettuce' || plant === 'spinach') {
      if (ageInWeeks < 2) return 'seedling';
      if (ageInWeeks < 5) return 'vegetative';
      return 'mature';
    } else if (plant === 'basil') {
      if (ageInWeeks < 2) return 'seedling';
      if (ageInWeeks < 6) return 'vegetative';
      return 'mature';
    }
    
    return null;
  };

  const applyPlantProfile = () => {
    if (!selectedPlant || plantAge <= 0) {
      setError('Please select a plant and enter a valid age');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const stage = getGrowthStage(selectedPlant, plantAge);
    
    if (!stage) {
      setError('Unable to determine growth stage');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const recommendedRates = plantProfiles[selectedPlant].stages[stage];
    
    setSolutionRates({
      'pH Up': recommendedRates['pH Up'],
      'pH Down': recommendedRates['pH Down'],
      'Solution A': recommendedRates['Solution A'],
      'Solution B': recommendedRates['Solution B']
    });

    setError(`Applied ${plantProfiles[selectedPlant].name} profile (${stage} stage)`);
    setTimeout(() => setError(null), 3000);
  };

  const calculateSolutionVolumes = () => {
    if (waterVolume <= 0) {
      setError('Water volume must be greater than 0 liters');
      setTimeout(() => setError(null), 3000);
      return;
    }

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
      
      <section className="mb-8">
        <div className="p-4 border rounded-lg bg-green-50">
          <h4 className="text-lg font-medium mb-4">Plant Profile</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plant Type
              </label>
              <select
                value={selectedPlant}
                onChange={(e) => setSelectedPlant(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select a plant</option>
                {Object.keys(plantProfiles).map(plant => (
                  <option key={plant} value={plant}>
                    {plantProfiles[plant].name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plant Age (weeks)
              </label>
              <input
                type="number"
                value={plantAge}
                onChange={(e) => setPlantAge(Number(e.target.value))}
                min="0"
                step="0.5"
                className="w-full border rounded-md px-3 py-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={applyPlantProfile}
                disabled={!selectedPlant || plantAge <= 0}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Plant Profile
              </button>
            </div>
          </div>
          
          {selectedPlant && plantAge > 0 && (
            <div className="mt-3 text-sm text-green-700">
              <p>Growth Stage: <span className="font-semibold">{getGrowthStage(selectedPlant, plantAge)}</span></p>
            </div>
          )}
        </div>
      </section>
      
      <section className="mb-8">
        <div className="p-4 border rounded-lg bg-blue-50">
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
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pumps.map((pump) => (
          <div 
            key={pump.pumpNumber}
            className="border rounded-lg p-4 bg-gray-50"
          >
            <h4 className="text-lg font-medium mb-2">Pump {pump.pumpNumber}</h4>
            <p className="text-sm text-blue-600 font-medium mb-4">{pump.name}</p>
            
            <div className="space-y-4">
              {pump.flowRate > 0 && (
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Flow Rate:</span> {pump.flowRate} ml/min
                  <p className="text-xs text-gray-500">(Automatically optimized)</p>
                </div>
              )}

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
        <div className={`mt-4 p-3 rounded-md ${error.includes('success') || error.includes('started') || error.includes('Applied') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {error}
        </div>
      )}
    </div>
  );
};

export default PeristalticPumpControl;