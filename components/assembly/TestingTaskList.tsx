"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  CheckCircle,
  Clock,
  AlertCircle,
  TestTube,
  Thermometer,
  Droplets,
  Zap,
  Settings,
  FileText,
  XCircle
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface TestingTask {
  id: string
  taskId: string
  title: string
  description: string
  category: string
  testType: 'pass_fail' | 'measurement' | 'calibration' | 'setup'
  expectedResult?: string
  unit?: string
  minValue?: number
  maxValue?: number
  completed: boolean
  testResult?: 'PASS' | 'FAIL'
  measuredValue?: number
  notes?: string
  basinNumber?: number
  createdAt: string
}

interface TestingTaskListProps {
  orderId: string
  orderConfig: any
  onTaskUpdate?: () => void
}

const categoryConfig = {
  setup: { 
    title: 'Test Setup', 
    icon: <Settings className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-700'
  },
  calibration: { 
    title: 'Calibration', 
    icon: <Thermometer className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700'
  },
  general: { 
    title: 'General Tests', 
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-yellow-100 text-yellow-700'
  },
  e_drain: { 
    title: 'E-Drain Tests', 
    icon: <Droplets className="w-4 h-4" />,
    color: 'bg-cyan-100 text-cyan-700'
  },
  e_sink: { 
    title: 'E-Sink Tests', 
    icon: <TestTube className="w-4 h-4" />,
    color: 'bg-indigo-100 text-indigo-700'
  }
}

export function TestingTaskList({ orderId, orderConfig, onTaskUpdate }: TestingTaskListProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<TestingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TestingTask | null>(null)
  const [testResult, setTestResult] = useState<'PASS' | 'FAIL' | ''>('')
  const [measuredValue, setMeasuredValue] = useState('')
  const [taskNotes, setTaskNotes] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadTasks()
  }, [orderId])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get(`/production/tasks?orderId=${orderId}&category=testing`)
      
      if (response.data.success) {
        setTasks(response.data.data.filter((task: any) => task.category === 'testing'))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load testing tasks",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    if (!selectedTask) return
    
    // Validate test results for pass/fail and measurement tasks
    if (completed && selectedTask.testType === 'pass_fail' && !testResult) {
      toast({
        title: "Test Result Required",
        description: "Please select PASS or FAIL for this test",
        variant: "destructive"
      })
      return
    }
    
    if (completed && selectedTask.testType === 'measurement' && !measuredValue) {
      toast({
        title: "Measurement Required",
        description: "Please enter the measured value for this test",
        variant: "destructive"
      })
      return
    }

    try {
      setUpdating(taskId)
      
      const updateData: any = {
        completed,
        completedAt: completed ? new Date().toISOString() : null,
        notes: taskNotes
      }
      
      if (completed) {
        if (selectedTask.testType === 'pass_fail') {
          updateData.testResult = testResult
        }
        if (selectedTask.testType === 'measurement') {
          updateData.measuredValue = parseFloat(measuredValue)
          // Auto-determine pass/fail based on range
          if (selectedTask.minValue !== undefined && selectedTask.maxValue !== undefined) {
            const value = parseFloat(measuredValue)
            updateData.testResult = (value >= selectedTask.minValue && value <= selectedTask.maxValue) ? 'PASS' : 'FAIL'
          }
        }
      }
      
      const response = await nextJsApiClient.put(`/production/tasks/${taskId}`, updateData)
      
      if (response.data.success) {
        toast({
          title: completed ? "Test Completed" : "Test Reset",
          description: completed ? "Test result recorded" : "Test marked as incomplete"
        })
        
        await loadTasks()
        onTaskUpdate?.()
        setSelectedTask(null)
        resetForm()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update test",
        variant: "destructive"
      })
    } finally {
      setUpdating(null)
    }
  }

  const resetForm = () => {
    setTestResult('')
    setMeasuredValue('')
    setTaskNotes('')
  }

  const handleTaskClick = (task: TestingTask) => {
    setSelectedTask(task)
    setTestResult(task.testResult || '')
    setMeasuredValue(task.measuredValue?.toString() || '')
    setTaskNotes(task.notes || "")
  }

  const groupedTasks = tasks.reduce((groups, task) => {
    const category = task.category || 'general'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(task)
    return groups
  }, {} as Record<string, TestingTask[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Clock className="w-6 h-6 animate-spin mr-2" />
        <span>Loading testing tasks...</span>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No testing tasks found. Testing tasks will be generated when you start assembly.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedTasks).map(([category, categoryTasks]) => {
        const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.general
        const completed = categoryTasks.filter(task => task.completed).length
        const total = categoryTasks.length
        const failed = categoryTasks.filter(task => task.testResult === 'FAIL').length
        
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
                  {failed > 0 && (
                    <Badge variant="destructive">
                      {failed} Failed
                    </Badge>
                  )}
                </div>
                {completed === total && failed === 0 && (
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
                      task.completed 
                        ? task.testResult === 'FAIL' 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-green-50 border-green-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleTaskClick(task)}
                  >
                    <Checkbox
                      checked={task.completed}
                      disabled={updating === task.id}
                      className="flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${task.completed ? 'line-through' : ''}`}>
                          {task.title}
                        </h4>
                        {task.basinNumber && (
                          <Badge variant="outline" className="text-xs">
                            Basin {task.basinNumber}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{task.description}</p>
                      {task.expectedResult && (
                        <p className="text-xs text-gray-500 mt-1">
                          Expected: {task.expectedResult}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.notes && (
                        <FileText className="w-4 h-4 text-blue-600" />
                      )}
                      {task.completed ? (
                        task.testResult === 'FAIL' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )
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

      {/* Test Detail Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedTask.title}</DialogTitle>
              <DialogDescription>{selectedTask.description}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedTask.expectedResult && (
                <div>
                  <Label className="text-sm font-medium">Expected Result</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedTask.expectedResult}</p>
                </div>
              )}
              
              {selectedTask.testType === 'pass_fail' && (
                <div>
                  <Label className="text-sm font-medium">Test Result</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant={testResult === 'PASS' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTestResult('PASS')}
                      className="flex-1"
                    >
                      PASS
                    </Button>
                    <Button
                      variant={testResult === 'FAIL' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => setTestResult('FAIL')}
                      className="flex-1"
                    >
                      FAIL
                    </Button>
                  </div>
                </div>
              )}
              
              {selectedTask.testType === 'measurement' && (
                <div>
                  <Label className="text-sm font-medium">
                    Measured Value {selectedTask.unit && `(${selectedTask.unit})`}
                  </Label>
                  <Input
                    type="number"
                    value={measuredValue}
                    onChange={(e) => setMeasuredValue(e.target.value)}
                    placeholder="Enter measured value"
                    className="mt-1"
                  />
                  {selectedTask.minValue !== undefined && selectedTask.maxValue !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">
                      Acceptable range: {selectedTask.minValue} - {selectedTask.maxValue} {selectedTask.unit}
                    </p>
                  )}
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium">Notes</Label>
                <Textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Add notes about this test..."
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
                    Record Test
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleTaskComplete(selectedTask.id, false)}
                    disabled={updating === selectedTask.id}
                    variant="outline"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reset Test
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