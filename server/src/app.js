const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const deadlineRoutes = require('./routes/deadlineRoutes');
const projectRoutes = require('./routes/projectRoutes');
const evalRoutes = require('./routes/evalRoutes');
const adminRoutes = require('./routes/adminRoutes');
const corsOptions = require('./config/corsOptions');

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} request received at ${req.originalUrl}`);
  next();
});

// Configure Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static File Routing for Local direct-upload fallback files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/evaluations', evalRoutes);
app.use('/api/admin', adminRoutes);

// Fallback for undefined API routes
app.all('{*path}', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found on this server`, 404));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
