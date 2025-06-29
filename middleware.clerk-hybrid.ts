import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { authMiddleware } from '@clerk/nextjs'

// Rate limiting store - using Map for in-memory storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting configuration (same as before)
const RATE_LIMITS = {
  auth: { requests: 1000, window: 60000 },
  preview: { requests: 20, window: 60000 },
  general: { requests: 200, window: 60000 }
}

function getRateLimitType(pathname: string): keyof typeof RATE_LIMITS {
  if (pathname.includes('/api/auth/') || pathname.includes('/api/clerk/')) {
    return 'auth'
  }
  if (pathname.includes('/preview-bom') || pathname.includes('/bom/export')) {
    return 'preview'
  }
  return 'general'
}

function getRateLimitKey(request: NextRequest, type: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(/, /)[0] : request.ip || 'unknown'
  return `rate_limit:${type}:${ip}`
}

function isRateLimited(key: string, type: keyof typeof RATE_LIMITS): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)
  const limit = RATE_LIMITS[type]

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + limit.window })
    return false
  }

  if (record.count >= limit.requests) {
    return true
  }

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

async function hybridAuthMiddleware(request: NextRequest) {
  // Apply rate limiting to API routes first
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

    // Cleanup expired records periodically
    if (Math.random() < 0.01) {
      cleanupExpiredRecords()
    }
  }

  // Check for Clerk authentication first (if user has been migrated)
  // For now, we'll primarily use NextAuth but prepare for gradual migration
  
  const token = await getToken({ req: request })
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isRootPage = request.nextUrl.pathname === '/'

  // If accessing root page, redirect based on auth status and role
  if (isRootPage) {
    if (token) {
      const userRole = token.role as string
      if (userRole === 'PROCUREMENT_SPECIALIST') {
        return NextResponse.redirect(new URL('/procurement', request.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // If trying to access login page while authenticated, redirect based on role
  if (isAuthPage && token) {
    const userRole = token.role as string
    if (userRole === 'PROCUREMENT_SPECIALIST') {
      return NextResponse.redirect(new URL('/procurement', request.url))
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // If trying to access protected pages without authentication, redirect to login
  const protectedPaths = ['/dashboard', '/orders', '/service-orders', '/procurement', '/admin']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const middleware = hybridAuthMiddleware

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*', '/orders/:path*', '/service-orders/:path*', '/procurement/:path*', '/admin/:path*', '/api/:path*']
}