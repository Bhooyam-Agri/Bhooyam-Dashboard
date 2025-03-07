require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const relayRoutes = require('./routes/relayRoutes');
const SensorData = require('./models/SensorData');

// Initialize Express
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with extended configurations
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5175',
      process.env.CLIENT_URL
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Store connected clients and track their activity
const connectedClients = new Map();

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  connectedClients.set(socket.id, { lastActivity: Date.now() });

  // Handle requests for missed data
  socket.on('requestMissedData', async ({ lastTimestamp }) => {
    try {
      // Fetch data since last known timestamp
      const missedData = await SensorData.find({
        timestamp: { $gt: new Date(parseInt(lastTimestamp)) }
      })
      .sort({ timestamp: 1 })
      .lean();

      // Send missed data to client
      if (missedData.length > 0) {
        missedData.forEach(data => {
          socket.emit('sensorData', {
            type: 'update',
            data: data
          });
        });
      }
    } catch (error) {
      console.error('Error fetching missed data:', error);
    }
  });

  socket.on('subscribe', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedClients.delete(socket.id);
  });
});

// Make io available globally
global.io = io;

// Security Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5175',
    process.env.CLIENT_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Custom JSON parsing middleware specifically for ESP32 data
app.use((req, res, next) => {
  if (req.is('application/json')) {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    
    req.on('end', () => {
      if (data) {
        try {
          // Handle ESP32's specific JSON format but preserve timestamp
          const sanitizedData = data
            .replace(/:\s*nan\b/g, ': null')
            .replace(/:\s*NaN\b/g, ': null')
            .replace(/:\s*undefined\b/g, ': null')
            .replace(/:\s*Infinity\b/g, ': null')
            .replace(/:\s*-Infinity\b/g, ': null');
            
          req.body = JSON.parse(sanitizedData);
          console.log('ESP32 data received with timestamp:', req.body.timestamp);
          next();
        } catch (e) {
          console.error('JSON Parse Error:', e.message);
          console.error('Raw data:', data);
          res.status(400).json({ 
            error: 'Invalid JSON format', 
            details: e.message,
            rawData: data.substring(0, 200) // Log first 200 chars for debugging
          });
        }
      } else {
        next();
      }
    });
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add error handler for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Connect to MongoDB
connectDB();

// Add this near your MongoDB connection code
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.once('open', () => {
  console.log('MongoDB connected successfully');
});

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/data', require('./routes/dataRoutes'));
app.use('/api/analysis', authMiddleware, require('./routes/analysisRoutes'));
app.use('/api/relay', relayRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Modify the server start code
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    const PORT = process.env.PORT || 5001;
    
    // Add error handler for server
    httpServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try these steps:`);
        console.error('1. Kill all node processes');
        console.error('2. Wait a few seconds');
        console.error('3. Try starting the server again');
        process.exit(1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Export for testing
module.exports = app;
