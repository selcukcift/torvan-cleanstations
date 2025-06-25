"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Users, Plus, Clock, CheckCircle, AlertTriangle, User, Wrench } from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface AssemblyTask {
  id: string
  title: string
  description: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
  assigneeId?: string
  assigneeName?: string
  estimatedHours?: number
  dueDate?: string
  bomItemIds?: string[]
  workInstructions?: string
  createdAt: string
  createdBy: string
}

interface TaskAssignmentSystemProps {
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
  }>
  onTaskUpdate?: () => void
}

interface User {
  id: string
  fullName: string
  role: string
  assignedTaskIds: string[]
}

const TASK_PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'outline' as const },
  { value: 'NORMAL', label: 'Normal', color: 'secondary' as const },
  { value: 'HIGH', label: 'High', color: 'default' as const },
  { value: 'URGENT', label: 'Urgent', color: 'destructive' as const }
]

const TASK_STATUSES = [
  { value: 'PENDING', label: 'Pending', icon: Clock },
  { value: 'ASSIGNED', label: 'Assigned', icon: User },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: Wrench },
  { value: 'COMPLETED', label: 'Completed', icon: CheckCircle },
  { value: 'BLOCKED', label: 'Blocked', icon: AlertTriangle }
]

export function TaskAssignmentSystem({
  orderId,
  orderData,
  bomItems = [],
  onTaskUpdate
}: TaskAssignmentSystemProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<AssemblyTask[]>([])
  const [assemblers, setAssemblers] = useState<User[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<AssemblyTask | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Create task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'NORMAL' as any,
    estimatedHours: '',
    dueDate: '',
    bomItemIds: [] as string[],
    workInstructions: ''
  })

  // Assignment form state
  const [assignmentData, setAssignmentData] = useState({
    assigneeId: '',
    notes: ''
  })

  const loadTasks = async () => {
    try {
      const response = await nextJsApiClient.get(`/orders/${orderId}/tasks`)
      if (response.data.success) {
        setTasks(response.data.data || [])
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const loadAssemblers = async () => {
    try {
      const response = await nextJsApiClient.get('/users?role=ASSEMBLER')
      if (response.data.success) {
        setAssemblers(response.data.data || [])
      }
    } catch (error) {
      console.error('Error loading assemblers:', error)
    }
  }

  useEffect(() => {
    Promise.all([loadTasks(), loadAssemblers()]).finally(() => setIsLoading(false))
  }, [orderId])

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !newTask.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and description are required",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await nextJsApiClient.post(`/orders/${orderId}/tasks`, {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        estimatedHours: newTask.estimatedHours ? parseFloat(newTask.estimatedHours) : undefined,
        dueDate: newTask.dueDate || undefined,
        bomItemIds: newTask.bomItemIds,
        workInstructions: newTask.workInstructions
      })

      if (response.data.success) {
        toast({
          title: "Task Created",
          description: `Assembly task "${newTask.title}" has been created`,
        })

        setIsCreateDialogOpen(false)
        setNewTask({
          title: '',
          description: '',
          priority: 'NORMAL',
          estimatedHours: '',
          dueDate: '',
          bomItemIds: [],
          workInstructions: ''
        })
        loadTasks()
        onTaskUpdate?.()
      }
    } catch (error) {
      console.error('Error creating task:', error)
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      })
    }
  }

  const handleAssignTask = async () => {
    if (!selectedTask || !assignmentData.assigneeId) {
      toast({
        title: "Validation Error",
        description: "Please select an assembler",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await nextJsApiClient.put(`/orders/${orderId}/tasks/${selectedTask.id}/assign`, {
        assigneeId: assignmentData.assigneeId,
        notes: assignmentData.notes
      })

      if (response.data.success) {
        const assignee = assemblers.find(a => a.id === assignmentData.assigneeId)
        toast({
          title: "Task Assigned",
          description: `Task assigned to ${assignee?.fullName}`,
        })

        setIsAssignDialogOpen(false)
        setSelectedTask(null)
        setAssignmentData({ assigneeId: '', notes: '' })
        loadTasks()
        onTaskUpdate?.()
      }
    } catch (error) {
      console.error('Error assigning task:', error)
      toast({
        title: "Error",
        description: "Failed to assign task",
        variant: "destructive"
      })
    }
  }

  const getPriorityBadge = (priority: string) => {
    const config = TASK_PRIORITIES.find(p => p.value === priority)
    return (
      <Badge variant={config?.color as "default" | "destructive" | "outline" | "secondary" | null | undefined} className="text-xs">
        {config?.label || priority}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    const config = TASK_STATUSES.find(s => s.value === status)
    const IconComponent = config?.icon || Clock
    return <IconComponent className="h-4 w-4" />
  }

  const getWorkloadSummary = (assemblerId: string) => {
    const assignedTasks = tasks.filter(task => 
      task.assigneeId === assemblerId && 
      ['ASSIGNED', 'IN_PROGRESS'].includes(task.status)
    )
    return assignedTasks.length
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading tasks...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assembly Task Management
          </CardTitle>
          <CardDescription>
            Create and assign assembly tasks for order {orderData.poNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Total Tasks:</span>
                <span className="ml-1 font-medium">{tasks.length}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Pending:</span>
                <span className="ml-1 font-medium">{tasks.filter(t => t.status === 'PENDING').length}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">In Progress:</span>
                <span className="ml-1 font-medium">{tasks.filter(t => t.status === 'IN_PROGRESS').length}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Completed:</span>
                <span className="ml-1 font-medium">{tasks.filter(t => t.status === 'COMPLETED').length}</span>
              </div>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create Assembly Task</DialogTitle>
                  <DialogDescription>
                    Create a new assembly task for order {orderData.poNumber}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-title">Task Title *</Label>
                      <Input
                        id="task-title"
                        value={newTask.title}
                        onChange={(e) => setNewTask(prev => ({...prev, title: e.target.value}))}
                        placeholder="e.g., Assemble main sink body"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-priority">Priority</Label>
                      <Select value={newTask.priority} onValueChange={(value) => setNewTask(prev => ({...prev, priority: value as any}))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_PRIORITIES.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="task-description">Description *</Label>
                    <Textarea
                      id="task-description"
                      value={newTask.description}
                      onChange={(e) => setNewTask(prev => ({...prev, description: e.target.value}))}
                      placeholder="Detailed description of the assembly task"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimated-hours">Estimated Hours</Label>
                      <Input
                        id="estimated-hours"
                        type="number"
                        step="0.5"
                        value={newTask.estimatedHours}
                        onChange={(e) => setNewTask(prev => ({...prev, estimatedHours: e.target.value}))}
                        placeholder="e.g., 2.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due-date">Due Date</Label>
                      <Input
                        id="due-date"
                        type="datetime-local"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask(prev => ({...prev, dueDate: e.target.value}))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="work-instructions">Work Instructions</Label>
                    <Textarea
                      id="work-instructions"
                      value={newTask.workInstructions}
                      onChange={(e) => setNewTask(prev => ({...prev, workInstructions: e.target.value}))}
                      placeholder="Specific instructions for completing this task"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTask}>
                    Create Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No assembly tasks created yet</p>
                <p className="text-sm">Create tasks to organize assembly work</p>
              </div>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.title}</span>
                          {getPriorityBadge(task.priority)}
                          <Badge variant="outline" className="gap-1">
                            {getStatusIcon(task.status)}
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {task.assigneeName && (
                            <div>
                              <span className="text-muted-foreground">Assigned to:</span>
                              <p className="font-medium">{task.assigneeName}</p>
                            </div>
                          )}
                          
                          {task.estimatedHours && (
                            <div>
                              <span className="text-muted-foreground">Est. Hours:</span>
                              <p className="font-medium">{task.estimatedHours}h</p>
                            </div>
                          )}
                          
                          {task.dueDate && (
                            <div>
                              <span className="text-muted-foreground">Due:</span>
                              <p className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>

                        {task.workInstructions && (
                          <div className="mt-2">
                            <span className="text-muted-foreground text-xs">Instructions:</span>
                            <p className="text-sm">{task.workInstructions}</p>
                          </div>
                        )}
                      </div>

                      {task.status === 'PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task)
                            setIsAssignDialogOpen(true)
                          }}
                          className="ml-4"
                        >
                          Assign
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>
              Assign "{selectedTask?.title}" to an assembler
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Assembler *</Label>
              <Select value={assignmentData.assigneeId} onValueChange={(value) => setAssignmentData(prev => ({...prev, assigneeId: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an assembler" />
                </SelectTrigger>
                <SelectContent>
                  {assemblers.map((assembler) => (
                    <SelectItem key={assembler.id} value={assembler.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{assembler.fullName}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {getWorkloadSummary(assembler.id)} active
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-notes">Assignment Notes</Label>
              <Textarea
                id="assignment-notes"
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData(prev => ({...prev, notes: e.target.value}))}
                placeholder="Additional notes for the assignee"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-6">
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignTask}
              disabled={!assignmentData.assigneeId}
            >
              Assign Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}