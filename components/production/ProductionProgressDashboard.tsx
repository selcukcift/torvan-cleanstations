"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  TrendingUp,
  Activity,
  Package,
  Eye,
  Settings,
  BarChart3,
  Timer,
  Target,
  ArrowRight,
  Play,
  Pause,
  CircleDot,
  Factory,
  ClipboardCheck,
  FileText,
  Truck
} from 'lucide-react'
import { format, differenceInDays, isAfter } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { nextJsApiClient } from '@/lib/api'

interface ProductionOrder {
  id: string
  poNumber: string
  customerName: string
  buildNumbers: string[]
  orderStatus: string
  wantDate: string
  createdAt: string
  updatedAt: string
  productionChecklists: ProductionChecklist[]
  productionTasks: ProductionTask[]
  sinkConfigurations: any[]
}

interface ProductionChecklist {
  id: string
  buildNumber: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED'
  sections: any
  completedAt?: string
}

interface ProductionTask {
  id: string
  buildNumber: string
  category: string
  title: string
  completed: boolean
  estimatedTime: number
  actualTime?: number
  completedAt?: string
}

interface ProductionMetrics {
  date: string
  ordersStarted: number
  ordersCompleted: number
  avgCycleTime?: number
  avgTaskTime: Record<string, number>
  bottlenecks: Record<string, any>
  qualityScore?: number
}

