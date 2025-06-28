import { PrismaClient } from '@prisma/client'
import { createStandardAPIResponse, createStandardErrorResponse } from '@/lib/apiResponse'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime?: number
  error?: string
  details?: Record<string, unknown>
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - start
    
    // Check if response time is concerning
    const status = responseTime > 1000 ? 'degraded' : 'healthy'
    
    return {
      name: 'database',
      status,
      responseTime,
      details: {
        provider: 'postgresql',
        url: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@') // Hide password
      }
    }
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
}

async function checkFileSystem(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const uploadsDir = process.env.UPLOADS_DIR || './uploads'
    
    // Check if uploads directory exists and is writable
    try {
      await fs.access(uploadsDir, fs.constants.F_OK | fs.constants.W_OK)
    } catch {
      // Try to create the directory if it doesn't exist
      await fs.mkdir(uploadsDir, { recursive: true })
    }
    
    // Test write operation
    const testFile = path.join(uploadsDir, `health-check-${Date.now()}.tmp`)
    await fs.writeFile(testFile, 'health-check')
    await fs.unlink(testFile)
    
    return {
      name: 'filesystem',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: {
        uploadsDir
      }
    }
  } catch (error) {
    return {
      name: 'filesystem',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown filesystem error'
    }
  }
}

async function checkMemoryUsage(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const memoryUsage = process.memoryUsage()
    const totalMemoryMB = Math.round(memoryUsage.rss / 1024 / 1024)
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
    
    // Consider degraded if heap usage is over 80% of total heap
    const heapUtilization = heapUsedMB / heapTotalMB
    const status = heapUtilization > 0.8 ? 'degraded' : 'healthy'
    
    return {
      name: 'memory',
      status,
      responseTime: Date.now() - start,
      details: {
        totalMemoryMB,
        heapUsedMB,
        heapTotalMB,
        heapUtilization: Math.round(heapUtilization * 100)
      }
    }
  } catch (error) {
    return {
      name: 'memory',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown memory error'
    }
  }
}

async function checkEnvironmentConfig(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ]
    
    const missingVars: string[] = []
    const envConfig: Record<string, string | undefined> = {}
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missingVars.push(envVar)
      } else {
        // Mask sensitive values
        if (envVar.includes('SECRET') || envVar.includes('PASSWORD')) {
          envConfig[envVar] = '***masked***'
        } else if (envVar === 'DATABASE_URL') {
          envConfig[envVar] = process.env[envVar]?.replace(/:[^:@]*@/, ':***@')
        } else {
          envConfig[envVar] = process.env[envVar]
        }
      }
    }
    
    const status = missingVars.length > 0 ? 'unhealthy' : 'healthy'
    
    return {
      name: 'environment',
      status,
      responseTime: Date.now() - start,
      details: {
        nodeEnv: process.env.NODE_ENV,
        missingRequiredVars: missingVars,
        config: envConfig
      },
      ...(missingVars.length > 0 && {
        error: `Missing required environment variables: ${missingVars.join(', ')}`
      })
    }
  } catch (error) {
    return {
      name: 'environment',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown environment error'
    }
  }
}

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Run all health checks in parallel
    const [database, filesystem, memory, environment] = await Promise.all([
      checkDatabase(),
      checkFileSystem(),
      checkMemoryUsage(),
      checkEnvironmentConfig()
    ])
    
    const checks = { database, filesystem, memory, environment }
    
    // Determine overall system status
    const hasUnhealthy = Object.values(checks).some(check => check.status === 'unhealthy')
    const hasDegraded = Object.values(checks).some(check => check.status === 'degraded')
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (hasUnhealthy) {
      overallStatus = 'unhealthy'
    } else if (hasDegraded) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }
    
    const totalResponseTime = Date.now() - startTime
    
    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: totalResponseTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    }
    
    // Return appropriate HTTP status code based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    return createStandardAPIResponse(healthData, httpStatus)
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown health check error',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
    
    return createStandardErrorResponse('INTERNAL_ERROR', 'Health check failed', 503, errorData)
  } finally {
    await prisma.$disconnect()
  }
}

// Simple HEAD endpoint for basic uptime monitoring
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`
    await prisma.$disconnect()
    return new Response(null, { status: 200 })
  } catch {
    return new Response(null, { status: 503 })
  }
}