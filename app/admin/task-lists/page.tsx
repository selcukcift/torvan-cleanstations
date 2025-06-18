"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  List,
  Loader2,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface TaskListItem {
  id?: string
  taskNumber: number
  title: string
  description?: string
  workInstructionId?: string
  estimatedDuration?: number
  requiredToolIds?: string[]
  requiredPartIds?: string[]
  dependencies?: string[]
  workInstruction?: {
    id: string
    title: string
  }
  requiredTools?: Array<{
    id: string
    name: string
  }>
  requiredParts?: Array<{
    id: string
    partNumber: string
    description: string
  }>
}

interface TaskList {
  id?: string
  name: string
  description?: string
  assemblyType: string
  isActive: boolean
  tasks: TaskListItem[]
  createdAt?: string
  updatedAt?: string
}

interface WorkInstruction {
  id: string
  title: string
}

interface Tool {
  id: string
  name: string
}

interface Part {
  id: string
  partNumber: string
  description: string
}

const ASSEMBLY_TYPES = [
  'MDRD_B1_ESINK',
  'MDRD_B2_ESINK', 
  'MDRD_B3_ESINK',
  'MDRD_B1_ISINK',
  'MDRD_B2_ISINK',
  'MDRD_B3_ISINK',
  'CUSTOM_SINK'
]

