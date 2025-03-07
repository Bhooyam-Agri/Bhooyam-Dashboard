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

let lastDataTimestamp = null;

export const fetchSensorData = async (page = 1, limit = 15, startDate, endDate, interval) => {
  try {
    const params = {
      page,
      limit,
      timestamp: Date.now() // Add timestamp to prevent caching
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (interval) params.interval = interval;

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
    if (error.response) {
      throw new Error(error.response.data.error || 'Server error');
    } else if (error.request) {
      throw new Error('Could not connect to server');
    } else {
      throw error;
    }
  }
};

export const downloadCSV = async (startDate, endDate) => {
  try {
    const params = {};

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await api.get('/data/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login', { email, password });
    const { token } = response.data;
    localStorage.setItem('token', token);
    return token;
  } catch (error) {
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
};
