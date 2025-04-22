import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Set();
    this.lastDataTimestamp = this.getLastKnownTimestamp();
    this.historicalData = new Map(); // Store data for each ESP
    this.MAX_DATA_POINTS = 100;
  }

  // Store the last known timestamp in localStorage
  getLastKnownTimestamp() {
    const stored = localStorage.getItem('lastDataTimestamp');
    return stored ? parseInt(stored) : null;
  }

  setLastKnownTimestamp(timestamp) {
    if (timestamp) {
      localStorage.setItem('lastDataTimestamp', timestamp);
      this.lastDataTimestamp = timestamp;
    }
  }

  addToHistoricalData(espId, data) {
    if (!this.historicalData.has(espId)) {
      this.historicalData.set(espId, []);
    }
    
    const espData = this.historicalData.get(espId);
    espData.unshift(data); // Add new data at beginning
    
    // Keep only last MAX_DATA_POINTS
    while (espData.length > this.MAX_DATA_POINTS) {
      espData.pop(); // Remove oldest data
    }
    
    this.historicalData.set(espId, espData);
  }

  getHistoricalData(espId) {
    return this.historicalData.get(espId) || [];
  }

  connect() {
    if (!this.socket) {
      console.log('Initializing socket connection...');
      this.socket = io('http://localhost:5001', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000
      });

      this.setupEventHandlers();
    }
    return this.socket;
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Socket Connected');
      this.reconnectAttempts = 0;

      // Request any missed data since last known timestamp
      if (this.lastDataTimestamp) {
        this.socket.emit('requestMissedData', { 
          lastTimestamp: this.lastDataTimestamp 
        });
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket Connection Error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket Disconnected:', reason);
      // Clear existing listeners on disconnect
      this.listeners.clear();
    });

    // Handle errors
    this.socket.on('error', (error) => {
      console.error('Socket Error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  onSensorData(callback) {
    if (!this.socket) {
      this.connect();
    }

    // Add to listeners set
    this.listeners.add(callback);

    // Remove existing listener before adding new one
    this.socket.off('sensorData');
    
    // Handle incoming data
    this.socket.on('sensorData', (message) => {
      if (message.type === 'update' && message.data) {
        const data = message.data;
        
        if (data.timestamp) {
          this.setLastKnownTimestamp(new Date(data.timestamp).getTime());
          this.addToHistoricalData(data.espId, data);
        }

        // Notify all listeners
        this.listeners.forEach(listener => listener(message));
      }
    });

    // Return cleanup function
    return () => {
      if (this.socket) {
        this.socket.off('sensorData');
        this.listeners.delete(callback);
      }
    };
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Debug method to check current state
  getStatus() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      listenerCount: this.listeners.size
    };
  }
}

export default new SocketService();