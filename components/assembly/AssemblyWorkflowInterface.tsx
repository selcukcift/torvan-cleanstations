"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft,
  CheckCircle,
  Clock,
  Package,
  Settings,
  TestTube,
  Loader2,
  AlertCircle
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { ProductionTaskList } from "./ProductionTaskList"
import { TestingTaskList } from "./TestingTaskList"

interface AssemblyWorkflowInterfaceProps {
  orderId: string
}

interface OrderData {
  id: string
  poNumber: string
  customerName: string
  orderStatus: string
  wantDate: string
}

interface TaskStats {
  total: number
  completed: number
  productionComplete: boolean
  testingComplete: boolean
}

export function AssemblyWorkflowInterface({ orderId }: AssemblyWorkflowInterfaceProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [orderConfig, setOrderConfig] = useState<any>(null)
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    productionComplete: false,
    testingComplete: false
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("production")
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [orderId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load order data and configuration
      const [orderResponse, configResponse] = await Promise.all([
        nextJsApiClient.get(`/orders/${orderId}`),
        nextJsApiClient.get(`/orders/${orderId}/source-of-truth`)
      ])

      if (orderResponse.data.success) {
        setOrderData(orderResponse.data.data)
      }

      if (configResponse.data.success) {
        setOrderConfig(configResponse.data.data)
      }

      // Load task statistics
      await loadTaskStats()

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load assembly data",
        variant: "destructive"
      })
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTaskStats = async () => {
    try {
      const response = await nextJsApiClient.get(`/production/tasks?orderId=${orderId}`)
      
      if (response.data.success) {
        const tasks = response.data.data
        const productionTasks = tasks.filter((task: any) => task.category !== 'testing')
        const testingTasks = tasks.filter((task: any) => task.category === 'testing')
        
        const completed = tasks.filter((task: any) => task.completed).length
        const productionComplete = productionTasks.every((task: any) => task.completed)
        const testingComplete = testingTasks.every((task: any) => task.completed)
        
        setTaskStats({
          total: tasks.length,
          completed,
          productionComplete,
          testingComplete
        })
      }
    } catch (error) {
      console.error('Error loading task stats:', error)
    }
  }

  const handleCompleteAssembly = async () => {
    if (!taskStats.productionComplete || !taskStats.testingComplete) {
      toast({
        title: "Assembly Incomplete",
        description: "Please complete all production and testing tasks before marking assembly complete",
        variant: "destructive"
      })
      return
    }

    try {
      setCompleting(true)
      
      const response = await nextJsApiClient.put(`/orders/${orderId}/status`, {
        newStatus: "TESTING_COMPLETE",
        notes: "Assembly and testing completed by assembler"
      })
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Assembly completed successfully!"
        })
        
        // Navigate back to dashboard
        router.push('/dashboard')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to complete assembly",
        variant: "destructive"
      })
    } finally {
      setCompleting(false)
    }
  }

  const getProgressPercentage = () => {
    return taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <span>Loading assembly workflow...</span>
      </div>
    )
  }

  if (!orderData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Order not found</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Assembly Workflow</h1>
            <p className="text-gray-600">{orderData.poNumber} • {orderData.customerName}</p>
          </div>
        </div>
        
        <Button 
          onClick={handleCompleteAssembly}
          disabled={!taskStats.productionComplete || !taskStats.testingComplete || completing}
          className="bg-green-600 hover:bg-green-700"
        >
          {completing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Assembly
            </>
          )}
        </Button>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Assembly Progress</CardTitle>
          <CardDescription>
            Track your progress through production and testing tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-600">
                {taskStats.completed} of {taskStats.total} tasks completed
              </span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span className="text-sm">Production Tasks</span>
                <Badge variant={taskStats.productionComplete ? "default" : "secondary"}>
                  {taskStats.productionComplete ? "Complete" : "In Progress"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                <span className="text-sm">Testing Tasks</span>
                <Badge variant={taskStats.testingComplete ? "default" : "secondary"}>
                  {taskStats.testingComplete ? "Complete" : "Pending"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="production" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Production Tasks
            {taskStats.productionComplete && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="testing" 
            className="flex items-center gap-2"
            disabled={!taskStats.productionComplete}
          >
            <TestTube className="w-4 h-4" />
            Testing Tasks
            {taskStats.testingComplete && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="production">
          <ProductionTaskList 
            orderId={orderId}
            orderConfig={orderConfig}
            onTaskUpdate={loadTaskStats}
          />
        </TabsContent>

        <TabsContent value="testing">
          {taskStats.productionComplete ? (
            <TestingTaskList 
              orderId={orderId}
              orderConfig={orderConfig}
              onTaskUpdate={loadTaskStats}
            />
          ) : (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Complete all production tasks before starting testing procedures.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}