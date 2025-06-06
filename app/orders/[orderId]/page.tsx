"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { nextJsApiClient } from "@/lib/api"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Package,
  Download,
  Loader2,
  Edit
} from "lucide-react"
import { format } from "date-fns"
import { BOMDisplay } from "@/components/order/BOMDisplay"
import { OrderSummaryCard } from "@/components/order/OrderSummaryCard"
import { OrderTimeline } from "@/components/order/OrderTimeline"
import { QCOrderIntegration } from "@/components/qc/QCOrderIntegration"

// Status badge color mapping
const statusColors: Record<string, string> = {
  ORDER_CREATED: "bg-blue-100 text-blue-700",
  PARTS_SENT_WAITING_ARRIVAL: "bg-purple-100 text-purple-700",
  READY_FOR_PRE_QC: "bg-yellow-100 text-yellow-700",
  READY_FOR_PRODUCTION: "bg-orange-100 text-orange-700",
  TESTING_COMPLETE: "bg-green-100 text-green-700",
  PACKAGING_COMPLETE: "bg-teal-100 text-teal-700",
  READY_FOR_FINAL_QC: "bg-indigo-100 text-indigo-700",
  READY_FOR_SHIP: "bg-emerald-100 text-emerald-700",
  SHIPPED: "bg-gray-100 text-gray-700"
}

