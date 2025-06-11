"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  BarChart3,
  PieChart,
  Calendar,
  User,
  Package,
  AlertTriangle,
  Target,
  Loader2,
  Download
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { format, subDays, startOfDay, endOfDay } from "date-fns"

interface QCMetrics {
  passRate: number
  totalInspections: number
  avgInspectionTime: number
  failureReasons: Array<{ reason: string; count: number }>
  inspectorPerformance: Array<{
    inspectorName: string
    inspections: number
    passRate: number
    avgTime: number
  }>
  trendData: Array<{
    date: string
    passed: number
    failed: number
    total: number
  }>
  productTypeMetrics: Array<{
    productFamily: string
    passRate: number
    totalInspections: number
    commonIssues: string[]
  }>
}

interface QCAnalyticsDashboardProps {
  className?: string
}

export function QCAnalyticsDashboard({ className }: QCAnalyticsDashboardProps) {
  const { toast } = useToast()
  const [metrics, setMetrics] = useState<QCMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState("30") // days
  const [selectedInspector, setSelectedInspector] = useState<string>("all")
  const [selectedProduct, setSelectedProduct] = useState<string>("all")

  useEffect(() => {
    fetchQCMetrics()
  }, [dateRange, selectedInspector, selectedProduct])

  const fetchQCMetrics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        days: dateRange,
        inspector: selectedInspector,
        productFamily: selectedProduct
      })
      
      const response = await nextJsApiClient.get(`/qc/metrics?${params}`)
      
      if (response.data.success) {
        setMetrics(response.data.data)
      }
    } catch (error: any) {
      console.error('Error fetching QC metrics:', error)
      // Mock data for development
      setMetrics({
        passRate: 87.5,
        totalInspections: 156,
        avgInspectionTime: 18.5,
        failureReasons: [
          { reason: "Measurement out of tolerance", count: 8 },
          { reason: "Surface finish issues", count: 5 },
          { reason: "Assembly alignment", count: 3 },
          { reason: "Missing components", count: 2 }
        ],
        inspectorPerformance: [
          { inspectorName: "John Smith", inspections: 45, passRate: 92, avgTime: 16.2 },
          { inspectorName: "Sarah Johnson", inspections: 38, passRate: 89, avgTime: 19.1 },
          { inspectorName: "Mike Chen", inspections: 42, passRate: 85, avgTime: 17.8 },
          { inspectorName: "Lisa Rodriguez", inspections: 31, passRate: 90, avgTime: 20.3 }
        ],
        trendData: [
          { date: "2025-01-01", passed: 12, failed: 2, total: 14 },
          { date: "2025-01-02", passed: 15, failed: 1, total: 16 },
          { date: "2025-01-03", passed: 18, failed: 3, total: 21 },
          { date: "2025-01-04", passed: 20, failed: 2, total: 22 },
          { date: "2025-01-05", passed: 16, failed: 4, total: 20 }
        ],
        productTypeMetrics: [
          { 
            productFamily: "T2 Sink", 
            passRate: 88, 
            totalInspections: 124, 
            commonIssues: ["Drain alignment", "Surface scratches"] 
          },
          { 
            productFamily: "Control Box", 
            passRate: 95, 
            totalInspections: 32, 
            commonIssues: ["Wiring connectivity"] 
          }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  const exportMetrics = async () => {
    try {
      const params = new URLSearchParams({
        days: dateRange,
        inspector: selectedInspector,
        productFamily: selectedProduct,
        format: 'csv'
      })
      
      const response = await nextJsApiClient.get(`/qc/metrics/export?${params}`, {
        responseType: 'blob'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `qc-metrics-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Export Successful",
        description: "QC metrics have been exported to CSV"
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export QC metrics",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Loading QC analytics...</span>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <p className="text-lg font-medium">No QC Data Available</p>
          <p className="text-slate-600">No quality control data found for the selected period.</p>
        </CardContent>
      </Card>
    )
  }

  const getPassRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-600"
    if (rate >= 85) return "text-yellow-600"
    return "text-red-600"
  }

  const getPassRateBadgeVariant = (rate: number) => {
    if (rate >= 95) return "default"
    if (rate >= 85) return "secondary"
    return "destructive"
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                QC Performance Analytics
              </CardTitle>
              <CardDescription>
                Monitor quality control metrics and inspector performance
              </CardDescription>
            </div>
            <Button onClick={exportMetrics} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <Select value={selectedInspector} onValueChange={setSelectedInspector}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Inspectors</SelectItem>
                  {metrics.inspectorPerformance.map((inspector) => (
                    <SelectItem key={inspector.inspectorName} value={inspector.inspectorName}>
                      {inspector.inspectorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {metrics.productTypeMetrics.map((product) => (
                    <SelectItem key={product.productFamily} value={product.productFamily}>
                      {product.productFamily}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pass Rate</p>
                <p className={`text-2xl font-bold ${getPassRateColor(metrics.passRate)}`}>
                  {metrics.passRate.toFixed(1)}%
                </p>
              </div>
              <div className="flex items-center">
                {metrics.passRate >= 85 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>
            <Progress value={metrics.passRate} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Inspections</p>
                <p className="text-2xl font-bold">{metrics.totalInspections}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {Math.round(metrics.totalInspections / parseInt(dateRange))} per day avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Time</p>
                <p className="text-2xl font-bold">{metrics.avgInspectionTime.toFixed(1)}m</p>
              </div>
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Per inspection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {Math.round(metrics.totalInspections * (100 - metrics.passRate) / 100)}
                </p>
              </div>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {(100 - metrics.passRate).toFixed(1)}% failure rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="inspectors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inspectors">Inspector Performance</TabsTrigger>
          <TabsTrigger value="products">Product Analysis</TabsTrigger>
          <TabsTrigger value="issues">Common Issues</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="inspectors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inspector Performance Comparison</CardTitle>
              <CardDescription>
                Individual inspector metrics and performance analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.inspectorPerformance.map((inspector) => (
                  <div key={inspector.inspectorName} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{inspector.inspectorName}</h4>
                        <Badge variant={getPassRateBadgeVariant(inspector.passRate)}>
                          {inspector.passRate}% Pass Rate
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-slate-600">
                        <span>{inspector.inspections} inspections</span>
                        <span>{inspector.avgTime.toFixed(1)}m avg time</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Progress value={inspector.passRate} className="w-24 mb-1" />
                      <span className="text-xs text-slate-500">{inspector.passRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Type Analysis</CardTitle>
              <CardDescription>
                Quality metrics broken down by product family
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.productTypeMetrics.map((product) => (
                  <div key={product.productFamily} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{product.productFamily}</h4>
                      <Badge variant={getPassRateBadgeVariant(product.passRate)}>
                        {product.passRate}% Pass Rate
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-600">
                        {product.totalInspections} total inspections
                      </span>
                      <Progress value={product.passRate} className="w-32" />
                    </div>
                    {product.commonIssues.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Common Issues:</p>
                        <div className="flex flex-wrap gap-2">
                          {product.commonIssues.map((issue, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Failure Analysis</CardTitle>
              <CardDescription>
                Most common reasons for QC failures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.failureReasons.map((reason, index) => (
                  <div key={reason.reason} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{reason.reason}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">{reason.count} occurrences</span>
                      <Badge variant="destructive">{reason.count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Trends</CardTitle>
              <CardDescription>
                Daily QC pass/fail trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center text-slate-500 py-8">
                  <PieChart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>Trend visualization would be implemented here</p>
                  <p className="text-sm">Chart library integration needed for full visualization</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  {metrics.trendData.slice(-3).map((day) => (
                    <div key={day.date} className="text-center p-3 border rounded">
                      <p className="text-sm text-slate-600">{format(new Date(day.date), "MMM dd")}</p>
                      <p className="text-lg font-semibold">{((day.passed / day.total) * 100).toFixed(0)}%</p>
                      <p className="text-xs text-slate-500">{day.passed}/{day.total}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}