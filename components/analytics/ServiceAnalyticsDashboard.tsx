"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Users,
  BarChart3,
  Activity,
  Loader2,
  RefreshCw
} from "lucide-react"
import { nextJsApiClient } from '@/lib/api'
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface ServiceAnalytics {
  summary: {
    totalOrders: number
    pendingOrders: number
    approvedOrders: number
    rejectedOrders: number
    fulfillmentRate: number
    averageApprovalTimeHours: number
    period: number
  }
  ordersByStatus: {
    status: string
    count: number
  }[]
  topRequestedParts: {
    partId: string
    name: string
    photoURL?: string
    manufacturerPartNumber?: string
    totalRequested: number
    timesRequested: number
  }[]
  recentActivity: {
    id: string
    requestedBy: string
    itemCount: number
    totalQuantity: number
    status: string
    requestTimestamp: string
  }[]
  userSpecific?: {
    myOrders: number
    myApprovedOrders: number
    myApprovalRate: number
  }
}

const statusColors = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700", 
  REJECTED: "bg-red-100 text-red-700",
  ORDERED: "bg-blue-100 text-blue-700",
  RECEIVED: "bg-purple-100 text-purple-700"
}

export function ServiceAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<ServiceAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")
  const { toast } = useToast()

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get(`/service-orders/analytics?period=${period}`)
      if (response.data.success) {
        setAnalytics(response.data.data)
      }
    } catch (error: any) {
      console.error('Error fetching service analytics:', error)
      toast({
        title: "Error",
        description: "Failed to load service analytics",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Service Order Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Service Order Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-slate-500">No analytics data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Service Order Analytics</h2>
          <p className="text-slate-600">Insights and metrics for service parts ordering</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">{analytics.summary.totalOrders}</p>
                <p className="text-sm text-slate-600">Total Orders</p>
              </div>
              <Package className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{analytics.summary.pendingOrders}</p>
                <p className="text-sm text-slate-600">Pending Approval</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{analytics.summary.fulfillmentRate}%</p>
                <p className="text-sm text-slate-600">Fulfillment Rate</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{analytics.summary.averageApprovalTimeHours}h</p>
                <p className="text-sm text-slate-600">Avg Approval Time</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Specific Stats (if available) */}
      {analytics.userSpecific && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Service Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{analytics.userSpecific.myOrders}</p>
                <p className="text-sm text-slate-600">Your Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{analytics.userSpecific.myApprovedOrders}</p>
                <p className="text-sm text-slate-600">Approved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{analytics.userSpecific.myApprovalRate}%</p>
                <p className="text-sm text-slate-600">Your Approval Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Requested Parts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Top Requested Parts
            </CardTitle>
            <CardDescription>
              Most frequently requested service parts in the last {analytics.summary.period} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topRequestedParts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>Total Qty</TableHead>
                    <TableHead>Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topRequestedParts.map((part) => (
                    <TableRow key={part.partId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                            {part.photoURL ? (
                              <img 
                                src={part.photoURL} 
                                alt={part.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{part.name}</p>
                            <p className="text-xs text-slate-500">{part.partId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {part.totalRequested}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">
                          {part.timesRequested}x
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 text-slate-500">
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No part requests in this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest service order requests and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {analytics.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">
                        {activity.requestedBy} - {activity.itemCount} items ({activity.totalQuantity} total)
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(activity.requestTimestamp), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <Badge className={statusColors[activity.status as keyof typeof statusColors]}>
                      {activity.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500">
                <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders by Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Orders by Status
          </CardTitle>
          <CardDescription>
            Breakdown of service orders by current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.ordersByStatus.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {analytics.ordersByStatus.map((statusData) => (
                <div key={statusData.status} className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{statusData.count}</p>
                  <Badge 
                    variant="outline" 
                    className={`${statusColors[statusData.status as keyof typeof statusColors]} mt-1`}
                  >
                    {statusData.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No orders in this period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}