require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import utilities
const logger = require('./utils/logger');
const { specs, swaggerUi, swaggerOptions } = require('./config/swagger');

// Create Express app
const app = express();


// Trust proxy (important for rate limiting when behind a reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}


// API Documentation with Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Import routes
const userRoutes = require('./routes/userRoutes');
const noteRoutes = require('./routes/noteRoutes');
const tagRoutes = require('./routes/tagRoutes');
const groupRoutes = require('./routes/groupRoutes');

// Mount routes
app.use('/api/users', userRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/groups', groupRoutes);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Information
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API information and available endpoints
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: CalcNote API
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 documentation:
 *                   type: string
 *                   example: /api-docs
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: string
 *                       example: /api/users
 *                     notes:
 *                       type: string
 *                       example: /api/notes
 *                     tags:
 *                       type: string
 *                       example: /api/tags
 *                     groups:
 *                       type: string
 *                       example: /api/groups
 */
// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CalcNote API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      users: '/api/users',
      notes: '/api/notes',
      tags: '/api/tags',
      groups: '/api/groups'
    }
  });
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health Check
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: API is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 environment:
 *                   type: string
 *                   example: development
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
