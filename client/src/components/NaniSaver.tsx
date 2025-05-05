import React, { useRef, useState, useEffect } from 'react';

// Mock data for different plants
const plantData = {
    'Tomato': {
        temperature: `${(18 + Math.random() * 9).toFixed(1)}`,  // Random between 18-27
        ph: (6.0 + Math.random() * 0.8).toFixed(1),               // Random between 6.0-6.8
        light: 'Full Sun (6–8 hours/day)',
        humidity: `${Math.floor(60 + Math.random() * 20)}`,      // Random between 60-80%
        nitrogen: `${Math.floor(210 + Math.random() * 30 - 15)} ppm`,  // Base 210 ±15
        phosphorus: `${Math.floor(50 + Math.random() * 20 - 10)} ppm`, // Base 50 ±10
        potassium: `${Math.floor(260 + Math.random() * 40 - 20)} ppm`  // Base 260 ±20
    },
    'Lettuce': {
        temperature: `${(15 + Math.random() * 5).toFixed(1)}°C`,
        ph: (6.0 + Math.random() * 0.8).toFixed(1),
        light: 'Partial Sun',
        humidity: `${Math.floor(55 + Math.random() * 20)}%`,
        nitrogen: `${Math.floor(180 + Math.random() * 30 - 15)} ppm`,
        phosphorus: `${Math.floor(40 + Math.random() * 20 - 10)} ppm`,
        potassium: `${Math.floor(200 + Math.random() * 40 - 20)} ppm`
    },
    'Cauliflower': {
        temperature: `${(15 + Math.random() * 5).toFixed(1)}°C`,
        ph: (5.5 + Math.random() * 1.0).toFixed(1),
        light: 'Full Sun',
        humidity: `${Math.floor(65 + Math.random() * 15)}%`,
        nitrogen: `${Math.floor(200 + Math.random() * 30 - 15)} ppm`,
        phosphorus: `${Math.floor(40 + Math.random() * 20 - 10)} ppm`,
        potassium: `${Math.floor(250 + Math.random() * 40 - 20)} ppm`
    },
    'Spinach': {
        temperature: `${(13 + Math.random() * 8).toFixed(1)}°C`,
        ph: (6.2 + Math.random() * 0.6).toFixed(1),
        light: 'Full Sun to Partial Shade',
        humidity: `${Math.floor(50 + Math.random() * 20)}%`,
        nitrogen: `${Math.floor(190 + Math.random() * 30 - 15)} ppm`,
        phosphorus: `${Math.floor(30 + Math.random() * 20 - 10)} ppm`,
        potassium: `${Math.floor(235 + Math.random() * 40 - 20)} ppm`
    }
};
  

const Plantsaver = () => {
  const plantRef = useRef<HTMLSelectElement>(null);
  const daysRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [selectedPlant, setSelectedPlant] = useState('');
  const [currentValues, setCurrentValues] = useState<any>({
    temperature: '',
    ph: '',
    light: '',
    humidity: '',
   
    nitrogen: '',
    phosphorus: '',
    potassium: ''
  });

  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    if (selectedPlant && plantData[selectedPlant]) {
      setCurrentValues(plantData[selectedPlant]);
    } else {
      setCurrentValues({
        temperature: '',
        ph: '',
        light: '',
        humidity: '',
   
        nitrogen: '',
        phosphorus: '',
        potassium: ''
      });
    }
  }, [selectedPlant]);

  const handlePlantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPlant(e.target.value);
  };

  const handleSubmit = () => {
    const plant = selectedPlant; // use state instead of ref
    const days = daysRef.current?.value;
   
  
    if (!plant || !days ) {
      alert('Please fill all inputs and upload a photo.');
      return;
    }
  
    // Simulated result
    setResult({
      plant,
      days,
      ...currentValues  // use currentValues instead of directly accessing plantData
    });
  };
  


    const isFormValid = () =>
        selectedPlant &&
        daysRef.current
      

  return (
    <div className="p-6 mx-auto w-full bg-green-50 rounded-lg shadow-md border border-green-200 max-w-2xl">
      <h2 className="text-2xl font-bold text-green-800 mb-4 text-center">Select Plant</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-green-700 font-medium mb-2">Choose Plant:</label>
          <select
            ref={plantRef}
            onChange={handlePlantChange}
            className="w-full border border-green-300 rounded-md p-2"
          >
            <option value="">Select a plant...</option>
            <option>Tomato</option>
            <option>Cauliflower</option>
            <option>Lettuce</option>
            <option>Spinach</option>
          </select>
        </div>

        <div>
          <label className="block text-green-700 font-medium mb-2">Enter Number of Days:</label>
          <input
            ref={daysRef}
            type="number"
            min="1"
            placeholder="Enter days..."
            className="w-full border border-green-300 rounded-md p-2"
          />
        </div>

       

        
      </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid()}
          className={`px-6 py-2 rounded-md text-white font-semibold transition ${
            isFormValid()
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Submit
        </button>
      </div>

     {/* Replace the existing result section with this */}
{result && (
    <div className="mt-6 p-4 bg-white border border-green-300 rounded-md">
        <h4 className="text-lg font-bold text-green-700 mb-2">Plant Analysis Results</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <span className="block text-green-600">Plant:</span>
                <div className="p-2 border rounded bg-white">{result.plant}</div>
            </div>
            <div>
                <span className="block text-green-600">Days:</span>
                <div className="p-2 border rounded bg-white">{result.days}</div>
            </div>
            <div>
                <span className="block text-green-600">Temperature:</span>
                <div className="p-2 border rounded bg-white">{result.temperature}°C</div>
            </div>
            <div>
                <span className="block text-green-600">pH Level:</span>
                <div className="p-2 border rounded bg-white">{result.ph}</div>
            </div>
            <div>
                <span className="block text-green-600">Light:</span>
                <div className="p-2 border rounded bg-white">{result.light}</div>
            </div>
            <div>
                <span className="block text-green-600">Humidity:</span>
                <div className="p-2 border rounded bg-white">{result.humidity}%</div>
            </div>
           
            <div className="md:col-span-2 flex gap-4">
                <div className="flex-1">
                    <span className="block text-green-600">Nitrogen:</span>
                    <div className="p-2 border rounded bg-white">{result.nitrogen}</div>
                </div>
                <div className="flex-1">
                    <span className="block text-green-600">Phosphorus:</span>
                    <div className="p-2 border rounded bg-white">{result.phosphorus}</div>
                </div>
                <div className="flex-1">
                    <span className="block text-green-600">Potassium:</span>
                    <div className="p-2 border rounded bg-white">{result.potassium}</div>
                </div>
            </div>
        </div>
    </div>
)}
    </div>
  );
};

export default Plantsaver;
