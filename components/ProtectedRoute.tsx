"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/sign-in'
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, isLoaded, isSignedIn } = useUser()

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.push(redirectTo)
      return
    }

    // Check role permissions if specified
    const userRole = user?.publicMetadata?.role as string
    if (isSignedIn && user && allowedRoles && userRole && !allowedRoles.includes(userRole)) {
      router.push('/dashboard') // Redirect to dashboard if role not allowed
      return
    }
  }, [isLoaded, isSignedIn, user, allowedRoles, router, redirectTo])

  if (!isLoaded) {
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

  if (!isSignedIn || !user) {
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
  const { user, isLoaded } = useUser()

  const userRole = user?.publicMetadata?.role as string
  if (!user || !userRole || !allowedRoles.includes(userRole)) {
    return fallback || (
      <div className="p-4 text-center">
        <p className="text-slate-600">You don't have permission to access this content.</p>
      </div>
    )
  }

  return <>{children}</>
}
