/**
 * Database Configuration
 * Manages PostgreSQL connection settings and Prisma Client configuration
 */

const { PrismaClient } = require('@prisma/client');

// Database configuration settings
const DATABASE_CONFIG = {
  // Connection settings
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/torvan-db',
  
  // Connection pool settings
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
  
  // Query settings
  queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
  
  // Logging configuration
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  
  // Error formatting
  errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
};

// Prisma Client instance with configuration
let prisma;

function createPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: DATABASE_CONFIG.log,
      errorFormat: DATABASE_CONFIG.errorFormat,
      datasources: {
        db: {
          url: DATABASE_CONFIG.url,
        },
      },
    });
  }
  return prisma;
}

// Graceful shutdown handler
async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    console.log('Database connection closed');
  }
}

// Health check function
async function checkDatabaseHealth() {
  try {
    const client = createPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message, 
      timestamp: new Date().toISOString() 
    };
  }
}

module.exports = {
  DATABASE_CONFIG,
  createPrismaClient,
  disconnectDatabase,
  checkDatabaseHealth,
  // Export singleton instance
  get prisma() {
    return createPrismaClient();
  },
};
