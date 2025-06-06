"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  BarChart3,
  Calendar,
  AlertTriangle,
  Target,
  Award,
  Zap,
  Loader2
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface QCAnalytics {
  overview: {
    totalInspections: number
    passRate: number
    avgTimePerInspection: number
    inspectionsToday: number
    trendsPassRate: number
    trendsAvgTime: number
  }
  inspectorPerformance: Array<{
    inspectorId: string
    inspectorName: string
    totalInspections: number
    passRate: number
    avgTimePerInspection: number
    inspectionsThisWeek: number
  }>
  dailyTrends: Array<{
    date: string
    totalInspections: number
    passedInspections: number
    failedInspections: number
    avgTimePerInspection: number
  }>
  templateUsage: Array<{
    templateId: string
    templateName: string
    usageCount: number
    passRate: number
    avgTimePerInspection: number
  }>
  failureAnalysis: Array<{
    templateItem: string
    failureCount: number
    failureRate: number
    category: string
  }>
}

interface QCAnalyticsDashboardProps {
  timeRange?: '7d' | '30d' | '90d'
}

export function QCAnalyticsDashboard({ timeRange = '30d' }: QCAnalyticsDashboardProps) {
  const { toast } = useToast()
  const [analytics, setAnalytics] = useState<QCAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)

  useEffect(() => {
    fetchAnalytics()
  }, [selectedTimeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get('/qc/summary', {
        params: { timeRange: selectedTimeRange }
      })
      
      if (response.data.success) {
        setAnalytics(response.data.analytics)
      }
    } catch (error: any) {
      console.error('Error fetching QC analytics:', error)
      toast({
        title: "Error",
        description: "Failed to load QC analytics",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTrend = (value: number) => {
    const isPositive = value >= 0
    const icon = isPositive ? TrendingUp : TrendingDown
    const color = isPositive ? 'text-green-500' : 'text-red-500'
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        {React.createElement(icon, { className: 'w-4 h-4' })}
        <span className="text-sm font-medium">
          {Math.abs(value).toFixed(1)}%
        </span>
      </div>
    )
  }

  const getPerformanceColor = (value: number, type: 'passRate' | 'efficiency') => {
    if (type === 'passRate') {
      if (value >= 95) return 'text-green-600'
      if (value >= 85) return 'text-yellow-600'
      return 'text-red-600'
    } else {
      // For efficiency, lower time is better
      if (value <= 15) return 'text-green-600'
      if (value <= 30) return 'text-yellow-600'
      return 'text-red-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No analytics data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">QC Analytics Dashboard</h2>
          <p className="text-slate-600">Quality control performance metrics and insights</p>
        </div>
        <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Inspections</p>
                <p className="text-2xl font-bold">{analytics.overview.totalInspections}</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-slate-500">Today: {analytics.overview.inspectionsToday}</span>
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Overall Pass Rate</p>
                <p className="text-2xl font-bold">{analytics.overview.passRate.toFixed(1)}%</p>
                <div className="flex items-center mt-1">
                  {formatTrend(analytics.overview.trendsPassRate)}
                </div>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Time/Inspection</p>
                <p className="text-2xl font-bold">{Math.round(analytics.overview.avgTimePerInspection)}m</p>
                <div className="flex items-center mt-1">
                  {formatTrend(-analytics.overview.trendsAvgTime)}
                </div>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Inspectors</p>
                <p className="text-2xl font-bold">{analytics.inspectorPerformance.length}</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-slate-500">This period</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inspectors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inspectors">Inspector Performance</TabsTrigger>
          <TabsTrigger value="templates">Template Usage</TabsTrigger>
          <TabsTrigger value="failures">Failure Analysis</TabsTrigger>
          <TabsTrigger value="trends">Daily Trends</TabsTrigger>
        </TabsList>

        {/* Inspector Performance */}
        <TabsContent value="inspectors">
          <Card>
            <CardHeader>
              <CardTitle>Inspector Performance</CardTitle>
              <CardDescription>Individual inspector metrics and performance comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {analytics.inspectorPerformance.map((inspector) => (
                    <Card key={inspector.inspectorId} className="border-l-4 border-l-blue-400">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h4 className="font-medium">{inspector.inspectorName}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-slate-500">Total Inspections</p>
                                <p className="font-medium">{inspector.totalInspections}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">This Week</p>
                                <p className="font-medium">{inspector.inspectionsThisWeek}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">Pass Rate</p>
                                <p className={`font-medium ${getPerformanceColor(inspector.passRate, 'passRate')}`}>
                                  {inspector.passRate.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500">Avg Time</p>
                                <p className={`font-medium ${getPerformanceColor(inspector.avgTimePerInspection, 'efficiency')}`}>
                                  {Math.round(inspector.avgTimePerInspection)}m
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {inspector.passRate >= 95 && (
                              <Badge className="bg-green-100 text-green-700">
                                <Award className="w-3 h-3 mr-1" />
                                Top Performer
                              </Badge>
                            )}
                            {inspector.avgTimePerInspection <= 15 && (
                              <Badge className="bg-blue-100 text-blue-700">
                                <Zap className="w-3 h-3 mr-1" />
                                Efficient
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Usage */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Template Usage Statistics</CardTitle>
              <CardDescription>How frequently each QC template is used and their success rates</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {analytics.templateUsage.map((template) => (
                    <div key={template.templateId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{template.templateName}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>Used {template.usageCount} times</span>
                          <span>•</span>
                          <span className={getPerformanceColor(template.passRate, 'passRate')}>
                            {template.passRate.toFixed(1)}% pass rate
                          </span>
                          <span>•</span>
                          <span>Avg {Math.round(template.avgTimePerInspection)}m</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{template.usageCount}</div>
                        <div className="text-xs text-slate-500">inspections</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failure Analysis */}
        <TabsContent value="failures">
          <Card>
            <CardHeader>
              <CardTitle>Failure Analysis</CardTitle>
              <CardDescription>Most common failure points and areas for improvement</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {analytics.failureAnalysis.map((failure, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <h4 className="font-medium">{failure.templateItem}</h4>
                          <Badge variant="outline">{failure.category}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{failure.failureCount} failures</span>
                          <span>•</span>
                          <span className="text-red-600 font-medium">
                            {failure.failureRate.toFixed(1)}% failure rate
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-red-600">{failure.failureCount}</div>
                        <div className="text-xs text-slate-500">failures</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Trends */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Daily Trends</CardTitle>
              <CardDescription>Daily inspection volume and success rates over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {analytics.dailyTrends.map((day) => {
                    const passRate = day.totalInspections > 0 
                      ? (day.passedInspections / day.totalInspections) * 100 
                      : 0
                    
                    return (
                      <div key={day.date} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h4 className="font-medium">
                            {new Date(day.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span>{day.totalInspections} inspections</span>
                            {day.totalInspections > 0 && (
                              <>
                                <span>•</span>
                                <span className={getPerformanceColor(passRate, 'passRate')}>
                                  {passRate.toFixed(1)}% passed
                                </span>
                                <span>•</span>
                                <span>Avg {Math.round(day.avgTimePerInspection)}m</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <div className="text-sm font-medium text-green-600">{day.passedInspections}</div>
                            <div className="text-xs text-slate-500">passed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-red-600">{day.failedInspections}</div>
                            <div className="text-xs text-slate-500">failed</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}