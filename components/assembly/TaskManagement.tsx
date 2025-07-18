"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { 
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Timer,
  Package,
  ClipboardCheck,
  Wrench,
  FileText
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { WorkInstructionViewer } from "./WorkInstructionViewer"
import { ToolRequirements } from "./ToolRequirements"
import { ProductionChecklistInterface } from "../production/ProductionChecklistInterface"
import { ConfigurationDrivenTasks } from "../production/ConfigurationDrivenTasks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AssemblyTask {
  id: string
  title: string
  description?: string
  instructions?: string[]
  completed: boolean
  required: boolean
  order?: number
  requiredTools?: string[]
  requiredParts?: string[]
  workInstructionId?: string
}

interface PackagingItem {
  id: string
  section: string
  item: string
  completed: boolean
  required: boolean
  isBasinSpecific?: boolean
  basinNumber?: number
}

interface WorkInstruction {
  id: string;
  title: string;
  steps: { stepNumber: number; title: string; description: string }[];
}

interface Part {
  partId: string;
  name: string;
}

interface Tool {
  id: string;
  name: string;
}

interface TaskManagementProps {
  orderId: string
  buildNumber?: string
  userRole?: string
  viewMode?: 'traditional' | 'enhanced' | 'checklist'
  onTaskSelect?: (taskId: string) => void
}