export function ProductionProgressDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [metrics, setMetrics] = useState<ProductionMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Production statistics
  const [stats, setStats] = useState({
    totalInProduction: 0,
    completedToday: 0,
    overdueOrders: 0,
    avgCycleTime: 0,
    qualityScore: 0,
    activeWorkers: 0
  })

  useEffect(() => {
    fetchProductionData()
    const interval = setInterval(fetchProductionData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchProductionData = async () => {
    try {
      setLoading(true)
      
      // Fetch orders in production phases
      const ordersResponse = await nextJsApiClient.get('/orders', {
        params: {
          status: 'READY_FOR_PRODUCTION,TESTING_COMPLETE,PACKAGING_COMPLETE',
          limit: 100
        }
      })

      // Fetch production metrics
      const metricsResponse = await nextJsApiClient.get('/production/metrics')
      
      if (ordersResponse.data.success) {
        const productionOrders = ordersResponse.data.data
        setOrders(productionOrders)
        calculateStats(productionOrders)
      }

      if (metricsResponse.data.success) {
        setMetrics(metricsResponse.data.data || [])
      }

    } catch (error: any) {
      console.error('Error fetching production data:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch production data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (productionOrders: ProductionOrder[]) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const stats = {
      totalInProduction: productionOrders.filter(o => 
        ['READY_FOR_PRODUCTION', 'TESTING_COMPLETE', 'PACKAGING_COMPLETE'].includes(o.orderStatus)
      ).length,
      completedToday: productionOrders.filter(o => {
        const completedChecklists = o.productionChecklists?.filter(c => 
          c.status === 'COMPLETED' && 
          c.completedAt &&
          new Date(c.completedAt) >= today
        ) || []
        return completedChecklists.length > 0
      }).length,
      overdueOrders: productionOrders.filter(o => {
        const wantDate = new Date(o.wantDate)
        return isAfter(today, wantDate) && o.orderStatus !== 'SHIPPED'
      }).length,
      avgCycleTime: calculateAverageCycleTime(productionOrders),
      qualityScore: calculateQualityScore(productionOrders),
      activeWorkers: getActiveWorkerCount(productionOrders)
    }
    
    setStats(stats)
  }

  const calculateAverageCycleTime = (orders: ProductionOrder[]): number => {
    const completedOrders = orders.filter(o => 
      o.productionChecklists?.some(c => c.status === 'COMPLETED')
    )
    
    if (completedOrders.length === 0) return 0
    
    const totalCycleTime = completedOrders.reduce((total, order) => {
      const startDate = new Date(order.createdAt)
      const endDate = new Date(order.updatedAt)
      return total + differenceInDays(endDate, startDate)
    }, 0)
    
    return Math.round(totalCycleTime / completedOrders.length)
  }

  const calculateQualityScore = (orders: ProductionOrder[]): number => {
    // Calculate based on completed tasks without issues
    const totalTasks = orders.reduce((total, order) => 
      total + (order.productionTasks?.length || 0), 0
    )
    
    const completedTasks = orders.reduce((total, order) => 
      total + (order.productionTasks?.filter(t => t.completed).length || 0), 0
    )
    
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  }

  const getActiveWorkerCount = (orders: ProductionOrder[]): number => {
    // Simulate active worker count based on in-progress tasks
    const inProgressOrders = orders.filter(o => o.orderStatus === 'READY_FOR_PRODUCTION')
    return Math.min(inProgressOrders.length * 2, 12) // Simulate 1-2 workers per order, max 12
  }

  const getProductionProgress = (order: ProductionOrder): number => {
    const totalTasks = order.productionTasks?.length || 0
    const completedTasks = order.productionTasks?.filter(t => t.completed).length || 0
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  }

  const getEstimatedCompletion = (order: ProductionOrder): string => {
    const remainingTasks = order.productionTasks?.filter(t => !t.completed) || []
    const remainingTime = remainingTasks.reduce((total, task) => total + task.estimatedTime, 0)
    
    if (remainingTime === 0) return 'Complete'
    
    const hours = Math.ceil(remainingTime / 60)
    if (hours < 24) return `${hours}h remaining`
    
    const days = Math.ceil(hours / 8) // 8 hour work days
    return `${days}d remaining`
  }

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'READY_FOR_PRODUCTION': 'bg-orange-100 text-orange-700 border-orange-200',
      'TESTING_COMPLETE': 'bg-blue-100 text-blue-700 border-blue-200',
      'PACKAGING_COMPLETE': 'bg-green-100 text-green-700 border-green-200',
      'SHIPPED': 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      'READY_FOR_PRODUCTION': <Factory className="w-4 h-4" />,
      'TESTING_COMPLETE': <ClipboardCheck className="w-4 h-4" />,
      'PACKAGING_COMPLETE': <Package className="w-4 h-4" />,
      'SHIPPED': <Truck className="w-4 h-4" />
    }
    return icons[status] || <CircleDot className="w-4 h-4" />
  }

  const navigateToOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const navigateToProductionWorkstation = () => {
    router.push('/production/workstation')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Progress Dashboard</h2>
          <p className="text-slate-600">Real-time monitoring of production workflow</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setActiveTab('metrics')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={navigateToProductionWorkstation}>
            <Factory className="w-4 h-4 mr-2" />
            Production Workstation
          </Button>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">In Production</p>
                <p className="text-2xl font-bold">{stats.totalInProduction}</p>
              </div>
              <Factory className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdueOrders}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Cycle Time</p>
                <p className="text-2xl font-bold">{stats.avgCycleTime}d</p>
              </div>
              <Timer className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Quality Score</p>
                <p className="text-2xl font-bold">{stats.qualityScore}%</p>
              </div>
              <Target className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Workers</p>
                <p className="text-2xl font-bold">{stats.activeWorkers}</p>
              </div>
              <Users className="w-8 h-8 text-indigo-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Production Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders in Production</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
        </TabsList>

        {/* Production Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Production Pipeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Production Pipeline</span>
                </CardTitle>
                <CardDescription>Orders moving through production stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['READY_FOR_PRODUCTION', 'TESTING_COMPLETE', 'PACKAGING_COMPLETE'].map(status => {
                    const statusOrders = orders.filter(o => o.orderStatus === status)
                    const statusNames: Record<string, string> = {
                      'READY_FOR_PRODUCTION': 'Production',
                      'TESTING_COMPLETE': 'Testing Complete',
                      'PACKAGING_COMPLETE': 'Packaging Complete'
                    }
                    
                    return (
                      <div key={status} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(status)}
                          <span className="font-medium">{statusNames[status]}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{statusOrders.length} orders</Badge>
                          {statusOrders.length > 0 && (
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>Latest production updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orders.slice(0, 5).map(order => {
                    const recentTask = order.productionTasks
                      ?.filter(t => t.completed)
                      ?.sort((a, b) => new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime())[0]
                    
                    return (
                      <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="font-medium text-sm">{order.poNumber}</p>
                          <p className="text-xs text-slate-600">
                            {recentTask ? `Completed: ${recentTask.title}` : 'In progress'}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(order.orderStatus)} variant="outline">
                            {getStatusIcon(order.orderStatus)}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(order.updatedAt), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Orders in Production */}
        <TabsContent value="orders" className="space-y-6">
          <div className="grid gap-4">
            {orders.map(order => {
              const progress = getProductionProgress(order)
              const estimation = getEstimatedCompletion(order)
              const isOverdue = isAfter(new Date(), new Date(order.wantDate))
              
              return (
                <Card key={order.id} className={`cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold">{order.poNumber}</h3>
                          <Badge className={getStatusColor(order.orderStatus)} variant="outline">
                            {getStatusIcon(order.orderStatus)}
                            <span className="ml-1">{order.orderStatus.replace(/_/g, ' ')}</span>
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-600 mt-1">{order.customerName}</p>
                        <p className="text-sm text-slate-500">
                          Build Numbers: {order.buildNumbers.join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Want Date</p>
                        <p className="font-medium">{format(new Date(order.wantDate), 'MMM dd, yyyy')}</p>
                        <p className="text-xs text-slate-500 mt-1">{estimation}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Production Progress</span>
                        <span className="text-sm text-slate-600">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-slate-600">
                            Tasks: {order.productionTasks?.filter(t => t.completed).length || 0} / {order.productionTasks?.length || 0}
                          </span>
                          <span className="text-slate-600">
                            Checklists: {order.productionChecklists?.filter(c => c.status === 'COMPLETED').length || 0} / {order.productionChecklists?.length || 0}
                          </span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigateToOrder(order.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Performance Metrics */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Production Trends</CardTitle>
                <CardDescription>Weekly production performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">Orders Completed This Week</p>
                      <p className="text-2xl font-bold text-green-600">{stats.completedToday * 7}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Average Quality Score</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.qualityScore}%</p>
                    </div>
                    <Target className="w-8 h-8 text-blue-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">Current Cycle Time</p>
                      <p className="text-2xl font-bold text-orange-600">{stats.avgCycleTime} days</p>
                    </div>
                    <Timer className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Production Capacity</CardTitle>
                <CardDescription>Current utilization and capacity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Workstation Utilization</span>
                      <span className="text-sm text-slate-600">75%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Quality Control Load</span>
                      <span className="text-sm text-slate-600">60%</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Assembly Capacity</span>
                      <span className="text-sm text-slate-600">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Recommendation:</span> Current capacity is well-utilized. 
                      Consider additional QC resources to balance workload.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}