// Status display names
const statusDisplayNames: Record<string, string> = {
  ORDER_CREATED: "Order Created",
  PARTS_SENT_WAITING_ARRIVAL: "Parts Sent - Waiting Arrival",
  READY_FOR_PRE_QC: "Ready for Pre-QC",
  READY_FOR_PRODUCTION: "Ready for Production",
  TESTING_COMPLETE: "Testing Complete",
  PACKAGING_COMPLETE: "Packaging Complete",
  READY_FOR_FINAL_QC: "Ready for Final QC",
  READY_FOR_SHIP: "Ready for Ship",
  SHIPPED: "Shipped"
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const user = session?.user
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [statusNotes, setStatusNotes] = useState("")

  useEffect(() => {
    fetchOrderDetails()
  }, [params.orderId])

  const fetchOrderDetails = async () => {
    try {
      const response = await nextJsApiClient.get(`/orders/${params.orderId}`)
      if (response.data.success) {
        setOrder(response.data.data)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch order details",
        variant: "destructive"
      })
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!newStatus) return

    setStatusUpdating(true)
    try {
      const response = await nextJsApiClient.put(`/orders/${params.orderId}/status`, {
        newStatus,
        notes: statusNotes
      })
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Order status updated successfully"
        })
        setShowStatusModal(false)
        setNewStatus("")
        setStatusNotes("")
        fetchOrderDetails() // Refresh order data
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status",
        variant: "destructive"
      })
    } finally {
      setStatusUpdating(false)
    }
  }

  // Determine allowed status transitions based on user role
  const getAllowedStatuses = () => {
    if (!order || !user) return []
    
    if (user.role === "ADMIN" || user.role === "PRODUCTION_COORDINATOR") {
      // These roles can transition to most statuses
      return Object.keys(statusDisplayNames).filter(status => status !== order.orderStatus)
    }
    
    // Role-specific transitions
    const transitions: Record<string, Record<string, string[]>> = {
      PROCUREMENT_SPECIALIST: {
        ORDER_CREATED: ["PARTS_SENT_WAITING_ARRIVAL"],
        PARTS_SENT_WAITING_ARRIVAL: ["READY_FOR_PRE_QC"]
      },
      QC_PERSON: {
        READY_FOR_PRE_QC: ["READY_FOR_PRODUCTION"],
        READY_FOR_FINAL_QC: ["READY_FOR_SHIP"]
      },
      ASSEMBLER: {
        READY_FOR_PRODUCTION: ["TESTING_COMPLETE"],
        TESTING_COMPLETE: ["PACKAGING_COMPLETE"],
        PACKAGING_COMPLETE: ["READY_FOR_FINAL_QC"]
      }
    }
    
    return transitions[user.role]?.[order.orderStatus] || []
  }

  // Handle BOM export
  const _handleBOMExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await nextJsApiClient.get(
        `/orders/${params.orderId}/bom/export?format=${format}`,
        { 
          responseType: 'blob',
          timeout: 30000 // 30 second timeout for large BOMs
        }
      )

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      // Extract filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition']
      let filename = `bom_${order.poNumber}_${new Date().toISOString().split('T')[0]}.${format}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '')
        }
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `BOM exported as ${format.toUpperCase()} successfully`
      })
    } catch (error: any) {
      console.error('BOM export error:', error)
      toast({
        title: "Export Failed",
        description: error.response?.data?.error || `Failed to export BOM as ${format.toUpperCase()}`,
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg">Order not found</p>
      </div>
    )
  }

  const allowedStatuses = getAllowedStatuses()
  const canUpdateStatus = allowedStatuses.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order Details</h1>
            <p className="text-slate-600">PO Number: {order.poNumber}</p>
          </div>
        </div>
        <Badge className={statusColors[order.orderStatus] || "bg-gray-100 text-gray-700"}>
          {statusDisplayNames[order.orderStatus] || order.orderStatus}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
          <TabsTrigger value="qc">Quality Control</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Enhanced Order Summary Card */}
          <OrderSummaryCard order={order} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm text-slate-500">Customer Name</Label>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                {order.projectName && (
                  <div>
                    <Label className="text-sm text-slate-500">Project Name</Label>
                    <p className="font-medium">{order.projectName}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm text-slate-500">Sales Person</Label>
                  <p className="font-medium">{order.salesPerson}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Language</Label>
                  <p className="font-medium">
                    {order.language === "EN" ? "English" : 
                     order.language === "FR" ? "French" : "Spanish"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm text-slate-500">Build Numbers</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {order.buildNumbers.map((bn: string) => (
                      <Badge key={bn} variant="outline">{bn}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Created By</Label>
                  <p className="font-medium">{order.createdBy.fullName}</p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Created Date</Label>
                  <p className="font-medium">
                    {format(new Date(order.createdAt), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-slate-500">Want Date</Label>
                  <p className="font-medium">
                    {format(new Date(order.wantDate), "MMM dd, yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Status Update */}
          {canUpdateStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>Change the order status based on current progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label>New Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedStatuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {statusDisplayNames[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Add notes about this status change..."
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || statusUpdating}
                  >
                    {statusUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Update Status
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          {order.buildNumbers.map((buildNumber: string) => (
            <Card key={buildNumber}>
              <CardHeader>
                <CardTitle>Build Number: {buildNumber}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basin Configurations */}
                {order.basinConfigurations
                  .filter((bc: any) => bc.buildNumber === buildNumber)
                  .map((basin: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="font-medium">Basin {idx + 1}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Type:</span> {basin.basinTypeId}
                        </div>
                        <div>
                          <span className="text-slate-500">Size:</span> {basin.basinSizePartNumber}
                        </div>
                        {basin.addonIds.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-slate-500">Add-ons:</span> {basin.addonIds.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                {/* Faucet Configurations */}
                {order.faucetConfigurations
                  .filter((fc: any) => fc.buildNumber === buildNumber)
                  .map((faucet: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="font-medium">Faucet Configuration</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Type:</span> {faucet.faucetTypeId}
                        </div>
                        <div>
                          <span className="text-slate-500">Quantity:</span> {faucet.faucetQuantity}
                        </div>
                      </div>
                    </div>
                  ))}

                {/* Sprayer Configurations */}
                {order.sprayerConfigurations
                  .filter((sc: any) => sc.buildNumber === buildNumber)
                  .map((sprayer: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="font-medium">Sprayer Configuration</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Has Sprayer:</span> {sprayer.hasSpray ? "Yes" : "No"}
                        </div>
                        {sprayer.hasSpray && (
                          <>
                            <div>
                              <span className="text-slate-500">Quantity:</span> {sprayer.sprayerQuantity}
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-500">Types:</span> {sprayer.sprayerTypeIds.join(", ")}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                {/* Accessories */}
                {order.selectedAccessories
                  .filter((sa: any) => sa.buildNumber === buildNumber)
                  .length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Accessories</h4>
                      <div className="space-y-1">
                        {order.selectedAccessories
                          .filter((sa: any) => sa.buildNumber === buildNumber)
                          .map((accessory: any, idx: number) => (
                            <div key={idx} className="text-sm">
                              {accessory.assemblyId} (Qty: {accessory.quantity})
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* BOM Tab */}
        <TabsContent value="bom" className="space-y-4">
          {/* Edit Configuration Button - Only show for orders that can be edited */}
          {order.orderStatus === 'ORDER_CREATED' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Need to modify the configuration?</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      You can edit the sink configuration while the order is in "Order Created" status
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/orders/edit/${order.id}`)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {order.generatedBoms && order.generatedBoms.length > 0 ? (
            <BOMDisplay
              orderId={order.id}
              poNumber={order.poNumber}
              bomItems={order.generatedBoms[0]?.bomItems || []}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No BOM generated for this order</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* QC Tab */}
        <TabsContent value="qc" className="space-y-4">
          <QCOrderIntegration orderId={order.id} orderStatus={order.orderStatus} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          {order.associatedDocuments && order.associatedDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.associatedDocuments.map((doc: any) => (
                <Card key={doc.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <p className="font-medium">{doc.docName}</p>
                        </div>
                        <p className="text-sm text-slate-500">
                          Uploaded on {format(new Date(doc.timestamp), "MMM dd, yyyy")}
                        </p>
                        <Badge variant="outline">{doc.docType}</Badge>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No documents uploaded for this order</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <OrderTimeline
            events={order.historyLogs}
            currentStatus={order.orderStatus}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper function to render BOM items recursively
function renderBomItems(items: any[], level: number) {
  return items.map((item: any) => (
    <div key={item.id} style={{ marginLeft: `${level * 20}px` }}>
      <div className="flex items-center justify-between py-2 border-b">
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-slate-400" />
          <span className={level === 0 ? "font-medium" : "text-sm"}>
            {item.name}
          </span>
          {item.isCustom && <Badge variant="outline" className="text-xs">Custom</Badge>}
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-slate-500">Part: {item.partIdOrAssemblyId}</span>
          <span className="font-medium">Qty: {item.quantity}</span>
        </div>
      </div>
      {item.children && item.children.length > 0 && renderBomItems(item.children, level + 1)}
    </div>
  ))
}