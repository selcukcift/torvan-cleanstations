import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rate limiting store - using Map for in-memory storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') // 1 minute
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200') // Much higher limit

// Special rate limits for different endpoint types
const RATE_LIMITS = {
  // NextAuth endpoints - very high limit
  auth: { requests: 1000, window: 60000 }, // 1000 requests per minute
  // BOM preview endpoints - moderate limit
  preview: { requests: 20, window: 60000 }, // 20 requests per minute
  // General API endpoints - high limit
  general: { requests: 200, window: 60000 } // 200 requests per minute
}

function getRateLimitType(pathname: string): keyof typeof RATE_LIMITS {
  // NextAuth endpoints
  if (pathname.includes('/api/auth/')) {
    return 'auth'
  }
  // BOM preview endpoints
  if (pathname.includes('/preview-bom') || pathname.includes('/bom/export')) {
    return 'preview'
  }
  // Default to general
  return 'general'
}

function getRateLimitKey(request: NextRequest, type: string): string {
  // Use IP address for rate limiting
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(/, /)[0] : request.ip || 'unknown'
  return `rate_limit:${type}:${ip}`
}

function isRateLimited(key: string, type: keyof typeof RATE_LIMITS): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)
  const limit = RATE_LIMITS[type]

  if (!record || now > record.resetTime) {
    // New window or first request
    rateLimitStore.set(key, { count: 1, resetTime: now + limit.window })
    return false
  }

  if (record.count >= limit.requests) {
    return true
  }

  // Increment count
  record.count++
  rateLimitStore.set(key, record)
  return false
}

function cleanupExpiredRecords(): void {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

export async function middleware(request: NextRequest) {
  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rateLimitType = getRateLimitType(request.nextUrl.pathname)
    const rateLimitKey = getRateLimitKey(request, rateLimitType)
    
    if (isRateLimited(rateLimitKey, rateLimitType)) {
      const limit = RATE_LIMITS[rateLimitType]
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please try again later. (${limit.requests} requests per ${limit.window/1000}s)`,
            details: `Rate limit exceeded for ${rateLimitType} endpoints`
          },
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        },
        { status: 429 }
      )
    }

    // Cleanup expired records periodically (1% chance on each request)
    if (Math.random() < 0.01) {
      cleanupExpiredRecords()
    }
  }

  const token = await getToken({ req: request })
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isRootPage = request.nextUrl.pathname === '/'

  // If accessing root page, redirect based on auth status
  if (isRootPage) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // If trying to access login page while authenticated, redirect to dashboard
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If trying to access protected pages without authentication, redirect to login
  const protectedPaths = ['/dashboard', '/orders', '/service-orders']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*', '/orders/:path*', '/service-orders/:path*', '/api/:path*']
}