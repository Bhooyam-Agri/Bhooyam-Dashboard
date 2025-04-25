import React from 'react';
import  PlantManagementSystem  from './components/Settings';
import Dashboard from '../../client/src/components/Dashboard';
import './index.css'; // Ensure Tailwind directives are imported
import Bhooyam from './components/About';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Homepage from './components/homepage';

function App() {
  return (
    <div className="App bg-gray-100 min-h-screen">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Homepage/>} />
          <Route path="/about" element={<Bhooyam/>} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/waterpump" element={<h1 className="text-2xl font-bold">About Us</h1>} />
          <Route path="/settings" element={<PlantManagementSystem />} />
          <Route path="/login" element={<h1 className="text-2xl font-bold">About Us</h1>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