export function TaskManagement({
  orderId,
  buildNumber,
  userRole,
  viewMode = 'enhanced',
  onTaskSelect
}: TaskManagementProps) {
  const { user, isLoaded } = useUser()
  const { toast } = useToast()
  const [assemblyTasks, setAssemblyTasks] = useState<AssemblyTask[]>([])
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [completionProgress, setCompletionProgress] = useState(0)
  const [activeView, setActiveView] = useState<'tasks' | 'checklist' | 'configuration'>(
    viewMode === 'checklist' ? 'checklist' : 'tasks'
  )
  const [workInstructions, setWorkInstructions] = useState<WorkInstruction[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [tools, setTools] = useState<Tool[]>([])

  const fetchAssemblyData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch order details
      const orderResponse = await nextJsApiClient.get(`/orders/${orderId}`)
      if (orderResponse.data.success) {
        setOrderData(orderResponse.data.data)
        
        // Fetch dynamically generated tasks and packaging
        const tasksResponse = await nextJsApiClient.post('/v1/assembly/tasks/generate', {
          orderId,
          buildNumber: buildNumber || orderResponse.data.data.buildNumbers[0]
        })

        if (tasksResponse.data.success) {
          setAssemblyTasks(tasksResponse.data.tasks)
          setPackagingItems(tasksResponse.data.packaging)
          calculateProgress(tasksResponse.data.tasks, tasksResponse.data.packaging)
        } else {
          setError('Failed to generate assembly tasks')
        }

        // Fetch supporting data for dropdowns
        const [wiResponse, partsResponse, toolsResponse] = await Promise.all([
          nextJsApiClient.get('/v1/admin/work-instructions'),
          nextJsApiClient.get('/v1/parts'),
          nextJsApiClient.get('/v1/tools'),
        ]);
        setWorkInstructions(wiResponse.data.workInstructions);
        setParts(partsResponse.data.parts);
        setTools(toolsResponse.data.tools);

      } else {
        setError('Failed to fetch order details')
      }
    } catch (error) {
      console.error('Error fetching assembly data:', error)
      setError('Error loading assembly data')
    } finally {
      setLoading(false)
    }
  }, [orderId, buildNumber])

  useEffect(() => {
    fetchAssemblyData()
  }, [fetchAssemblyData])

  const calculateProgress = (tasks: AssemblyTask[], packaging: PackagingItem[]) => {
    const allItems = [...tasks, ...packaging]
    const completedItems = allItems.filter(item => item.completed).length
    const totalItems = allItems.length
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
    setCompletionProgress(progress)
  }

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    setAssemblyTasks(prev => {
      const updatedTasks = prev.map(task => 
        task.id === taskId ? { ...task, completed } : task
      )
      calculateProgress(updatedTasks, packagingItems)
      return updatedTasks
    })
  }

  const handlePackagingToggle = (itemId: string, completed: boolean) => {
    setPackagingItems(prev => {
      const updatedPackaging = prev.map(item => 
        item.id === itemId ? { ...item, completed } : item
      )
      calculateProgress(assemblyTasks, updatedPackaging)
      return updatedPackaging
    })
  }

  const handleCompleteAssembly = async () => {
    if (completionProgress < 100) {
      toast({
        title: "Assembly Incomplete",
        description: "Please complete all assembly tasks and packaging items before submitting for QC",
        variant: "destructive"
      })
      return
    }
    
    setSubmitting(true)
    try {
      const response = await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus: "READY_FOR_FINAL_QC",
        notes: "Assembly and packaging completed by assembler"
      })
      
      if (response.data.success) {
        toast({
          title: "Assembly Complete",
          description: "Order has been submitted for Final QC"
        })
      }
    } catch (error) {
      console.error('Error completing assembly:', error)
      toast({
        title: "Error",
        description: "Failed to complete assembly",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const canEdit = () => {
    return userRole === 'ADMIN' || userRole === 'PRODUCTION_COORDINATOR' || userRole === 'ASSEMBLER'
  }

  const handleChecklistComplete = (checklistData: any) => {
    toast({
      title: "Production Checklist Complete",
      description: "Digital checklist has been completed and signed off"
    })
    
    // Update order status to indicate checklist completion
    updateOrderStatus('TESTING_COMPLETE')
  }

  const handleConfigurationTaskComplete = () => {
    toast({
      title: "Configuration Tasks Complete",
      description: "All configuration-driven tasks have been completed"
    })
    
    // Move to checklist view or next step
    setActiveView('checklist')
  }

  const updateOrderStatus = async (newStatus: string) => {
    try {
      const response = await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus,
        notes: `Status updated from TaskManagement - ${newStatus}`
      })
      
      if (response.data.success) {
        // Refresh order data
        fetchAssemblyData()
      }
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading assembly workflow...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="task-management">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {viewMode === 'enhanced' ? 'Enhanced Production Workflow' : 'Guided Assembly Workflow'}
          </h2>
          <p className="text-muted-foreground">
            {viewMode === 'enhanced' 
              ? 'Configuration-driven tasks and digital checklists for' 
              : 'Step-by-step assembly process for'
            } Order {orderData?.poNumber || orderId}
            {buildNumber && ` - Build #${buildNumber}`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1">
            {Math.round(completionProgress)}% Complete
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAssemblyData}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Enhanced View Mode Navigation */}
      {viewMode === 'enhanced' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-1">
              <Button
                variant={activeView === 'configuration' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('configuration')}
              >
                <Wrench className="w-4 h-4 mr-2" />
                Configuration Tasks
              </Button>
              <Button
                variant={activeView === 'checklist' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('checklist')}
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Production Checklist
              </Button>
              <Button
                variant={activeView === 'tasks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('tasks')}
              >
                <Package className="w-4 h-4 mr-2" />
                Traditional Tasks
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Views Content */}
      {viewMode === 'enhanced' && activeView === 'configuration' && (
        <ConfigurationDrivenTasks
          orderId={orderId}
          buildNumber={buildNumber}
          orderConfiguration={orderData?.configurations?.[buildNumber || orderData?.buildNumbers?.[0]]}
          bomData={orderData?.bomData}
          onTaskUpdate={(taskId, updates) => {
            console.log('Configuration task updated:', taskId, updates)
            onTaskSelect?.(taskId)
          }}
          onAllTasksComplete={handleConfigurationTaskComplete}
          readonly={!canEdit()}
        />
      )}

      {viewMode === 'enhanced' && activeView === 'checklist' && (
        <ProductionChecklistInterface
          orderId={orderId}
          buildNumber={buildNumber}
          orderConfiguration={orderData?.configurations?.[buildNumber || orderData?.buildNumbers?.[0]]}
          onComplete={handleChecklistComplete}
          readonly={!canEdit()}
        />
      )}

      {/* Traditional/Enhanced Tasks View */}
      {(viewMode !== 'enhanced' || activeView === 'tasks') && (
        <>
          {/* Progress Overview */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Assembly Progress
          </CardTitle>
          <CardDescription>
            Complete all assembly tasks and packaging items to submit for Final QC
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span data-testid="progress-text">{Math.round(completionProgress)}%</span>
              </div>
              <Progress value={completionProgress} className="h-2" data-testid="assembly-progress" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Assembly Tasks:</span>
                <span className="ml-2">
                  {assemblyTasks.filter(t => t.completed).length} / {assemblyTasks.length}
                </span>
              </div>
              <div>
                <span className="font-medium">Packaging Items:</span>
                <span className="ml-2">
                  {packagingItems.filter(p => p.completed).length} / {packagingItems.length}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assembly Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Assembly Tasks
          </CardTitle>
          <CardDescription>
            Complete each assembly task in order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assemblyTasks.map((task, index) => (
              <Collapsible key={task.id} data-testid="assembly-task">
                <CollapsibleTrigger asChild data-testid="task-trigger">
                  <Card className={`cursor-pointer transition-colors hover:bg-accent ${
                    task.completed ? 'bg-green-50 border-green-200' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={(checked) => 
                              canEdit() && handleTaskToggle(task.id, checked as boolean)
                            }
                            disabled={!canEdit()}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <h4 className="font-medium">{task.title}</h4>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {task.completed && <CheckCircle className="w-4 h-4 text-green-600" />}
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Card className="ml-6">
                    <CardContent className="p-4">
                      {task.workInstructionId && (
                        <div className="mb-4">
                          <h5 className="font-medium mb-2">Work Instruction:</h5>
                          <Select value={task.workInstructionId} onValueChange={(value) => {
                            // Handle change if needed, though for now it's display only
                          }}>
                            <SelectTrigger className="w-[240px]">
                              <SelectValue placeholder="Select a Work Instruction" />
                            </SelectTrigger>
                            <SelectContent>
                              {workInstructions.map(wi => (
                                <SelectItem key={wi.id} value={wi.id}>{wi.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {task.requiredTools && task.requiredTools.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium mb-2">Required Tools:</h5>
                          <div className="flex flex-wrap gap-2">
                            {task.requiredTools.map((toolId, idx) => {
                              const tool = tools.find(t => t.id === toolId);
                              return <Badge key={idx} variant="outline">{tool ? tool.name : toolId}</Badge>
                            })}
                          </div>
                        </div>
                      )}
                      
                      {task.requiredParts && task.requiredParts.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2">Required Parts:</h5>
                          <div className="flex flex-wrap gap-2">
                            {task.requiredParts.map((partId, idx) => {
                              const part = parts.find(p => p.partId === partId);
                              return <Badge key={idx} variant="secondary">{part ? part.name : partId}</Badge>
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Packaging Checklist - Section 4 from CLP.T2.001.V01 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Packaging Checklist
          </CardTitle>
          <CardDescription>
            Final packaging and verification items from CLP.T2.001.V01 Section 4
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {packagingItems.map((item) => (
              <div key={item.id} className={`flex items-start space-x-3 p-3 rounded-lg border ${
                item.completed ? 'bg-green-50 border-green-200' : 'bg-white'
              }`} data-testid="packaging-item">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) => 
                    canEdit() && handlePackagingToggle(item.id, checked as boolean)
                  }
                  disabled={!canEdit()}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.item}</p>
                      <p className="text-sm text-muted-foreground">{item.section}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.required && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                      {item.isBasinSpecific && (
                        <Badge variant="outline" className="text-xs">Basin Specific</Badge>
                      )}
                      {item.completed && <CheckCircle className="w-4 h-4 text-green-600" />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Completion Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Complete Assembly
          </CardTitle>
          <CardDescription>
            Once all tasks and packaging items are complete, submit for Final QC
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Assembly Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Assembly Tasks:</span>
                  <span className={`ml-2 font-medium ${
                    assemblyTasks.every(t => t.completed) ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {assemblyTasks.filter(t => t.completed).length} / {assemblyTasks.length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Packaging Items:</span>
                  <span className={`ml-2 font-medium ${
                    packagingItems.filter(p => p.required).every(p => p.completed) ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {packagingItems.filter(p => p.completed && p.required).length} / {packagingItems.filter(p => p.required).length}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ready to Submit for Final QC?</p>
                <p className="text-sm text-muted-foreground">
                  {completionProgress === 100 
                    ? 'All required tasks and packaging items are complete'
                    : `${Math.round(100 - completionProgress)}% remaining to complete`
                  }
                </p>
              </div>
              
              <Button
                onClick={handleCompleteAssembly}
                disabled={completionProgress < 100 || submitting || !canEdit()}
                className="min-w-[200px]"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Complete Assembly & Send to QC
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  )
}