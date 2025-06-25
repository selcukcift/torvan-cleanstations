"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  Settings,
  Lightbulb,
  Wrench,
  FileText,
  Camera,
  XCircle
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface ProductionTask {
  id: string
  taskId: string
  title: string
  description: string
  category: string
  estimatedTime: number
  completed: boolean
  notes?: string
  photos: string[]
  createdAt: string
}

interface ProductionTaskListProps {
  orderId: string
  orderConfig: any
  onTaskUpdate?: () => void
}

const categoryConfig = {
  sink_body: { 
    title: 'Sink Body Assembly', 
    icon: <Package className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700'
  },
  lighting: { 
    title: 'Lighting Systems', 
    icon: <Lightbulb className="w-4 h-4" />,
    color: 'bg-yellow-100 text-yellow-700'
  },
  faucet: { 
    title: 'Faucet & Plumbing', 
    icon: <Wrench className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-700'
  },
  control_system: { 
    title: 'Control Systems', 
    icon: <Settings className="w-4 h-4" />,
    color: 'bg-indigo-100 text-indigo-700'
  },
  basin: { 
    title: 'Basin Configuration', 
    icon: <Package className="w-4 h-4" />,
    color: 'bg-green-100 text-green-700'
  },
  accessory: { 
    title: 'Accessories', 
    icon: <Settings className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-700'
  },
  finishing: { 
    title: 'Finishing & Cleanup', 
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-700'
  }
}

export function ProductionTaskList({ orderId, orderConfig, onTaskUpdate }: ProductionTaskListProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<ProductionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null)
  const [taskNotes, setTaskNotes] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadTasks()
  }, [orderId])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get(`/production/tasks?orderId=${orderId}&category=production`)
      
      if (response.data.success) {
        setTasks(response.data.data.filter((task: any) => task.category !== 'testing'))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load production tasks",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      setUpdating(taskId)
      
      const response = await nextJsApiClient.put(`/production/tasks/${taskId}`, {
        completed,
        completedAt: completed ? new Date().toISOString() : null,
        notes: taskNotes
      })
      
      if (response.data.success) {
        toast({
          title: completed ? "Task Completed" : "Task Marked Incomplete",
          description: completed ? "Task marked as completed" : "Task marked as incomplete"
        })
        
        await loadTasks()
        onTaskUpdate?.()
        setSelectedTask(null)
        setTaskNotes("")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update task",
        variant: "destructive"
      })
    } finally {
      setUpdating(null)
    }
  }

  const handleTaskClick = (task: ProductionTask) => {
    setSelectedTask(task)
    setTaskNotes(task.notes || "")
  }

  const groupedTasks = tasks.reduce((groups, task) => {
    const category = task.category || 'other'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(task)
    return groups
  }, {} as Record<string, ProductionTask[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Clock className="w-6 h-6 animate-spin mr-2" />
        <span>Loading production tasks...</span>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No production tasks found. Click "Start Assembly" to generate tasks from the order configuration.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedTasks).map(([category, categoryTasks]) => {
        const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.finishing
        const completed = categoryTasks.filter(task => task.completed).length
        const total = categoryTasks.length
        
        return (
          <Card key={category}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {config.icon}
                  <CardTitle className="text-lg">{config.title}</CardTitle>
                  <Badge className={config.color}>
                    {completed}/{total} Complete
                  </Badge>
                </div>
                {completed === total && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-colors ${
                      task.completed ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleTaskClick(task)}
                  >
                    <Checkbox
                      checked={task.completed}
                      disabled={updating === task.id}
                      className="flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">{task.description}</p>
                      {task.estimatedTime && (
                        <p className="text-xs text-gray-500 mt-1">
                          Estimated time: {task.estimatedTime} minutes
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.notes && (
                        <FileText className="w-4 h-4 text-blue-600" />
                      )}
                      {task.photos?.length > 0 && (
                        <Camera className="w-4 h-4 text-green-600" />
                      )}
                      {task.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Task Detail Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedTask.title}</DialogTitle>
              <DialogDescription>{selectedTask.description}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Add notes about this task..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                {!selectedTask.completed ? (
                  <Button
                    onClick={() => handleTaskComplete(selectedTask.id, true)}
                    disabled={updating === selectedTask.id}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleTaskComplete(selectedTask.id, false)}
                    disabled={updating === selectedTask.id}
                    variant="outline"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Mark Incomplete
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setSelectedTask(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}