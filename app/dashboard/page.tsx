"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Package, Clipboard, Settings, Wrench } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { AppHeader } from "@/components/ui/app-header"
import { useUser } from "@clerk/nextjs"
import { ProductionCoordinatorDashboard } from "@/components/dashboard/ProductionCoordinatorDashboard"
import { AssemblerDashboard } from "@/components/dashboard/AssemblerDashboard"
import { QCPersonDashboard } from "@/components/dashboard/QCPersonDashboard"
import { AdminDashboard } from "@/components/dashboard/AdminDashboard"
import { ServiceDepartmentDashboard } from "@/components/dashboard/ServiceDepartmentDashboard"
import { ProcurementSpecialistDashboard } from "@/components/dashboard/ProcurementSpecialistDashboard"

const roleIcons = {
  ADMIN: Settings,
  PRODUCTION_COORDINATOR: Clipboard,
  QC_PERSON: Clipboard,
  ASSEMBLER: Wrench,
}

const roleDescriptions = {
  ADMIN: "System administration and user management",
  PRODUCTION_COORDINATOR: "Order creation and workflow coordination",
  QC_PERSON: "Quality control and inspection tasks",
  ASSEMBLER: "Production assembly and testing",
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in')
    }
  }, [isLoaded, user, router])

  // Add timeout protection for loading state
  useEffect(() => {
    console.log('Dashboard: user loaded:', isLoaded, 'user:', user)
    
    // More detailed logging
    if (user) {
      console.log('Clerk user:', user)
      console.log('User role:', user.publicMetadata?.role)
    }
    
    // Set timeout regardless of status to catch stuck loading states
    const timeout = setTimeout(() => {
      if (!isLoaded) {
        console.warn('Dashboard loading timeout - redirecting to sign-in')
        setLoadingTimeout(true)
        router.push('/sign-in')
      }
    }, 10000) // 10 second timeout

    return () => clearTimeout(timeout)
  }, [isLoaded, router, user])

  if (!isLoaded && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <Package className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Loading Dashboard...
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            If this takes more than 10 seconds, you'll be redirected to login
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Get user role from Clerk's publicMetadata
  const userRole = user.publicMetadata?.role as string

  const RoleIcon = roleIcons[userRole] || Settings

  // Show role-specific dashboards
  const renderRoleDashboard = () => {
    console.log('Rendering dashboard for role:', userRole)
    
    switch (userRole) {
      case 'ADMIN':
        return <AdminDashboard />
      case 'PRODUCTION_COORDINATOR':
        return <ProductionCoordinatorDashboard />
      case 'ASSEMBLER':
        return <AssemblerDashboard />
      case 'QC_PERSON':
        return <QCPersonDashboard />
      case 'SERVICE_DEPARTMENT':
        return <ServiceDepartmentDashboard />
      case 'PROCUREMENT_SPECIALIST':
        return <ProcurementSpecialistDashboard />
      default:
        return null
    }
  }

  const roleDashboard = renderRoleDashboard()
  
  if (roleDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <AppHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {roleDashboard}
        </main>
      </div>
    )
  }

  // Default dashboard for other roles
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AppHeader />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome back, {user.firstName || user.username}!
          </h2>
          <p className="text-slate-600">
            Ready to manage your CleanStation production workflow tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Role Card */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <RoleIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Your Role</CardTitle>
                  <CardDescription className="text-sm">
                    {userRole?.replace('_', ' ') || 'No role assigned'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                {roleDescriptions[userRole] || 'Role description not available'}
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>
                Common tasks for your role
              </CardDescription>
            </CardHeader>            <CardContent className="space-y-2">
              {(userRole === 'ADMIN' || userRole === 'PRODUCTION_COORDINATOR') && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/orders/create')}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Create Order
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                View Orders
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Clipboard className="mr-2 h-4 w-4" />
                Task Dashboard
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">System Status</CardTitle>
              <CardDescription>
                Current system information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <span className="text-sm font-medium text-green-600">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Last Login</span>
                <span className="text-sm font-medium text-slate-900">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Active Session</span>
                <span className="text-sm font-medium text-slate-900">
                  {user.firstName || user.username || 'Unknown'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  )
}
