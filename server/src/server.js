const dotenv = require('dotenv');
const path = require('path');

// Configure environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { configureCloudinary } = require('./config/cloudinary');

// Initialize DB Connection
connectDB();

// Setup Cloudinary configurations (if credentials are provided)
configureCloudinary();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server listening in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Graceful shutdowns and uncaught exceptions handler
process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}. Shutting down...`);
  logger.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error(`UNHANDLED REJECTION: ${err.message}. Shutting down...`);
  logger.error(err.stack);
  server.close(() => {
    process.exit(1);
  });
});
