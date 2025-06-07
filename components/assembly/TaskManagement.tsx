"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
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
  workInstruction?: {
    id: string
    title: string
    steps: string[]
  }
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

interface TaskManagementProps {
  orderId: string
  userRole?: string
}

export function TaskManagement({ orderId, userRole }: TaskManagementProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [assemblyTasks, setAssemblyTasks] = useState<AssemblyTask[]>([])
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [completionProgress, setCompletionProgress] = useState(0)

  const fetchAssemblyData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch order details
      const orderResponse = await nextJsApiClient.get(`/orders/${orderId}`)
      if (orderResponse.data.success) {
        setOrderData(orderResponse.data.data)
        
        // Generate assembly tasks based on order configuration
        const tasks = generateAssemblyTasks(orderResponse.data.data)
        setAssemblyTasks(tasks)
        
        // Generate packaging checklist from CLP.T2.001.V01 Section 4
        const packaging = generatePackagingChecklist(orderResponse.data.data)
        setPackagingItems(packaging)
        
        calculateProgress(tasks, packaging)
      } else {
        setError('Failed to fetch order details')
      }
    } catch (error) {
      console.error('Error fetching assembly data:', error)
      setError('Error loading assembly data')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchAssemblyData()
  }, [fetchAssemblyData])

  const generateAssemblyTasks = (order: any): AssemblyTask[] => {
    const tasks: AssemblyTask[] = []
    
    // Basic assembly tasks based on order configuration
    tasks.push({
      id: 'check-dimensions',
      title: 'Check Final Sink Dimensions & BOM',
      description: 'Verify dimensions of the entire sink, each basin, and any other dimension mentioned on the drawing',
      completed: false,
      required: true,
      order: 1
    })
    
    tasks.push({
      id: 'attach-documents',
      title: 'Attach Final Approved Drawing and Paperwork',
      description: 'Ensure all documentation is properly attached and accessible',
      completed: false,
      required: true,
      order: 2
    })
    
    // Pegboard installation if applicable
    if (order.configurations) {
      tasks.push({
        id: 'pegboard-installation',
        title: 'Pegboard Installation',
        description: 'Install pegboard and verify dimensions match drawing',
        completed: false,
        required: true,
        order: 3
      })
    }
    
    // Sink faucet holes and mounting
    tasks.push({
      id: 'faucet-holes',
      title: 'Verify Sink Faucet Holes and Mounting',
      description: 'Check that location of sink faucet holes and mounting holes match drawing/customer order requirements',
      completed: false,
      required: true,
      order: 4
    })
    
    // Mobility components
    tasks.push({
      id: 'mobility-components',
      title: 'Install Mobility Components',
      description: 'Install lock & levelling castors or levelling feet as specified',
      completed: false,
      required: true,
      order: 5,
      requiredParts: ['T2-LEVELING-CASTOR-475', 'T2-SEISMIC-FEET']
    })
    
    return tasks
  }

  const generatePackagingChecklist = (order: any): PackagingItem[] => {
    // Section 4 items from CLP.T2.001.V01
    return [
      { id: 'anti-fatigue-mat', section: 'STANDARD ITEMS', item: 'Anti-Fatigue Mat', completed: false, required: true },
      { id: 'sink-strainer', section: 'STANDARD ITEMS', item: 'Sink strainer per sink bowl (lasered with Torvan Medical logo)', completed: false, required: true },
      { id: 'flex-hose', section: 'STANDARD ITEMS', item: 'Ø1.5 Flex Hose (4ft) per sink drain + 2x Hose Clamps', completed: false, required: true },
      { id: 'temp-sensor', section: 'STANDARD ITEMS', item: '1x Temp. Sensor packed per E-Drain basin', completed: false, required: true, isBasinSpecific: true },
      { id: 'drain-solenoid', section: 'STANDARD ITEMS', item: '1x Electronic Drain Solenoid per Basin (Wired, tested and labelled)', completed: false, required: true },
      { id: 'drain-assembly', section: 'STANDARD ITEMS', item: '1x Drain assembly per basin', completed: false, required: true },
      { id: 'dosing-shelf', section: 'STANDARD ITEMS', item: '1x shelf for dosing pump', completed: false, required: false },
      { id: 'tubeset', section: 'STANDARD ITEMS', item: '1x Tubeset per dosing pump', completed: false, required: false },
      { id: 'drain-gasket', section: 'STANDARD ITEMS', item: 'Drain gasket per basin', completed: false, required: true },
      { id: 'install-manual-en', section: 'STANDARD ITEMS', item: 'Install & Operations Manual: IFU.T2.SinkInstUser', completed: false, required: true },
      { id: 'install-manual-fr', section: 'STANDARD ITEMS', item: 'Install & Operations Manual French: IFU.T2.SinkInstUserFR', completed: false, required: false },
      { id: 'esink-manual-fr', section: 'STANDARD ITEMS', item: 'E-Sink Automation Manual French: IFU.T2.ESinkInstUserFR', completed: false, required: false }
    ]
  }

  const calculateProgress = (tasks: AssemblyTask[], packaging: PackagingItem[]) => {
    const allItems = [...tasks, ...packaging]
    const completedItems = allItems.filter(item => item.completed).length
    const totalItems = allItems.length
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
    setCompletionProgress(progress)
  }

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    setAssemblyTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed } : task
    ))
    
    // Recalculate progress
    const updatedTasks = assemblyTasks.map(task => 
      task.id === taskId ? { ...task, completed } : task
    )
    calculateProgress(updatedTasks, packagingItems)
  }

  const handlePackagingToggle = (itemId: string, completed: boolean) => {
    setPackagingItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed } : item
    ))
    
    // Recalculate progress
    const updatedPackaging = packagingItems.map(item => 
      item.id === itemId ? { ...item, completed } : item
    )
    calculateProgress(assemblyTasks, updatedPackaging)
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
        newStatus: "ReadyForFinalQC",
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
          <h2 className="text-2xl font-bold tracking-tight">Guided Assembly Workflow</h2>
          <p className="text-muted-foreground">
            Step-by-step assembly process for Order {orderData?.poNumber || orderId}
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
                      {task.instructions && (
                        <div className="mb-4">
                          <h5 className="font-medium mb-2">Instructions:</h5>
                          <ul className="space-y-1 text-sm">
                            {task.instructions.map((instruction, idx) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <span className="text-muted-foreground">{idx + 1}.</span>
                                <span>{instruction}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {task.requiredTools && task.requiredTools.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium mb-2">Required Tools:</h5>
                          <div className="flex flex-wrap gap-2">
                            {task.requiredTools.map((tool, idx) => (
                              <Badge key={idx} variant="outline">{tool}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {task.requiredParts && task.requiredParts.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2">Required Parts:</h5>
                          <div className="flex flex-wrap gap-2">
                            {task.requiredParts.map((part, idx) => (
                              <Badge key={idx} variant="secondary">{part}</Badge>
                            ))}
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
    </div>
  )
}