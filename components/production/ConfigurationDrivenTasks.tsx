"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  Wrench,
  Settings,
  FileText,
  RefreshCw
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface ProductionTask {
  id: string
  title: string
  description: string
  category: 'sink_body' | 'basin' | 'faucet' | 'accessory' | 'pegboard' | 'control_system' | 'packaging'
  priority: 'high' | 'medium' | 'low'
  estimatedTime: number // in minutes
  requiredParts: string[]
  requiredTools: string[]
  workInstructionId?: string
  dependencies: string[]
  isBasinSpecific?: boolean
  basinNumber?: number
  basinType?: string
  isConditional: boolean
  condition?: string
  completed: boolean
  completedAt?: string
  completedBy?: string
  notes?: string
  order: number
}

interface ConfigurationDrivenTasksProps {
  orderId: string
  buildNumber?: string
  orderConfiguration: any
  bomData?: any
  onTaskUpdate?: (taskId: string, updates: Partial<ProductionTask>) => void
  onAllTasksComplete?: () => void
  readonly?: boolean
}

export function ConfigurationDrivenTasks({
  orderId,
  buildNumber,
  orderConfiguration,
  bomData,
  onTaskUpdate,
  onAllTasksComplete,
  readonly = false
}: ConfigurationDrivenTasksProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<ProductionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sink_body']))
  const [completionProgress, setCompletionProgress] = useState(0)

  const categoryConfig = {
    sink_body: { 
      title: 'Sink Body Assembly', 
      icon: <Package className="w-5 h-5" />,
      color: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    pegboard: { 
      title: 'Pegboard Installation', 
      icon: <Settings className="w-5 h-5" />,
      color: 'bg-purple-100 text-purple-700 border-purple-200'
    },
    basin: { 
      title: 'Basin Configuration', 
      icon: <Package className="w-5 h-5" />,
      color: 'bg-green-100 text-green-700 border-green-200'
    },
    faucet: { 
      title: 'Faucet & Plumbing', 
      icon: <Wrench className="w-5 h-5" />,
      color: 'bg-orange-100 text-orange-700 border-orange-200'
    },
    control_system: { 
      title: 'Control Systems', 
      icon: <Settings className="w-5 h-5" />,
      color: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    },
    accessory: { 
      title: 'Accessories & Add-ons', 
      icon: <Wrench className="w-5 h-5" />,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    },
    packaging: { 
      title: 'Final Packaging', 
      icon: <Package className="w-5 h-5" />,
      color: 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const generatedTasks = useMemo(() => {
    if (!orderConfiguration) return []

    const taskList: ProductionTask[] = []
    let taskOrder = 1

    // Helper function to create a task
    const createTask = (
      id: string,
      title: string,
      description: string,
      category: ProductionTask['category'],
      options: Partial<ProductionTask> = {}
    ): ProductionTask => ({
      id,
      title,
      description,
      category,
      priority: 'medium',
      estimatedTime: 30,
      requiredParts: [],
      requiredTools: [],
      dependencies: [],
      isConditional: false,
      completed: false,
      order: taskOrder++,
      ...options
    })

    // 1. SINK BODY TASKS
    taskList.push(createTask(
      'sink-body-dimensions',
      'Verify Sink Body Dimensions',
      `Check sink dimensions match specification: ${orderConfiguration.sinkDimensions?.width || 'N/A'}" x ${orderConfiguration.sinkDimensions?.length || 'N/A'}"`,
      'sink_body',
      {
        priority: 'high',
        estimatedTime: 15,
        requiredTools: ['measuring_tape', 'calipers']
      }
    ))

    // Add legs installation task
    const legsType = orderConfiguration.legsType
    if (legsType) {
      const legsPart = legsType === 'Height Adjustable' 
        ? `T2-${orderConfiguration.legsModel}-KIT`
        : `T2-${orderConfiguration.legsModel}-FH-KIT`
      
      taskList.push(createTask(
        'install-legs',
        `Install ${legsType} Legs`,
        `Install ${legsType} legs (${orderConfiguration.legsModel}) with proper alignment and torque specifications`,
        'sink_body',
        {
          priority: 'high',
          estimatedTime: 45,
          requiredParts: [legsPart],
          requiredTools: ['socket_wrench', 'torque_wrench', 'level'],
          dependencies: ['sink-body-dimensions']
        }
      ))
    }

    // Add feet installation task
    const feetType = orderConfiguration.feetType
    if (feetType) {
      const feetPart = feetType === 'Lock & Leveling Casters' 
        ? 'T2-LEVELING-CASTOR-475'
        : 'T2-SEISMIC-FEET'
      
      taskList.push(createTask(
        'install-feet',
        `Install ${feetType}`,
        `Install and test ${feetType.toLowerCase()} for proper operation`,
        'sink_body',
        {
          priority: 'high',
          estimatedTime: 30,
          requiredParts: [feetPart],
          requiredTools: ['socket_wrench', 'level'],
          dependencies: ['install-legs']
        }
      ))
    }

    // 2. PEGBOARD TASKS (if applicable)
    if (orderConfiguration.hasPegboard) {
      taskList.push(createTask(
        'install-pegboard',
        'Install Pegboard System',
        `Install ${orderConfiguration.pegboardType} pegboard in ${orderConfiguration.pegboardColor} color`,
        'pegboard',
        {
          priority: 'high',
          estimatedTime: 60,
          requiredParts: [
            `T2-ADW-PB-${orderConfiguration.pegboardSize?.replace('x', '')}` || 'T2-ADW-PB-CUSTOM',
            'T-OA-PB-COLOR',
            orderConfiguration.pegboardType === 'Perforated' ? 'T2-ADW-PB-PERF-KIT' : 'T2-ADW-PB-SOLID-KIT'
          ],
          requiredTools: ['drill', 'screwdriver', 'level', 'measuring_tape'],
          dependencies: ['install-feet'],
          isConditional: true,
          condition: 'Pegboard selected in configuration'
        }
      ))

      taskList.push(createTask(
        'install-overhead-lighting',
        'Install Overhead LED Light System',
        'Mount overhead LED light bracket with plastic washers and connect control button',
        'pegboard',
        {
          priority: 'medium',
          estimatedTime: 45,
          requiredParts: ['T2-OHL-MDRD-KIT'],
          requiredTools: ['drill', 'screwdriver', 'wire_strippers'],
          dependencies: ['install-pegboard'],
          isConditional: true,
          condition: 'Pegboard with overhead lighting'
        }
      ))
    }

    // 3. BASIN TASKS
    orderConfiguration.basins?.forEach((basin: any, index: number) => {
      const basinNum = index + 1
      const basinId = `basin-${basinNum}`
      
      // Basin installation
      taskList.push(createTask(
        `${basinId}-install`,
        `Install Basin ${basinNum} (${basin.type})`,
        `Install ${basin.size || 'standard'} ${basin.type} basin with proper sealing and alignment`,
        'basin',
        {
          priority: 'high',
          estimatedTime: 90,
          requiredParts: [
            `T2-ADW-BASIN${basin.size?.replace('X', 'X')}` || 'T2-ADW-BASIN-CUSTOM',
            basin.type === 'E-Drain' ? 'T2-BSN-EDR-KIT' : 
            basin.type === 'E-Sink DI' ? 'T2-BSN-ESK-DI-KIT' : 'T2-BSN-ESK-KIT'
          ],
          requiredTools: ['socket_wrench', 'level', 'sealant_gun'],
          isBasinSpecific: true,
          basinNumber: basinNum,
          basinType: basin.type,
          dependencies: ['install-feet']
        }
      ))

      // Basin-specific tasks based on type
      if (basin.type === 'E-Drain') {
        taskList.push(createTask(
          `${basinId}-edrain-setup`,
          `E-Drain Basin ${basinNum} Setup`,
          'Install bottom-fill mixing valve, overflow sensor, and verify pipe labeling (Hot/Cold)',
          'basin',
          {
            priority: 'high',
            estimatedTime: 60,
            requiredParts: ['DER-1899-14-CC', 'overflow_sensor', 'pipe_labels'],
            requiredTools: ['pipe_wrench', 'teflon_tape', 'multimeter'],
            isBasinSpecific: true,
            basinNumber: basinNum,
            basinType: basin.type,
            dependencies: [`${basinId}-install`]
          }
        ))
      }

      if (basin.type === 'E-Sink' || basin.type === 'E-Sink DI') {
        taskList.push(createTask(
          `${basinId}-esink-setup`,
          `E-Sink Basin ${basinNum} Setup`,
          'Install mixing valve plate, emergency stop buttons, touchscreen, and dosing port',
          'basin',
          {
            priority: 'high',
            estimatedTime: 75,
            requiredParts: ['mixing_valve_plate', 'emergency_stop_button', 'touchscreen', 'dosing_port'],
            requiredTools: ['drill', 'screwdriver', 'wire_strippers', 'multimeter'],
            isBasinSpecific: true,
            basinNumber: basinNum,
            basinType: basin.type,
            dependencies: [`${basinId}-install`]
          }
        ))
      }

      // Basin add-ons
      if (basin.addOns?.includes('P-TRAP')) {
        taskList.push(createTask(
          `${basinId}-ptrap`,
          `Install P-Trap Disinfection Unit - Basin ${basinNum}`,
          'Install and test P-trap disinfection drain unit',
          'basin',
          {
            priority: 'medium',
            estimatedTime: 30,
            requiredParts: ['T2-OA-MS-1026'],
            requiredTools: ['pipe_wrench', 'teflon_tape'],
            isBasinSpecific: true,
            basinNumber: basinNum,
            dependencies: [`${basinId}-install`],
            isConditional: true,
            condition: 'P-Trap add-on selected'
          }
        ))
      }

      if (basin.addOns?.includes('BASIN_LIGHT')) {
        const lightPart = basin.type === 'E-Drain' ? 'T2-OA-BASIN-LIGHT-EDR-KIT' : 'T2-OA-BASIN-LIGHT-ESK-KIT'
        taskList.push(createTask(
          `${basinId}-light`,
          `Install Basin Light - Basin ${basinNum}`,
          'Install and test basin LED lighting system',
          'basin',
          {
            priority: 'low',
            estimatedTime: 20,
            requiredParts: [lightPart],
            requiredTools: ['screwdriver', 'wire_strippers'],
            isBasinSpecific: true,
            basinNumber: basinNum,
            dependencies: [`${basinId}-install`],
            isConditional: true,
            condition: 'Basin light add-on selected'
          }
        ))
      }
    })

    // 4. FAUCET TASKS
    orderConfiguration.faucets?.forEach((faucet: any, index: number) => {
      const faucetId = `faucet-${index + 1}`
      
      let faucetPart = ''
      switch (faucet.type) {
        case '10" WRIST BLADE SWING SPOUT WALL MOUNTED FAUCET KIT':
          faucetPart = 'T2-OA-STD-FAUCET-WB-KIT'
          break
        case 'PRE-RINSE OVERHEAD SPRAY UNIT KIT':
          faucetPart = 'T2-OA-PRE-RINSE-FAUCET-KIT'
          break
        case 'GOOSENECK TREATED WATER FAUCET KIT PVC':
          faucetPart = 'T2-OA-DI-GOOSENECK-FAUCET-KIT'
          break
      }

      taskList.push(createTask(
        faucetId,
        `Install ${faucet.type}`,
        `Install faucet at ${faucet.placement} position with proper water connections`,
        'faucet',
        {
          priority: 'high',
          estimatedTime: 45,
          requiredParts: [faucetPart],
          requiredTools: ['pipe_wrench', 'teflon_tape', 'adjustable_wrench'],
          dependencies: orderConfiguration.basins?.map((_: any, idx: number) => `basin-${idx + 1}-install`) || []
        }
      ))
    })

    // 5. SPRAYER/GUN TASKS
    orderConfiguration.sprayers?.forEach((sprayer: any, index: number) => {
      const sprayerId = `sprayer-${index + 1}`
      
      let sprayerPart = ''
      switch (sprayer.type) {
        case 'DI WATER GUN KIT & TURRET':
          sprayerPart = 'T2-OA-WATERGUN-TURRET-KIT'
          break
        case 'DI WATER GUN KIT & ROSETTE':
          sprayerPart = 'T2-OA-WATERGUN-ROSETTE-KIT'
          break
        case 'AIR GUN KIT & TURRET':
          sprayerPart = 'T2-OA-AIRGUN-TURRET-KIT'
          break
        case 'AIR GUN KIT & ROSETTE':
          sprayerPart = 'T2-OA-AIRGUN-ROSETTE-KIT'
          break
      }

      taskList.push(createTask(
        sprayerId,
        `Install ${sprayer.type}`,
        `Install sprayer system at ${sprayer.location} with proper connections`,
        'faucet',
        {
          priority: 'medium',
          estimatedTime: 30,
          requiredParts: [sprayerPart],
          requiredTools: ['drill', 'screwdriver', 'pipe_wrench'],
          dependencies: ['faucet-1'],
          isConditional: true,
          condition: 'Sprayer system selected'
        }
      ))
    })

    // 6. CONTROL SYSTEM TASKS
    const controlBoxPart = getControlBoxPart(orderConfiguration.basins)
    if (controlBoxPart) {
      taskList.push(createTask(
        'install-control-box',
        'Install Control Box System',
        `Install ${controlBoxPart} control box with proper wiring and testing`,
        'control_system',
        {
          priority: 'high',
          estimatedTime: 90,
          requiredParts: [controlBoxPart],
          requiredTools: ['screwdriver', 'wire_strippers', 'multimeter', 'cable_labels'],
          dependencies: orderConfiguration.basins?.map((_: any, idx: number) => `basin-${idx + 1}-install`) || []
        }
      ))
    }

    // 7. ACCESSORY TASKS
    orderConfiguration.accessories?.forEach((accessory: any, index: number) => {
      taskList.push(createTask(
        `accessory-${index + 1}`,
        `Install ${accessory.name}`,
        `Install and configure ${accessory.name} accessory`,
        'accessory',
        {
          priority: 'low',
          estimatedTime: 20,
          requiredParts: [accessory.partNumber || 'accessory_kit'],
          requiredTools: ['screwdriver', 'drill'],
          dependencies: ['install-control-box'],
          isConditional: true,
          condition: `${accessory.name} accessory selected`
        }
      ))
    })

    // 8. FINAL PACKAGING TASKS
    taskList.push(createTask(
      'final-cleanup',
      'Final Cleaning and Inspection',
      'Remove metal shavings, clean all surfaces, and perform final quality inspection',
      'packaging',
      {
        priority: 'high',
        estimatedTime: 30,
        requiredTools: ['cleaning_supplies', 'inspection_checklist'],
        dependencies: ['install-control-box']
      }
    ))

    taskList.push(createTask(
      'attach-logo',
      'Attach Torvan Medical Logo',
      'Install Torvan Medical logo on left side of sink',
      'packaging',
      {
        priority: 'medium',
        estimatedTime: 10,
        requiredParts: ['torvan_logo'],
        requiredTools: ['screwdriver'],
        dependencies: ['final-cleanup']
      }
    ))

    taskList.push(createTask(
      'final-packaging',
      'Final Packaging Preparation',
      'Prepare sink for final QC and packaging with all required documentation',
      'packaging',
      {
        priority: 'high',
        estimatedTime: 45,
        requiredTools: ['packaging_materials', 'documentation'],
        dependencies: ['attach-logo']
      }
    ))

    return taskList.sort((a, b) => a.order - b.order)
  }, [orderConfiguration])

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true)
      try {
        // Try to load saved task progress
        const response = await nextJsApiClient.get(`/production/tasks/${orderId}${buildNumber ? `/${buildNumber}` : ''}`)
        
        if (response.data.success && response.data.data) {
          // Merge saved progress with generated tasks
          const savedTasks = response.data.data
          const mergedTasks = generatedTasks.map(task => {
            const savedTask = savedTasks.find((s: any) => s.id === task.id)
            return savedTask ? { ...task, ...savedTask } : task
          })
          setTasks(mergedTasks)
        } else {
          setTasks(generatedTasks)
        }
      } catch (error) {
        console.error('Error loading tasks:', error)
        setTasks(generatedTasks)
      } finally {
        setLoading(false)
      }
    }

    if (generatedTasks.length > 0) {
      loadTasks()
    }
  }, [orderId, buildNumber, generatedTasks])

  useEffect(() => {
    calculateProgress()
  }, [tasks])

  const getControlBoxPart = (basins: any[]) => {
    if (!basins || basins.length === 0) return null

    const eDrainCount = basins.filter(b => b.type === 'E-Drain').length
    const eSinkCount = basins.filter(b => b.type === 'E-Sink' || b.type === 'E-Sink DI').length

    if (eDrainCount === 1 && eSinkCount === 0) return 'T2-CTRL-EDR1'
    if (eDrainCount === 0 && eSinkCount === 1) return 'T2-CTRL-ESK1'
    if (eDrainCount === 1 && eSinkCount === 1) return 'T2-CTRL-EDR1-ESK1'
    if (eDrainCount === 2 && eSinkCount === 0) return 'T2-CTRL-EDR2'
    if (eDrainCount === 0 && eSinkCount === 2) return 'T2-CTRL-ESK2'
    if (eDrainCount === 3 && eSinkCount === 0) return 'T2-CTRL-EDR3'
    if (eDrainCount === 0 && eSinkCount === 3) return 'T2-CTRL-ESK3'
    if (eDrainCount === 1 && eSinkCount === 2) return 'T2-CTRL-EDR1-ESK2'
    if (eDrainCount === 2 && eSinkCount === 1) return 'T2-CTRL-EDR2-ESK1'

    return 'T2-CTRL-CUSTOM'
  }

  const calculateProgress = () => {
    const completedTasks = tasks.filter(task => task.completed).length
    const totalTasks = tasks.length
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    setCompletionProgress(progress)

    if (progress === 100 && onAllTasksComplete) {
      onAllTasksComplete()
    }
  }

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (readonly) return

    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            completed,
            completedAt: completed ? new Date().toISOString() : undefined,
            completedBy: completed ? 'current_user' : undefined
          }
        : task
    )

    setTasks(updatedTasks)
    onTaskUpdate?.(taskId, { completed })

    // Save progress to backend
    try {
      await nextJsApiClient.put(`/production/tasks/${orderId}/${taskId}`, {
        completed,
        completedAt: completed ? new Date().toISOString() : null
      })
    } catch (error) {
      console.error('Error saving task progress:', error)
      toast({
        title: "Warning",
        description: "Task progress saved locally but failed to sync with server",
        variant: "destructive"
      })
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getTasksByCategory = (category: string) => {
    return tasks.filter(task => task.category === category)
  }

  const getCategoryProgress = (category: string) => {
    const categoryTasks = getTasksByCategory(category)
    const completedTasks = categoryTasks.filter(task => task.completed).length
    return categoryTasks.length > 0 ? (completedTasks / categoryTasks.length) * 100 : 0
  }

  const renderTask = (task: ProductionTask) => (
    <div key={task.id} className={`p-4 border rounded-lg ${task.completed ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <Checkbox
            checked={task.completed}
            onCheckedChange={(checked) => handleTaskToggle(task.id, checked as boolean)}
            disabled={readonly}
            className="mt-1"
          />
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Label className="font-medium">{task.title}</Label>
              
              <div className="flex items-center gap-1">
                {task.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs">High Priority</Badge>
                )}
                {task.isConditional && (
                  <Badge variant="outline" className="text-xs">Conditional</Badge>
                )}
                {task.isBasinSpecific && (
                  <Badge variant="secondary" className="text-xs">Basin {task.basinNumber}</Badge>
                )}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
            
            {task.isConditional && task.condition && (
              <div className="text-xs text-blue-600 mb-2">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Condition: {task.condition}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <Label className="text-muted-foreground">Estimated Time:</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{task.estimatedTime} min</span>
                </div>
              </div>
              
              {task.requiredParts.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Required Parts:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.requiredParts.slice(0, 3).map(part => (
                      <Badge key={part} variant="outline" className="text-xs">{part}</Badge>
                    ))}
                    {task.requiredParts.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{task.requiredParts.length - 3} more</Badge>
                    )}
                  </div>
                </div>
              )}
              
              {task.requiredTools.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Required Tools:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.requiredTools.slice(0, 3).map(tool => (
                      <Badge key={tool} variant="secondary" className="text-xs">{tool.replace('_', ' ')}</Badge>
                    ))}
                    {task.requiredTools.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{task.requiredTools.length - 3} more</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {task.dependencies.length > 0 && (
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Dependencies:</Label>
                <div className="text-xs text-gray-600 mt-1">
                  Must complete: {task.dependencies.join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {task.completed && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderCategory = (categoryKey: string) => {
    const config = categoryConfig[categoryKey as keyof typeof categoryConfig]
    const categoryTasks = getTasksByCategory(categoryKey)
    
    if (categoryTasks.length === 0) return null

    const progress = getCategoryProgress(categoryKey)
    const isExpanded = expandedCategories.has(categoryKey)
    
    return (
      <Card key={categoryKey} className="mb-4">
        <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(categoryKey)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {config.icon}
                  <div>
                    <CardTitle className="text-lg">{config.title}</CardTitle>
                    <CardDescription>
                      {categoryTasks.filter(t => t.completed).length} of {categoryTasks.length} tasks completed
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Badge className={config.color}>
                    {Math.round(progress)}%
                  </Badge>
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
              
              <div className="mt-3">
                <Progress value={progress} className="h-2" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-3">
              {categoryTasks.map(renderTask)}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Generating configuration-driven tasks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Configuration-Driven Production Tasks
              </CardTitle>
              <CardDescription>
                Tasks automatically generated based on order configuration
                {buildNumber && ` for Build #${buildNumber}`}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="px-3 py-1">
                {Math.round(completionProgress)}% Complete
              </Badge>
              <Badge variant="secondary">
                {tasks.filter(t => t.completed).length} / {tasks.length} Tasks
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={completionProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Task Categories */}
      <div className="space-y-4">
        {Object.keys(categoryConfig).map(renderCategory)}
      </div>

      {/* Summary */}
      {tasks.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{tasks.filter(t => t.completed).length}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{tasks.filter(t => t.priority === 'high').length}</div>
                <div className="text-sm text-muted-foreground">High Priority</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(tasks.reduce((sum, task) => sum + task.estimatedTime, 0) / 60 * 10) / 10}h
                </div>
                <div className="text-sm text-muted-foreground">Est. Total Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}