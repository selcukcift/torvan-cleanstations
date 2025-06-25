"use client"

import { use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppHeader } from "@/components/ui/app-header"
import { ComprehensiveOrderView } from "@/components/procurement/ComprehensiveOrderView"
import { ArrowLeft, AlertCircle } from "lucide-react"

interface ProcurementOrderPageProps {
  params: Promise<{
    orderId: string
  }>
}

export default function ProcurementOrderPage({ params }: ProcurementOrderPageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { orderId } = use(params)

  // Check authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <AppHeader />
        <div className="flex items-center justify-center py-12">
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push("/login")
    return null
  }

  // Check permissions
  const hasAccess = ["ADMIN", "PROCUREMENT_SPECIALIST"].includes(session.user?.role || "")

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <AppHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access procurement orders. This page is only available to Procurement Specialists and Administrators.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Back Button */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push("/procurement")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Procurement
            </Button>
          </div>
          
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Procurement Order Details</h1>
            <p className="text-slate-600 mt-1">
              Manage legs and casters for sink body manufacturing
            </p>
          </div>
        </div>

        {/* Main Content */}
        <ComprehensiveOrderView orderId={orderId} />
      </main>
    </div>
  )
}