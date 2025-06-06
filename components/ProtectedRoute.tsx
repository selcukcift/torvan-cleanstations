"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(redirectTo)
      return
    }

    // Check role permissions if specified
    if (status === 'authenticated' && session?.user && allowedRoles && !allowedRoles.includes(session.user.role)) {
      router.push('/dashboard') // Redirect to dashboard if role not allowed
      return
    }
  }, [status, session, allowedRoles, router, redirectTo])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Authenticating...
          </h1>
          <p className="text-slate-600">
            Verifying your access permissions...
          </p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session?.user) {
    return null // Router will handle redirect
  }

  return <>{children}</>
}

// Helper component for role-specific access
interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: string[]
  fallback?: React.ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { data: session } = useSession()

  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return fallback || (
      <div className="p-4 text-center">
        <p className="text-slate-600">You don't have permission to access this content.</p>
      </div>
    )
  }

  return <>{children}</>
}
