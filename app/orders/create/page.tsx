"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Save, Eye } from "lucide-react"
import { useOrderCreateStore } from "@/stores/orderCreateStore"
import { AppHeader } from "@/components/ui/app-header"
import { PageHeader, QuickActions } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { OrderWizard } from "@/components/order/OrderWizard"

export default function CreateOrderPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { resetForm } = useOrderCreateStore()

  useEffect(() => {
    if (!isLoaded) {
      return // Wait for auth to load
    }
    
    if (!user) {
      router.push('/sign-in')
      return
    }

    // Check if user has permission to create orders
    if (!['PRODUCTION_COORDINATOR', 'ADMIN'].includes(user.role)) {
      router.push('/dashboard')
      return
    }
  }, [status, isAuthenticated, user, router])

  // Only reset form on initial mount
  useEffect(() => {
    return () => {
      // Optionally reset form when leaving the page
      // resetForm()
    }
  }, [])

  if (!user || !['PRODUCTION_COORDINATOR', 'ADMIN'].includes(user.role)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Create New Order"
          description="Follow the 5-step process to create a new CleanStation order with custom configurations."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Create New Order" }
          ]}
          actions={
            <QuickActions>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (confirm('Are you sure you want to start over? All current progress will be lost.')) {
                    resetForm()
                  }
                }}
              >
                Start Over
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard" className="flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  View All Orders
                </a>
              </Button>
            </QuickActions>
          }
        />

        <div className="mt-8">
          <OrderWizard />
        </div>
      </main>
    </div>
  )
}
