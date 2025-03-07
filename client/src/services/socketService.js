import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (!this.socket) {
      this.socket = io('http://localhost:5001', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('WebSocket Connected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket Connection Error:', error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket Disconnected:', reason);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onSensorData(callback) {
    if (!this.socket) this.connect();
    this.socket.on('sensorData', callback);
    return () => this.socket.off('sensorData', callback);
  }
}

export default new SocketService();