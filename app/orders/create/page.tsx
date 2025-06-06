"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useOrderCreateStore } from "@/stores/orderCreateStore"
import { AppHeader } from "@/components/ui/app-header"
import { OrderWizard } from "@/components/order/OrderWizard"

export default function CreateOrderPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const user = session?.user
  const { resetForm } = useOrderCreateStore()

  useEffect(() => {
    if (status === 'loading') {
      return // Wait for auth to load
    }
    
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }

    // Check if user has permission to create orders
    if (!['PRODUCTION_COORDINATOR', 'ADMIN'].includes(user.role)) {
      router.push('/dashboard')
      return
    }

    // Reset form when page loads
    resetForm()
  }, [status, isAuthenticated, user, router, resetForm])

  if (!user || !['PRODUCTION_COORDINATOR', 'ADMIN'].includes(user.role)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Create New Order
          </h1>
          <p className="text-slate-600">
            Follow the 5-step process to create a new CleanStation order with custom configurations.
          </p>
        </div>

        <OrderWizard />
      </main>
    </div>
  )
}
