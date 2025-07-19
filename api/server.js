const http = require('http');
const app = require('./src/app');
const logger = require('./src/utils/logger');
const connectDB = require('./src/config/database');
const socketService = require('./src/services/socketService');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Create HTTP server for Socket.IO integration
const server = http.createServer(app);

// Initialize Socket.IO
socketService.initialize(server);

server.listen(PORT, () => {
  logger.info(`
🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}
📚 API Documentation: http://localhost:${PORT}/api-docs
🔗 API Base URL: http://localhost:${PORT}/api
⚡ Socket.IO ready for real-time collaboration
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = server;
