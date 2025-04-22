import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:5001', // Make sure this matches your backend port
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Add request interceptor for logging and error handling
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', config.method.toUpperCase(), config.url, config.params);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    // Handle connection errors
    if (error.code === 'ECONNREFUSED') {
      console.error('Cannot connect to backend server. Please ensure the server is running.');
    } else {
      console.error('API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }
    return Promise.reject(error);
  }
);

// Add utility functions for consistent data parsing
export const parseValue = (value) => {
  if (value === 0 || value === '0') return 0;
  if (value === null || value === undefined || Number.isNaN(value) || value === 'nan' || value === 'NaN') return null;
  return parseFloat(value);
};

export const parseSoilMoisture = (value) => {
  if (value === '0%' || value === 0) return 0;
  if (!value || value === 'NaN%' || value === 'null%' || value === 'nan%') return null;
  return parseFloat(value.replace('%', ''));
};

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const fetchSensorData = async (page = 1, limit = 15, startDate, endDate, espId) => {
  try {
    const params = { page, limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (espId) params.espId = espId;

    const response = await api.get('/data', { 
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.data || !Array.isArray(response.data.items)) {
      throw new Error('Invalid response format from server');
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updatePumpSettings = async (settings) => {
  try {
    const response = await api.post('/api/relay/pump/settings', settings);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getPumpSettings = async () => {
  try {
    const response = await api.get('/api/relay/pump/settings');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const downloadCSV = async (startTime, endTime, espId) => {
  try {
    const params = {};
    if (startTime) params.startDate = startTime;
    if (endTime) params.endDate = endTime;
    if (espId) params.espId = espId;

    const response = await api.get('/data/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('CSV download error:', error);
    throw error;
  }
};
