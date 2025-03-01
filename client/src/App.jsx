import React from 'react';
import Dashboard from '../../client/src/components/Dashboard';
import './index.css'; // Ensure Tailwind directives are imported

function App() {
  return (
    <div className="App bg-gray-100 min-h-screen p-4">
      <Dashboard />
    </div>
  );
}

export default App;
