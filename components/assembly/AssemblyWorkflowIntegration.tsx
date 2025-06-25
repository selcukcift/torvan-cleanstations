"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OutsourcedPartsTracker } from "./OutsourcedPartsTracker"
import { SerialBatchCapture } from "./SerialBatchCapture"
import { PartsShortageReport } from "./PartsShortageReport"
import { useToast } from "@/hooks/use-toast"
import { Package, AlertTriangle, CheckCircle, Clock, Wrench } from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface AssemblyWorkflowIntegrationProps {
  orderId: string
  orderData: {
    poNumber: string
    customerName: string
    orderStatus: string
  }
  bomItems?: Array<{
    id: string
    partIdOrAssemblyId: string
    name: string
    quantity: number
    requiresSerialTracking?: boolean
    isOutsourced?: boolean
  }>
  onStatusChange?: () => void
}

export function AssemblyWorkflowIntegration({
  orderId,
  orderData,
  bomItems = [],
  onStatusChange
}: AssemblyWorkflowIntegrationProps) {
  const { toast } = useToast()
  const [outsourcedParts, setOutsourcedParts] = useState<any[]>([])
  const [allOutsourcedReceived, setAllOutsourcedReceived] = useState(true)
  const [serialTrackingComplete, setSerialTrackingComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const loadOutsourcedParts = async () => {
    try {
      const response = await nextJsApiClient.get(`/orders/${orderId}/outsourced-parts`)
      if (response.data.success) {
        setOutsourcedParts(response.data.data || [])
        setAllOutsourcedReceived(response.data.allReceived || false)
      }
    } catch (error) {
      console.error('Error loading outsourced parts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkSerialTracking = () => {
    const requiredSerialItems = bomItems.filter(item => item.requiresSerialTracking)
    // In a real implementation, this would check if all required serial numbers are captured
    // For now, assume complete if no required serial tracking or all items have been processed
    setSerialTrackingComplete(requiredSerialItems.length === 0)
  }

  useEffect(() => {
    loadOutsourcedParts()
    checkSerialTracking()
  }, [orderId, bomItems])

  const getWorkflowStatus = () => {
    if (isLoading) return { status: 'loading', message: 'Loading assembly prerequisites...' }
    
    if (!allOutsourcedReceived) {
      return { 
        status: 'blocked', 
        message: `${outsourcedParts.filter(p => !['RECEIVED', 'CANCELLED'].includes(p.status)).length} outsourced parts pending`,
        icon: AlertTriangle,
        color: 'destructive'
      }
    }
    
    if (!serialTrackingComplete) {
      return { 
        status: 'attention', 
        message: 'Serial/batch tracking required for critical components',
        icon: Package,
        color: 'warning'
      }
    }
    
    return { 
      status: 'ready', 
      message: 'All prerequisites met - assembly can proceed',
      icon: CheckCircle,
      color: 'success'
    }
  }

  const handleProceedToAssembly = async () => {
    try {
      // Update order status to IN_PRODUCTION if all prerequisites are met
      const response = await nextJsApiClient.put(`/orders/${orderId}/status`, {
        status: 'IN_PRODUCTION',
        notes: 'All assembly prerequisites verified - proceeding with production'
      })

      if (response.data.success) {
        toast({
          title: "Assembly Started",
          description: "Order moved to production status. Assembly team has been notified.",
        })
        onStatusChange?.()
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      })
    }
  }

  const workflowStatus = getWorkflowStatus()
  const StatusIcon = workflowStatus.icon || Clock

  const isAssemblyBlocked = workflowStatus.status === 'blocked'
  const canProceedToAssembly = workflowStatus.status === 'ready' && 
    !['IN_PRODUCTION', 'READY_FOR_FINAL_QC', 'QC_PASSED', 'SHIPPED', 'COMPLETED'].includes(orderData.orderStatus)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Assembly Workflow Status
          </CardTitle>
          <CardDescription>
            Pre-assembly verification and workflow management for order {orderData.poNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert variant={workflowStatus.color as any}>
              <StatusIcon className="h-4 w-4" />
              <AlertTitle>
                {workflowStatus.status === 'loading' && 'Loading'}
                {workflowStatus.status === 'blocked' && 'Assembly Blocked'}
                {workflowStatus.status === 'attention' && 'Action Required'}
                {workflowStatus.status === 'ready' && 'Ready for Assembly'}
              </AlertTitle>
              <AlertDescription>
                {workflowStatus.message}
              </AlertDescription>
            </Alert>

            {canProceedToAssembly && (
              <div className="flex justify-end">
                <Button 
                  onClick={handleProceedToAssembly}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Proceed to Assembly
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="outsourced" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="outsourced" className="gap-2">
            <Package className="h-4 w-4" />
            Outsourced Parts
            {!allOutsourcedReceived && (
              <Badge variant="destructive" className="ml-1">
                {outsourcedParts.filter(p => !['RECEIVED', 'CANCELLED'].includes(p.status)).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tracking" className="gap-2">
            <Package className="h-4 w-4" />
            Serial/Batch Tracking
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Report Issues
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outsourced" className="space-y-4">
          <OutsourcedPartsTracker
            orderId={orderId}
            orderData={orderData}
            outsourcedParts={outsourcedParts}
            onUpdate={() => {
              loadOutsourcedParts()
              onStatusChange?.()
            }}
          />
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Component Tracking</CardTitle>
              <CardDescription>
                Capture serial and batch numbers for critical components
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bomItems.filter(item => item.requiresSerialTracking).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No components require serial/batch tracking for this order</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bomItems
                    .filter(item => item.requiresSerialTracking)
                    .map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.partIdOrAssemblyId}</p>
                        </div>
                        <SerialBatchCapture
                          bomItem={item}
                          onCapture={(data) => {
                            toast({
                              title: "Tracking Captured",
                              description: `Serial/batch data recorded for ${item.name}`,
                            })
                            checkSerialTracking()
                          }}
                        />
                      </div>
                    ))
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parts Issues</CardTitle>
              <CardDescription>
                Report parts shortages or quality issues that prevent assembly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PartsShortageReport
                orderId={orderId}
                orderData={orderData}
                bomItems={bomItems}
                onReport={() => {
                  toast({
                    title: "Issue Reported",
                    description: "Parts issue has been reported and order placed on hold",
                  })
                  onStatusChange?.()
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}