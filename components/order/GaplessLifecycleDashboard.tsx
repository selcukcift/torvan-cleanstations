"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { AssemblyWorkflowIntegration } from "../assembly/AssemblyWorkflowIntegration"
import { TaskAssignmentSystem } from "../assembly/TaskAssignmentSystem"
import { PreQCWorkflow } from "../qc/PreQCWorkflow"
import { QCRejectionWorkflow } from "../qc/QCRejectionWorkflow"
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Package, 
  Users, 
  FileCheck, 
  Wrench,
  Workflow,
  TrendingUp
} from "lucide-react"

interface GaplessLifecycleDashboardProps {
  orderId: string
  orderData: {
    id: string
    poNumber: string
    customerName: string
    orderStatus: string
    buildNumbers: string[]
    wantDate: string
  }
  bomItems?: Array<{
    id: string
    partIdOrAssemblyId: string
    name: string
    quantity: number
    requiresSerialTracking?: boolean
    isOutsourced?: boolean
  }>
  onRefresh?: () => void
}

// Define the complete lifecycle phases
const LIFECYCLE_PHASES = [
  { id: 'configuration', label: 'Configuration', statuses: ['DRAFT', 'ORDER_SUBMITTED'] },
  { id: 'bom', label: 'BOM Generation', statuses: ['BOM_GENERATED'] },
  { id: 'preparation', label: 'Preparation', statuses: ['READY_FOR_PRODUCTION', 'READY_FOR_PRE_QC'] },
  { id: 'assembly', label: 'Assembly', statuses: ['IN_PRODUCTION', 'ASSEMBLY_ON_HOLD_PARTS_ISSUE'] },
  { id: 'qc', label: 'Quality Control', statuses: ['READY_FOR_FINAL_QC', 'ASSEMBLY_REJECTED_PRE_QC', 'ASSEMBLY_REJECTED_FINAL_QC', 'QC_REWORK_IN_PROGRESS'] },
  { id: 'completion', label: 'Completion', statuses: ['QC_PASSED', 'READY_FOR_SHIPPING', 'SHIPPED', 'COMPLETED'] }
]

// Define status configurations
const STATUS_CONFIG = {
  DRAFT: { phase: 'configuration', progress: 10, color: 'secondary', icon: Clock },
  ORDER_SUBMITTED: { phase: 'configuration', progress: 20, color: 'secondary', icon: Clock },
  BOM_GENERATED: { phase: 'bom', progress: 30, color: 'secondary', icon: Package },
  READY_FOR_PRODUCTION: { phase: 'preparation', progress: 40, color: 'default', icon: Wrench },
  READY_FOR_PRE_QC: { phase: 'preparation', progress: 35, color: 'default', icon: FileCheck },
  IN_PRODUCTION: { phase: 'assembly', progress: 50, color: 'default', icon: Users },
  ASSEMBLY_ON_HOLD_PARTS_ISSUE: { phase: 'assembly', progress: 45, color: 'destructive', icon: AlertTriangle },
  READY_FOR_FINAL_QC: { phase: 'qc', progress: 70, color: 'default', icon: FileCheck },
  ASSEMBLY_REJECTED_PRE_QC: { phase: 'qc', progress: 40, color: 'destructive', icon: AlertTriangle },
  ASSEMBLY_REJECTED_FINAL_QC: { phase: 'qc', progress: 65, color: 'destructive', icon: AlertTriangle },
  QC_REWORK_IN_PROGRESS: { phase: 'qc', progress: 60, color: 'secondary', icon: Wrench },
  QC_PASSED: { phase: 'completion', progress: 85, color: 'success', icon: CheckCircle },
  READY_FOR_SHIPPING: { phase: 'completion', progress: 90, color: 'success', icon: Package },
  SHIPPED: { phase: 'completion', progress: 95, color: 'success', icon: CheckCircle },
  COMPLETED: { phase: 'completion', progress: 100, color: 'success', icon: CheckCircle }
}

