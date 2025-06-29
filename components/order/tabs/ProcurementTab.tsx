"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Package, CheckCircle } from "lucide-react"
import { ProcurementPartsSelector } from "@/components/procurement/ProcurementPartsSelector"
import { nextJsApiClient } from "@/lib/api"
import { format } from "date-fns"

interface ProcurementTabProps {
  orderId: string
  orderStatus: string
  bomData: any
  bomLoading: boolean
  bomError: string | null
  onStatusChange: () => void
}

interface OutsourcedPartSummary {
  total: number
  sent: number
  received: number
  pending: number
}

export function ProcurementTab({
  orderId,
  orderStatus,
  bomData,
  bomLoading,
  bomError,
  onStatusChange,
}: ProcurementTabProps) {
  const { user, isLoaded } = useUser()
  const [outsourcedParts, setOutsourcedParts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<OutsourcedPartSummary>({
    total: 0,
    sent: 0,
    received: 0,
    pending: 0,
  })

  // Check if user has permission to view this tab
  const hasPermission = user?.role === "ADMIN" || user?.role === "PROCUREMENT_SPECIALIST"
  const isRelevantStatus = ["ORDER_CREATED", "SINK_BODY_EXTERNAL_PRODUCTION"].includes(orderStatus)

  useEffect(() => {
    if (hasPermission && isRelevantStatus) {
      fetchOutsourcedParts()
    }
  }, [orderId, hasPermission, isRelevantStatus])

  const fetchOutsourcedParts = async () => {
    try {
      const response = await nextJsApiClient.get(`/orders/${orderId}/outsourced-parts`)
      if (response.data.success) {
        const parts = response.data.data
        setOutsourcedParts(parts)
        
        // Calculate summary
        const summary = parts.reduce((acc: OutsourcedPartSummary, part: any) => {
          acc.total++
          if (part.status === "SENT" || part.status === "IN_PROGRESS") {
            acc.sent++
          } else if (part.status === "RECEIVED") {
            acc.received++
          } else if (part.status === "PENDING") {
            acc.pending++
          }
          return acc
        }, { total: 0, sent: 0, received: 0, pending: 0 })
        
        setSummary(summary)
      }
    } catch (error) {
      console.error("Error fetching outsourced parts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAllPartsReceived = async () => {
    try {
      // Update order status to READY_FOR_PRE_QC
      await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus: "READY_FOR_PRE_QC",
        notes: "Sink body received from manufacturer - ready for Pre-QC",
      })
      
      onStatusChange()
    } catch (error) {
      console.error("Error updating order status:", error)
    }
  }

  if (!hasPermission) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to view procurement information.
        </AlertDescription>
      </Alert>
    )
  }

  if (!isRelevantStatus) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Procurement actions are not available for this order status.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Summary */}
      {outsourcedParts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outsourced Parts Summary</CardTitle>
            <CardDescription>
              Overview of parts sent to external manufacturers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Parts</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-blue-600">{summary.sent}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Received</p>
                <p className="text-2xl font-bold text-green-600">{summary.received}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
              </div>
            </div>
            
            {/* Show confirm button when all parts are received */}
            {orderStatus === "SINK_BODY_EXTERNAL_PRODUCTION" && summary.sent === 0 && summary.pending === 0 && summary.total > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Alert className="mb-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sink body with assembled legs has been received. You can now proceed to Pre-QC.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleConfirmAllPartsReceived}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Sink Body Received & Proceed to Pre-QC
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Parts Selector */}
      {bomLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            <span>Loading BOM data...</span>
          </CardContent>
        </Card>
      ) : bomError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{bomError}</AlertDescription>
        </Alert>
      ) : bomData ? (
        <ProcurementPartsSelector
          orderId={orderId}
          bomData={bomData}
          orderStatus={orderStatus}
          onStatusChange={() => {
            fetchOutsourcedParts()
            onStatusChange()
          }}
        />
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No BOM data available. Please generate the BOM first.
          </AlertDescription>
        </Alert>
      )}

      {/* Outsourced Parts List */}
      {outsourcedParts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outsourced Parts Details</CardTitle>
            <CardDescription>
              Detailed list of all parts sent to external manufacturers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outsourcedParts.map((part) => (
                <div key={part.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{part.partNumber}</span>
                      <Badge variant="outline">{part.partName}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Qty: {part.quantity} | Supplier: {part.supplier || "Not specified"}
                    </div>
                    {part.notes && (
                      <p className="text-sm text-muted-foreground">{part.notes}</p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <Badge className={
                      part.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      part.status === "SENT" ? "bg-blue-100 text-blue-700" :
                      part.status === "IN_PROGRESS" ? "bg-purple-100 text-purple-700" :
                      part.status === "RECEIVED" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    }>
                      {part.status.replace("_", " ")}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Marked: {(() => {
                        if (!part.markedAt) return "Unknown"
                        const date = new Date(part.markedAt)
                        return isNaN(date.getTime()) ? "Unknown" : format(date, "MMM dd, yyyy")
                      })()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}