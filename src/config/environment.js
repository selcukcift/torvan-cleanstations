/**
 * Environment Configuration
 * Manages environment-specific settings and validation
 */

// Load environment variables from .env files (with precedence)
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config({ path: '.env' });

// Environment types
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
};

// Current environment
const NODE_ENV = process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;

// Server configuration
const SERVER_CONFIG = {
  port: parseInt(process.env.PORT) || 3001,
  host: process.env.HOST || 'localhost',
    // CORS settings
  corsOrigins: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3004', 'http://localhost:3005'],
  
  // Security settings
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Request body limits
  maxRequestBodySize: process.env.MAX_REQUEST_BODY_SIZE || '10mb',
  maxFileUploadSize: process.env.MAX_FILE_UPLOAD_SIZE || '50mb',
};

// Application configuration
const APP_CONFIG = {
  name: 'Torvan Medical CleanStation Workflow',
  version: process.env.npm_package_version || '1.0.0',
  
  // Logging configuration
  logLevel: process.env.LOG_LEVEL || (NODE_ENV === ENVIRONMENTS.DEVELOPMENT ? 'debug' : 'info'),
  logFormat: process.env.LOG_FORMAT || 'combined',
  
  // Feature flags
  features: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableSwagger: NODE_ENV === ENVIRONMENTS.DEVELOPMENT,
    enableDetailedErrors: NODE_ENV === ENVIRONMENTS.DEVELOPMENT,
  },
  
  // File upload configuration
  uploads: {
    directory: process.env.UPLOADS_DIR || './uploads',
    allowedTypes: process.env.ALLOWED_FILE_TYPES 
      ? process.env.ALLOWED_FILE_TYPES.split(',')
      : ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'],
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
  },
};

// Validation function for required environment variables
function validateEnvironment() {
  const required = [
    'DATABASE_URL',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    
    // In development, provide helpful hints
    if (NODE_ENV === ENVIRONMENTS.DEVELOPMENT) {
      console.log('\nPlease create a .env file with the following variables:');
      missing.forEach(key => {
        switch (key) {
          case 'DATABASE_URL':
            console.log(`${key}=postgresql://username:password@localhost:5432/torvan-db`);
            break;
          default:
            console.log(`${key}=your_value_here`);
        }
      });
    }
    
    process.exit(1);
  }
  
  console.log(`Environment validated successfully (${NODE_ENV})`);
}

// Environment-specific overrides
function getEnvironmentConfig() {
  switch (NODE_ENV) {
    case ENVIRONMENTS.PRODUCTION:
      return {
        ...SERVER_CONFIG,
        // Production-specific overrides
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || [],
        logLevel: 'warn',
      };
      
    case ENVIRONMENTS.TEST:
      return {
        ...SERVER_CONFIG,
        // Test-specific overrides
        port: parseInt(process.env.TEST_PORT) || 3002,
        logLevel: 'error',
        jwtExpiresIn: '1h', // Shorter expiry for tests
        corsOrigins: ['http://localhost:3002', 'http://localhost:3003'], // Test environment ports
      };
      
    case ENVIRONMENTS.DEVELOPMENT:
    default:
      return SERVER_CONFIG;
  }
}

module.exports = {
  NODE_ENV,
  ENVIRONMENTS,
  SERVER_CONFIG: getEnvironmentConfig(),
  APP_CONFIG,
  validateEnvironment,
  
  // Helper functions
  isDevelopment: () => NODE_ENV === ENVIRONMENTS.DEVELOPMENT,
  isProduction: () => NODE_ENV === ENVIRONMENTS.PRODUCTION,
  isTest: () => NODE_ENV === ENVIRONMENTS.TEST,
};