export default function TaskListsPage() {
  const { toast } = useToast()
  const [taskLists, setTaskLists] = useState<TaskList[]>([])
  const [editingTaskList, setEditingTaskList] = useState<TaskList | null>(null)
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showTaskListDialog, setShowTaskListDialog] = useState(false)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  
  // Reference data
  const [workInstructions, setWorkInstructions] = useState<WorkInstruction[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [parts, setParts] = useState<Part[]>([])
  
  // Search and filtered data
  const [toolSearch, setToolSearch] = useState('')
  const [partSearch, setPartSearch] = useState('')
  const [filteredTools, setFilteredTools] = useState<Tool[]>([])
  const [filteredParts, setFilteredParts] = useState<Part[]>([])

  useEffect(() => {
    fetchTaskLists()
    fetchReferenceData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setFilteredTools(
      tools.filter(tool => 
        tool.name.toLowerCase().includes(toolSearch.toLowerCase())
      ).slice(0, 10)
    )
  }, [tools, toolSearch])

  useEffect(() => {
    setFilteredParts(
      parts.filter(part => 
        part.partNumber.toLowerCase().includes(partSearch.toLowerCase()) ||
        part.description.toLowerCase().includes(partSearch.toLowerCase())
      ).slice(0, 10)
    )
  }, [parts, partSearch])

  const fetchTaskLists = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get('/v1/admin/task-lists')
      
      if (response.data.success) {
        setTaskLists(response.data.taskLists)
      }
    } catch (error) {
      console.error('Error fetching task lists:', error)
      toast({
        title: "Error",
        description: "Failed to load task lists",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchReferenceData = async () => {
    try {
      // Fetch work instructions
      const instructionsResponse = await nextJsApiClient.get('/v1/admin/work-instructions')
      if (instructionsResponse.data.success) {
        setWorkInstructions(instructionsResponse.data.instructions)
      }

      // TODO: Fetch tools and parts when APIs are implemented
      // For now, use mock data
      setTools([
        { id: '1', name: 'Screwdriver Set' },
        { id: '2', name: 'Wrench Set' },
        { id: '3', name: 'Drill' },
        { id: '4', name: 'Level' },
        { id: '5', name: 'Measuring Tape' }
      ])

      setParts([
        { id: '1', partNumber: 'P-001', description: 'Basin Drain Assembly' },
        { id: '2', partNumber: 'P-002', description: 'Faucet Mount' },
        { id: '3', partNumber: 'P-003', description: 'LED Light Strip' },
        { id: '4', partNumber: 'P-004', description: 'Mounting Bracket' },
        { id: '5', partNumber: 'P-005', description: 'Rubber Gasket' }
      ])
    } catch (error) {
      console.error('Error fetching reference data:', error)
    }
  }

  const handleCreateTaskList = () => {
    const newTaskList: TaskList = {
      name: "",
      description: "",
      assemblyType: "MDRD_B1_ESINK",
      isActive: true,
      tasks: []
    }
    setEditingTaskList(newTaskList)
    setShowTaskListDialog(true)
  }

  const handleEditTaskList = (taskList: TaskList) => {
    setEditingTaskList({ ...taskList })
    setShowTaskListDialog(true)
  }

  const handleSaveTaskList = async () => {
    if (!editingTaskList) return

    if (!editingTaskList.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Task list name is required",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)
      
      if (editingTaskList.id) {
        // Update existing task list
        const response = await nextJsApiClient.put(`/v1/admin/task-lists/${editingTaskList.id}`, editingTaskList)
        if (response.data.success) {
          toast({
            title: "Success",
            description: "Task list updated successfully"
          })
        }
      } else {
        // Create new task list
        const response = await nextJsApiClient.post('/v1/admin/task-lists', editingTaskList)
        if (response.data.success) {
          toast({
            title: "Success",
            description: "Task list created successfully"
          })
        }
      }
      
      setShowTaskListDialog(false)
      setEditingTaskList(null)
      await fetchTaskLists()
    } catch (error) {
      console.error('Error saving task list:', error)
      toast({
        title: "Error",
        description: "Failed to save task list",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTaskList = async (taskListId: string) => {
    try {
      const response = await nextJsApiClient.delete(`/v1/admin/task-lists/${taskListId}`)
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Task list deleted successfully"
        })
        await fetchTaskLists()
      }
    } catch (error) {
      console.error('Error deleting task list:', error)
      toast({
        title: "Error",
        description: "Failed to delete task list",
        variant: "destructive"
      })
    }
  }

  const handleAddTask = () => {
    if (!editingTaskList) return

    const newTask: TaskListItem = {
      taskNumber: editingTaskList.tasks.length + 1,
      title: "",
      description: "",
      estimatedDuration: 30,
      requiredToolIds: [],
      requiredPartIds: [],
      dependencies: []
    }

    setEditingTask(newTask)
    setShowTaskDialog(true)
  }

  const handleEditTask = (task: TaskListItem) => {
    setEditingTask({ ...task })
    setShowTaskDialog(true)
  }

  const handleSaveTask = () => {
    if (!editingTask || !editingTaskList) return

    if (!editingTask.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required",
        variant: "destructive"
      })
      return
    }

    const updatedTasks = [...editingTaskList.tasks]
    const existingIndex = updatedTasks.findIndex(task => task.id === editingTask.id)
    
    if (existingIndex >= 0) {
      updatedTasks[existingIndex] = editingTask
    } else {
      updatedTasks.push({ ...editingTask, id: `temp-${Date.now()}` })
    }

    setEditingTaskList({
      ...editingTaskList,
      tasks: updatedTasks
    })

    setShowTaskDialog(false)
    setEditingTask(null)
  }

  const handleDeleteTask = (taskId: string) => {
    if (!editingTaskList) return

    const updatedTasks = editingTaskList.tasks.filter(task => task.id !== taskId)
    // Renumber tasks
    updatedTasks.forEach((task, index) => {
      task.taskNumber = index + 1
    })

    setEditingTaskList({
      ...editingTaskList,
      tasks: updatedTasks
    })
  }

  const handleMoveTask = (taskId: string, direction: 'up' | 'down') => {
    if (!editingTaskList) return

    const tasks = [...editingTaskList.tasks]
    const index = tasks.findIndex(task => task.id === taskId)
    
    if (index === -1) return
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= tasks.length) return

    // Swap tasks
    const temp = tasks[index]
    tasks[index] = tasks[newIndex]
    tasks[newIndex] = temp

    // Update task numbers
    tasks.forEach((task, idx) => {
      task.taskNumber = idx + 1
    })

    setEditingTaskList({
      ...editingTaskList,
      tasks
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Lists</h1>
          <p className="text-slate-600">Create and manage assembly task sequences</p>
        </div>
        <Button onClick={handleCreateTaskList} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Task List
        </Button>
      </div>

      {/* Task Lists Table */}
      <Card>
        <CardHeader>
          <CardTitle>Task Lists</CardTitle>
          <CardDescription>{taskLists.length} task lists available</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Assembly Type</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskLists.map((taskList) => (
                <TableRow key={taskList.id}>
                  <TableCell className="font-medium">{taskList.name}</TableCell>
                  <TableCell>{taskList.assemblyType}</TableCell>
                  <TableCell>{taskList.tasks.length}</TableCell>
                  <TableCell>
                    {taskList.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {taskList.createdAt ? new Date(taskList.createdAt).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTaskList(taskList)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Task List</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &ldquo;{taskList.name}&rdquo;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => taskList.id && handleDeleteTaskList(taskList.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {taskLists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    <List className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No task lists created yet</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Task List Create/Edit Dialog */}
      <Dialog open={showTaskListDialog} onOpenChange={setShowTaskListDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTaskList?.id ? 'Edit Task List' : 'Create New Task List'}
            </DialogTitle>
            <DialogDescription>
              Create a sequence of tasks for assembly operations
            </DialogDescription>
          </DialogHeader>
          
          {editingTaskList && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tasklist-name">Name *</Label>
                  <Input
                    id="tasklist-name"
                    value={editingTaskList.name}
                    onChange={(e) => setEditingTaskList({
                      ...editingTaskList,
                      name: e.target.value
                    })}
                    placeholder="e.g., T2 Single Basin Assembly"
                  />
                </div>
                
                <div>
                  <Label htmlFor="assembly-type">Assembly Type *</Label>
                  <Select
                    value={editingTaskList.assemblyType}
                    onValueChange={(value) => setEditingTaskList({
                      ...editingTaskList,
                      assemblyType: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSEMBLY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="tasklist-description">Description</Label>
                <Textarea
                  id="tasklist-description"
                  value={editingTaskList.description || ''}
                  onChange={(e) => setEditingTaskList({
                    ...editingTaskList,
                    description: e.target.value
                  })}
                  placeholder="Brief description of this task list"
                />
              </div>
              
              {/* Tasks */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Tasks ({editingTaskList.tasks.length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTask}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Task
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {editingTaskList.tasks
                    .sort((a, b) => a.taskNumber - b.taskNumber)
                    .map((task) => (
                      <div key={task.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">#{task.taskNumber}</span>
                              <span className="font-medium">{task.title}</span>
                              {task.estimatedDuration && (
                                <Badge variant="outline" className="text-xs">
                                  {task.estimatedDuration}min
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-sm text-slate-600 space-y-1">
                              {task.description && <p>{task.description}</p>}
                              {task.workInstruction && (
                                <p><strong>Work Instruction:</strong> {task.workInstruction.title}</p>
                              )}
                              {task.requiredToolIds && task.requiredToolIds.length > 0 && (
                                <p><strong>Tools:</strong> {task.requiredToolIds.length} required</p>
                              )}
                              {task.requiredPartIds && task.requiredPartIds.length > 0 && (
                                <p><strong>Parts:</strong> {task.requiredPartIds.length} required</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveTask(task.id!, 'up')}
                              disabled={task.taskNumber === 1}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveTask(task.id!, 'down')}
                              disabled={task.taskNumber === editingTaskList.tasks.length}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task.id!)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {editingTaskList.tasks.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <List className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p>No tasks added yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskListDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTaskList} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingTaskList?.id ? 'Update' : 'Create'} Task List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Create/Edit Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTask?.id ? 'Edit Task' : 'Add New Task'}
            </DialogTitle>
            <DialogDescription>
              Configure task details and requirements
            </DialogDescription>
          </DialogHeader>
          
          {editingTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task-title">Title *</Label>
                  <Input
                    id="task-title"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({
                      ...editingTask,
                      title: e.target.value
                    })}
                    placeholder="e.g., Install basin drain"
                  />
                </div>
                
                <div>
                  <Label htmlFor="task-duration">Estimated Duration (minutes)</Label>
                  <Input
                    id="task-duration"
                    type="number"
                    value={editingTask.estimatedDuration || ''}
                    onChange={(e) => setEditingTask({
                      ...editingTask,
                      estimatedDuration: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="30"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({
                    ...editingTask,
                    description: e.target.value
                  })}
                  placeholder="Detailed description of the task"
                />
              </div>
              
              <div>
                <Label htmlFor="work-instruction">Work Instruction</Label>
                <Select
                  value={editingTask.workInstructionId || 'none'}
                  onValueChange={(value) => setEditingTask({
                    ...editingTask,
                    workInstructionId: value === 'none' ? undefined : value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a work instruction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No work instruction</SelectItem>
                    {workInstructions.map((instruction) => (
                      <SelectItem key={instruction.id} value={instruction.id}>
                        {instruction.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask}>
              <Save className="w-4 h-4 mr-2" />
              {editingTask?.id ? 'Update' : 'Add'} Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}