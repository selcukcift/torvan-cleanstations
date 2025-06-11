"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  CheckCircle,
  Clock,
  AlertTriangle,
  ClipboardCheck,
  Package,
  Calendar,
  User,
  TrendingUp,
  ArrowRight
} from "lucide-react"
import { format } from "date-fns"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { QCAnalyticsDashboard } from "@/components/qc/QCAnalyticsDashboard"

interface QCTask {
  id: string
  orderId: string
  poNumber: string
  customerName: string
  productFamily: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string
  templateId: string
  templateName: string
  assignedAt: string
  completedAt?: string
  notes?: string
}

interface QCStats {
  totalInspections: number
  completedToday: number
  pendingTasks: number
  passRate: number
  avgTimePerInspection: number
}

export function QCPersonDashboard() {
  const { toast } = useToast()
  const router = useRouter()
  const [qcTasks, setQcTasks] = useState<QCTask[]>([])
  const [stats, setStats] = useState<QCStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pending")

  useEffect(() => {
    fetchQCData()
  }, [])

  const fetchQCData = async () => {
    try {
      setLoading(true)
      const [tasksResponse, statsResponse] = await Promise.all([
        nextJsApiClient.get('/qc/tasks'),
        nextJsApiClient.get('/qc/summary')
      ])

      if (tasksResponse.data.success) {
        setQcTasks(tasksResponse.data.tasks)
      }
      
      if (statsResponse.data.success) {
        setStats(statsResponse.data.summary)
      }
    } catch (error: any) {
      console.error('Error fetching QC data:', error)
      toast({
        title: "Error",
        description: "Failed to load QC dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStartQC = async (orderId: string) => {
    router.push(`/orders/${orderId}/qc`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700'
      case 'COMPLETED':
        return 'bg-green-100 text-green-700'
      case 'FAILED':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500 text-white'
      case 'HIGH':
        return 'bg-orange-500 text-white'
      case 'MEDIUM':
        return 'bg-yellow-500 text-white'
      case 'LOW':
        return 'bg-green-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const filterTasksByStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return qcTasks.filter(task => task.status === 'PENDING')
      case 'in-progress':
        return qcTasks.filter(task => task.status === 'IN_PROGRESS')
      case 'completed':
        return qcTasks.filter(task => ['COMPLETED', 'FAILED'].includes(task.status))
      default:
        return qcTasks
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-16 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pending Tasks</p>
                  <p className="text-2xl font-bold">{stats.pendingTasks}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Completed Today</p>
                  <p className="text-2xl font-bold">{stats.completedToday}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pass Rate</p>
                  <p className="text-2xl font-bold">{stats.passRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Avg Time</p>
                  <p className="text-2xl font-bold">{Math.round(stats.avgTimePerInspection)}m</p>
                </div>
                <ClipboardCheck className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QC Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>QC Inspection Tasks</CardTitle>
          <CardDescription>Manage your quality control inspections</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                Pending ({filterTasksByStatus('pending').length})
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress ({filterTasksByStatus('in-progress').length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({filterTasksByStatus('completed').length})
              </TabsTrigger>
              <TabsTrigger value="analytics">
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filterTasksByStatus('pending').map((task) => (
                    <Card key={task.id} className={`border-l-4 ${
                      isOverdue(task.dueDate) ? 'border-l-red-500' : 
                      task.priority === 'URGENT' ? 'border-l-red-400' :
                      task.priority === 'HIGH' ? 'border-l-orange-400' : 'border-l-blue-400'
                    }`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">PO: {task.poNumber}</h4>
                              <Badge className={getPriorityColor(task.priority)} variant="secondary">
                                {task.priority}
                              </Badge>
                              {isOverdue(task.dueDate) && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {task.customerName}
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                {task.productFamily}
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Due: {format(new Date(task.dueDate), "MMM dd, yyyy")}
                              </div>
                              <div className="flex items-center gap-2">
                                <ClipboardCheck className="w-4 h-4" />
                                {task.templateName}
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => handleStartQC(task.orderId)}
                            className="ml-4"
                          >
                            Start QC
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filterTasksByStatus('pending').length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p>No pending QC tasks</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="in-progress" className="space-y-4 mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filterTasksByStatus('in-progress').map((task) => (
                    <Card key={task.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">PO: {task.poNumber}</h4>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {task.customerName}
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                {task.productFamily}
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => handleStartQC(task.orderId)}
                            variant="outline"
                            className="ml-4"
                          >
                            Continue QC
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filterTasksByStatus('in-progress').length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p>No QC tasks in progress</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filterTasksByStatus('completed').map((task) => (
                    <Card key={task.id} className={`border-l-4 ${
                      task.status === 'COMPLETED' ? 'border-l-green-500' : 'border-l-red-500'
                    }`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">PO: {task.poNumber}</h4>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {task.customerName}
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Completed: {task.completedAt ? format(new Date(task.completedAt), "MMM dd, yyyy") : 'N/A'}
                              </div>
                            </div>
                            
                            {task.notes && (
                              <p className="text-sm text-slate-600 mt-2">{task.notes}</p>
                            )}
                          </div>
                          
                          <Button 
                            onClick={() => router.push(`/orders/${task.orderId}`)}
                            variant="outline"
                            size="sm"
                            className="ml-4"
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filterTasksByStatus('completed').length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p>No completed QC tasks</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <QCAnalyticsDashboard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}