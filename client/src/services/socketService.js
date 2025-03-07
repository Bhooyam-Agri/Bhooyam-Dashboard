import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.lastDataTimestamp = this.getLastKnownTimestamp();
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

  connect() {
    if (!this.socket) {
      this.socket = io('http://localhost:5001', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      this.setupEventHandlers();
    }
    return this.socket;
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('WebSocket Connected');
      this.reconnectAttempts = 0;

      // Request any missed data since last known timestamp
      if (this.lastDataTimestamp) {
        this.socket.emit('requestMissedData', { 
          lastTimestamp: this.lastDataTimestamp 
        });
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket Connection Error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket Disconnected:', reason);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.lastDataTimestamp = null;
    }
  }

  onSensorData(callback) {
    if (!this.socket) {
      this.connect();
    }

    this.socket.off('sensorData');
    
    // Pass through raw data without any timestamp processing
    this.socket.on('sensorData', callback);

    return () => {
      if (this.socket) {
        this.socket.off('sensorData');
      }
    };
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();