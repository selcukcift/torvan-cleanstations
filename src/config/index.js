/**
 * Central Configuration Exports
 * Main entry point for all configuration modules
 */

const database = require('./database');
const environment = require('./environment');

// Validate environment on module load
environment.validateEnvironment();

module.exports = {
  // Database configuration
  database,
  
  // Environment configuration
  environment,
  
  // Quick access to commonly used configurations
  server: environment.SERVER_CONFIG,
  app: environment.APP_CONFIG,
  
  // Database client
  get prisma() {
    return database.prisma;
  },
  
  // Environment helpers
  isDevelopment: environment.isDevelopment,
  isProduction: environment.isProduction,
  isTest: environment.isTest,
  
  // Graceful shutdown handler
  async shutdown() {
    console.log('Shutting down application...');
    await database.disconnectDatabase();
    process.exit(0);
  },
};
