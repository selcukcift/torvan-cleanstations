"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  Search,
  Plus,
  RefreshCw,
  Calendar,
  User,
  Wrench,
  FileText,
  BarChart3,
  Settings,
  ChevronRight,
  Timer,
  Users,
  TrendingUp
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { TaskTimer } from "./TaskTimer"
import { WorkInstructionViewer } from "./WorkInstructionViewer"
import { TaskDependencyGraph } from "./TaskDependencyGraph"
import { ToolRequirements } from "./ToolRequirements"

interface Task {
  id: string
  title: string
  description?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  estimatedMinutes?: number
  actualMinutes?: number
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  order: {
    id: string
    poNumber: string
    customerName: string
  }
  assignedTo?: {
    id: string
    fullName: string
    initials: string
  }
  workInstruction?: {
    id: string
    title: string
    version: string
  }
  dependencies: Array<{
    dependsOn: {
      id: string
      title: string
      status: string
    }
  }>
  dependents: Array<{
    task: {
      id: string
      title: string
      status: string
    }
  }>
  tools: Array<{
    tool: {
      id: string
      name: string
      category: string
    }
  }>
  notes: Array<{
    id: string
    content: string
    createdAt: string
    author: {
      fullName: string
      initials: string
    }
  }>
}

interface TaskFilters {
  status?: string
  priority?: string
  assignedToId?: string
  orderId?: string
  search?: string
}

interface TaskManagementProps {
  orderId?: string
  userRole?: string
}