export function GaplessLifecycleDashboard({
  orderId,
  orderData,
  bomItems = [],
  onRefresh
}: GaplessLifecycleDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  
  const currentStatus = orderData.orderStatus as keyof typeof STATUS_CONFIG
  const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.DRAFT
  const StatusIcon = statusConfig.icon

  const getCurrentPhase = () => {
    return LIFECYCLE_PHASES.find(phase => phase.id === statusConfig.phase) || LIFECYCLE_PHASES[0]
  }

  const getPhaseStatus = (phaseId: string) => {
    const currentPhase = getCurrentPhase()
    const phaseIndex = LIFECYCLE_PHASES.findIndex(p => p.id === phaseId)
    const currentPhaseIndex = LIFECYCLE_PHASES.findIndex(p => p.id === currentPhase.id)
    
    if (phaseIndex < currentPhaseIndex) return 'completed'
    if (phaseIndex === currentPhaseIndex) return 'active'
    return 'pending'
  }

  const getGaplessFeatures = () => {
    const features = [
      {
        name: "Serial/Batch Tracking",
        status: bomItems.some(item => item.requiresSerialTracking) ? 'required' : 'not_required',
        description: "Critical component traceability for medical device compliance"
      },
      {
        name: "Outsourced Parts Management",
        status: bomItems.some(item => item.isOutsourced) ? 'active' : 'not_required',
        description: "External supplier parts tracking and delivery management"
      },
      {
        name: "QC Rejection Workflows",
        status: ['ASSEMBLY_REJECTED_PRE_QC', 'ASSEMBLY_REJECTED_FINAL_QC', 'QC_REWORK_IN_PROGRESS'].includes(currentStatus) ? 'active' : 'available',
        description: "Automated rework loops for quality control failures"
      },
      {
        name: "Parts Shortage Escalation",
        status: currentStatus === 'ASSEMBLY_ON_HOLD_PARTS_ISSUE' ? 'active' : 'available',
        description: "Immediate hold and notification system for parts issues"
      },
      {
        name: "Task Assignment System",
        status: ['IN_PRODUCTION', 'QC_REWORK_IN_PROGRESS'].includes(currentStatus) ? 'available' : 'available',
        description: "Structured assembly task creation and assignment"
      },
      {
        name: "Notification Matrix",
        status: 'active',
        description: "Role-based notifications for all workflow events"
      }
    ]
    
    return features
  }

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: any } = {
      completed: { variant: "success", label: "✓ Complete" },
      active: { variant: "default", label: "● Active" },
      required: { variant: "default", label: "● Required" },
      available: { variant: "outline", label: "○ Available" },
      not_required: { variant: "secondary", label: "- Not Required" },
      pending: { variant: "outline", label: "○ Pending" }
    }
    
    const config = variants[status] || variants.pending
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
  }

  const isOrderBlocked = () => {
    return ['ASSEMBLY_ON_HOLD_PARTS_ISSUE', 'ASSEMBLY_REJECTED_PRE_QC', 'ASSEMBLY_REJECTED_FINAL_QC'].includes(currentStatus)
  }

  const getNextSteps = () => {
    switch (currentStatus) {
      case 'READY_FOR_PRODUCTION':
        return ['Initiate Pre-QC (optional)', 'Proceed to assembly', 'Create assembly tasks']
      case 'READY_FOR_PRE_QC':
        return ['Complete Pre-QC inspection', 'Pass/Fail decision', 'Progress to assembly']
      case 'IN_PRODUCTION':
        return ['Assign assembly tasks', 'Track component serial numbers', 'Monitor parts availability']
      case 'ASSEMBLY_ON_HOLD_PARTS_ISSUE':
        return ['Resolve parts shortage', 'Update outsourced parts status', 'Resume assembly']
      case 'READY_FOR_FINAL_QC':
        return ['Complete Final QC inspection', 'Digital signature compliance', 'Pass/Fail decision']
      case 'ASSEMBLY_REJECTED_FINAL_QC':
      case 'QC_REWORK_IN_PROGRESS':
        return ['Complete rework tasks', 'Re-inspect quality', 'Return to QC queue']
      case 'QC_PASSED':
        return ['Prepare for shipping', 'Generate documentation', 'Schedule delivery']
      default:
        return ['Continue with standard workflow progression']
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Gapless Lifecycle Management
          </CardTitle>
          <CardDescription>
            Complete workflow tracking for order {orderData.poNumber} - {orderData.customerName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Current Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon className="h-6 w-6" />
                <div>
                  <p className="font-medium">{currentStatus.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{statusConfig.progress}%</p>
                <p className="text-sm text-muted-foreground">Complete</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Order Progress</span>
                <span>{statusConfig.progress}%</span>
              </div>
              <Progress value={statusConfig.progress} className="h-2" />
            </div>

            {/* Phase Progress */}
            <div className="grid grid-cols-6 gap-2">
              {LIFECYCLE_PHASES.map((phase) => {
                const phaseStatus = getPhaseStatus(phase.id)
                return (
                  <div key={phase.id} className="text-center">
                    <div className={`w-full h-2 rounded mb-1 ${
                      phaseStatus === 'completed' ? 'bg-green-500' :
                      phaseStatus === 'active' ? 'bg-blue-500' :
                      'bg-gray-200'
                    }`} />
                    <p className="text-xs text-muted-foreground">{phase.label}</p>
                  </div>
                )
              })}
            </div>

            {/* Blocked Alert */}
            {isOrderBlocked() && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Order Blocked</AlertTitle>
                <AlertDescription>
                  This order requires attention to proceed. Check the relevant workflow tabs for resolution steps.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Workflow Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assembly">Assembly</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="pre-qc">Pre-QC</TabsTrigger>
          <TabsTrigger value="final-qc">Final QC</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gapless Features Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Gapless Features
                </CardTitle>
                <CardDescription>
                  Lifecycle management features status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getGaplessFeatures().map((feature) => (
                    <div key={feature.name} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{feature.name}</p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                      {getStatusBadge(feature.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
                <CardDescription>
                  Recommended actions for current status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getNextSteps().map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                        {index + 1}
                      </div>
                      <p className="text-sm">{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assembly">
          <AssemblyWorkflowIntegration
            orderId={orderId}
            orderData={orderData}
            bomItems={bomItems}
            onStatusChange={onRefresh}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskAssignmentSystem
            orderId={orderId}
            orderData={orderData}
            bomItems={bomItems}
            onTaskUpdate={onRefresh}
          />
        </TabsContent>

        <TabsContent value="pre-qc">
          <PreQCWorkflow
            orderId={orderId}
            orderData={orderData}
            onStatusChange={onRefresh}
          />
        </TabsContent>

        <TabsContent value="final-qc">
          <QCRejectionWorkflow
            orderId={orderId}
            orderData={orderData}
            qcType="FINAL_QC"
            onStatusChange={onRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}