export function TaskManagement({ orderId, userRole }: TaskManagementProps) {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TaskFilters>({})
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Task statistics
  const [taskStats, setTaskStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    blocked: 0,
    overdue: 0
  })

  const fetchTasks = useCallback(async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams()
      
      if (orderId) params.append('orderId', orderId)
      if (filters.status) params.append('status', filters.status)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.assignedToId) params.append('assignedToId', filters.assignedToId)
      if (filters.search) params.append('search', filters.search)
      params.append('limit', '50')

      const response = await nextJsApiClient.get(`/api/v1/assembly/tasks?${params.toString()}`)
      
      if (response.data.success) {
        const tasksData = response.data.data
        setTasks(tasksData)
        
        // Calculate statistics
        const stats = {
          total: tasksData.length,
          pending: tasksData.filter((t: Task) => t.status === 'PENDING').length,
          inProgress: tasksData.filter((t: Task) => t.status === 'IN_PROGRESS').length,
          completed: tasksData.filter((t: Task) => t.status === 'COMPLETED').length,
          blocked: tasksData.filter((t: Task) => t.status === 'BLOCKED').length,
          overdue: tasksData.filter((t: Task) => {
            if (!t.estimatedMinutes || !t.startedAt) return false
            const startTime = new Date(t.startedAt).getTime()
            const expectedEnd = startTime + (t.estimatedMinutes * 60 * 1000)
            return Date.now() > expectedEnd && t.status === 'IN_PROGRESS'
          }).length
        }
        setTaskStats(stats)
      } else {
        setError('Failed to fetch tasks')
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setError('Error loading tasks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [orderId, filters])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleStatusUpdate = async (taskId: string, newStatus: string, notes?: string) => {
    try {
      const response = await nextJsApiClient.put(`/api/v1/assembly/tasks/${taskId}/status`, {
        status: newStatus,
        notes,
        ...(newStatus === 'COMPLETED' && { actualMinutes: selectedTask?.actualMinutes })
      })

      if (response.data.success) {
        await fetchTasks()
        if (selectedTask?.id === taskId) {
          setSelectedTask(response.data.data)
        }
      } else {
        setError('Failed to update task status')
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      setError('Error updating task')
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await nextJsApiClient.patch(`/api/v1/assembly/tasks/${taskId}`, updates)

      if (response.data.success) {
        await fetchTasks()
        if (selectedTask?.id === taskId) {
          setSelectedTask(response.data.data)
        }
      } else {
        setError('Failed to update task')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      setError('Error updating task')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'BLOCKED': return 'bg-red-100 text-red-800'
      case 'CANCELLED': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'URGENT': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />
      case 'IN_PROGRESS': return <Play className="w-4 h-4" />
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />
      case 'BLOCKED': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const canEditTask = (task: Task) => {
    if (userRole === 'ADMIN' || userRole === 'PRODUCTION_COORDINATOR') return true
    if (userRole === 'ASSEMBLER' && task.assignedTo?.id === session?.user?.id) return true
    return false
  }

  const canStartTask = (task: Task) => {
    if (task.status !== 'PENDING') return false
    return task.dependencies.every(dep => dep.dependsOn.status === 'COMPLETED')
  }

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header with statistics */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Task Management</h2>
          <p className="text-muted-foreground">
            Manage assembly tasks and track progress
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTasks}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={!['ADMIN', 'PRODUCTION_COORDINATOR'].includes(userRole || '')}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{taskStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{taskStats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">In Progress</p>
                <p className="text-2xl font-bold">{taskStats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{taskStats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Blocked</p>
                <p className="text-2xl font-bold">{taskStats.blocked}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Overdue</p>
                <p className="text-2xl font-bold">{taskStats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>

            <Select value={filters.status || ''} onValueChange={(value) => setFilters({ ...filters, status: value || undefined })}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority || ''} onValueChange={(value) => setFilters({ ...filters, priority: value || undefined })}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setFilters({})}
              className="w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task List */}
            <Card>
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <Card
                        key={task.id}
                        className={`cursor-pointer transition-colors hover:bg-accent ${
                          selectedTask?.id === task.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedTask(task)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                {getStatusIcon(task.status)}
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge className={getStatusColor(task.status)}>
                                  {task.status.replace('_', ' ')}
                                </Badge>
                                <Badge className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-2">
                                {task.description}
                              </p>
                              
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{task.order.poNumber}</span>
                                </div>
                                
                                {task.assignedTo && (
                                  <div className="flex items-center space-x-1">
                                    <User className="w-3 h-3" />
                                    <span>{task.assignedTo.fullName}</span>
                                  </div>
                                )}
                                
                                {task.estimatedMinutes && (
                                  <div className="flex items-center space-x-1">
                                    <Timer className="w-3 h-3" />
                                    <span>{task.estimatedMinutes}m est.</span>
                                  </div>
                                )}

                                {task.tools.length > 0 && (
                                  <div className="flex items-center space-x-1">
                                    <Wrench className="w-3 h-3" />
                                    <span>{task.tools.length} tools</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Task Details */}
            <Card>
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
                <CardDescription>
                  {selectedTask ? `Details for "${selectedTask.title}"` : 'Select a task to view details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTask ? (
                  <div className="space-y-6">
                    {/* Task Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{selectedTask.title}</h3>
                        <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(selectedTask.status)}>
                          {selectedTask.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(selectedTask.priority)}>
                          {selectedTask.priority}
                        </Badge>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {canEditTask(selectedTask) && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.status === 'PENDING' && canStartTask(selectedTask) && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(selectedTask.id, 'IN_PROGRESS')}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start Task
                          </Button>
                        )}
                        
                        {selectedTask.status === 'IN_PROGRESS' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(selectedTask.id, 'PENDING')}
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(selectedTask.id, 'COMPLETED')}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Complete
                            </Button>
                          </>
                        )}

                        {selectedTask.status === 'BLOCKED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(selectedTask.id, 'PENDING')}
                          >
                            Unblock
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Time Tracking */}
                    {selectedTask.status === 'IN_PROGRESS' && (
                      <TaskTimer
                        task={selectedTask}
                        onTimeUpdate={(minutes) => handleTaskUpdate(selectedTask.id, { actualMinutes: minutes })}
                      />
                    )}

                    {/* Work Instructions */}
                    {selectedTask.workInstruction && (
                      <WorkInstructionViewer
                        workInstructionId={selectedTask.workInstruction.id}
                        currentTaskId={selectedTask.id}
                      />
                    )}

                    {/* Tool Requirements */}
                    {selectedTask.tools.length > 0 && (
                      <ToolRequirements tools={selectedTask.tools} />
                    )}

                    {/* Dependencies */}
                    {(selectedTask.dependencies.length > 0 || selectedTask.dependents.length > 0) && (
                      <div>
                        <h4 className="font-medium mb-2">Dependencies</h4>
                        <TaskDependencyGraph
                          taskId={selectedTask.id}
                          dependencies={selectedTask.dependencies}
                          dependents={selectedTask.dependents}
                        />
                      </div>
                    )}

                    {/* Notes */}
                    {selectedTask.notes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Notes</h4>
                        <div className="space-y-2">
                          {selectedTask.notes.slice(0, 3).map((note) => (
                            <div key={note.id} className="text-sm bg-muted p-2 rounded">
                              <p>{note.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {note.author.fullName} • {new Date(note.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <FileText className="w-8 h-8 mb-2" />
                    <p>Select a task to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kanban">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Kanban board view coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Timeline view coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="dependencies">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Dependencies view coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}