"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ArrowRight,
  ArrowDown,
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  RefreshCw,
  Maximize2,
  Minimize2,
  GitBranch,
  Target,
  Info
} from "lucide-react"

interface TaskDependency {
  dependsOn: {
    id: string
    title: string
    status: string
  }
}

interface TaskDependent {
  task: {
    id: string
    title: string
    status: string
  }
}

interface TaskDependencyGraphProps {
  taskId: string
  dependencies: TaskDependency[]
  dependents: TaskDependent[]
  layout?: 'horizontal' | 'vertical'
}

interface TaskNode {
  id: string
  title: string
  status: string
  type: 'dependency' | 'current' | 'dependent'
  level: number
}

export function TaskDependencyGraph({ 
  taskId, 
  dependencies, 
  dependents,
  layout = 'horizontal'
}: TaskDependencyGraphProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedNode, setSelectedNode] = useState<TaskNode | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-300'
      case 'BLOCKED': return 'bg-red-100 text-red-800 border-red-300'
      case 'CANCELLED': return 'bg-gray-100 text-gray-600 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-3 h-3" />
      case 'IN_PROGRESS': return <Play className="w-3 h-3" />
      case 'COMPLETED': return <CheckCircle className="w-3 h-3" />
      case 'BLOCKED': return <AlertCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  const buildTaskNodes = (): TaskNode[] => {
    const nodes: TaskNode[] = []

    // Add dependency nodes (level -1)
    dependencies.forEach((dep) => {
      nodes.push({
        id: dep.dependsOn.id,
        title: dep.dependsOn.title,
        status: dep.dependsOn.status,
        type: 'dependency',
        level: -1
      })
    })

    // Add current task node (level 0)
    nodes.push({
      id: taskId,
      title: 'Current Task',
      status: 'CURRENT',
      type: 'current',
      level: 0
    })

    // Add dependent nodes (level 1)
    dependents.forEach((dep) => {
      nodes.push({
        id: dep.task.id,
        title: dep.task.title,
        status: dep.task.status,
        type: 'dependent',
        level: 1
      })
    })

    return nodes
  }

  const taskNodes = buildTaskNodes()

  const canTaskStart = (task: TaskNode) => {
    if (task.type === 'dependency') return true
    if (task.type === 'current') {
      return dependencies.every(dep => dep.dependsOn.status === 'COMPLETED')
    }
    if (task.type === 'dependent') {
      // For dependents, check if current task is completed
      return task.status === 'COMPLETED' || task.status === 'IN_PROGRESS'
    }
    return false
  }

  const getBlockingDependencies = () => {
    return dependencies.filter(dep => dep.dependsOn.status !== 'COMPLETED')
  }

  const getReadyDependents = () => {
    return dependents.filter(dep => 
      dep.task.status === 'PENDING' && 
      dependencies.every(d => d.dependsOn.status === 'COMPLETED')
    )
  }

  const renderTaskNode = (node: TaskNode) => {
    const isBlocked = node.type === 'current' && getBlockingDependencies().length > 0
    const isReady = canTaskStart(node)

    return (
      <div
        key={node.id}
        className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
          selectedNode?.id === node.id ? 'ring-2 ring-primary' : ''
        } ${
          node.type === 'current' 
            ? 'bg-primary/10 border-primary' 
            : getStatusColor(node.status)
        } ${
          isBlocked ? 'opacity-75' : ''
        }`}
        onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
      >
        <div className="flex items-center space-x-2 mb-1">
          {getStatusIcon(node.status)}
          <span className="font-medium text-sm">
            {node.type === 'current' ? 'Current Task' : node.title}
          </span>
          {node.type === 'current' && (
            <Target className="w-3 h-3 text-primary" />
          )}
        </div>
        
        <div className="text-xs">
          <Badge variant="outline" className="text-xs">
            {node.status === 'CURRENT' ? 'FOCUS' : node.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Status indicators */}
        {isBlocked && node.type === 'current' && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {isReady && node.type === 'dependent' && node.status === 'PENDING' && (
          <div className="absolute -top-1 -right-1">
            <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-2 h-2 text-white" />
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderArrow = (direction: 'horizontal' | 'vertical' = layout) => {
    const ArrowComponent = direction === 'horizontal' ? ArrowRight : ArrowDown
    return (
      <div className="flex items-center justify-center text-muted-foreground">
        <ArrowComponent className="w-4 h-4" />
      </div>
    )
  }

  const renderHorizontalLayout = () => (
    <div className="flex items-center space-x-4 overflow-x-auto pb-4">
      {/* Dependencies */}
      {dependencies.length > 0 && (
        <>
          <div className="flex flex-col space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Dependencies ({dependencies.length})
            </div>
            {dependencies.map((dep) => (
              <div key={dep.dependsOn.id}>
                {renderTaskNode({
                  id: dep.dependsOn.id,
                  title: dep.dependsOn.title,
                  status: dep.dependsOn.status,
                  type: 'dependency',
                  level: -1
                })}
              </div>
            ))}
          </div>
          {renderArrow('horizontal')}
        </>
      )}

      {/* Current Task */}
      <div className="flex-shrink-0">
        <div className="text-xs font-medium text-muted-foreground mb-1">
          Current Task
        </div>
        {renderTaskNode({
          id: taskId,
          title: 'Current Task',
          status: 'CURRENT',
          type: 'current',
          level: 0
        })}
      </div>

      {/* Dependents */}
      {dependents.length > 0 && (
        <>
          {renderArrow('horizontal')}
          <div className="flex flex-col space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Dependents ({dependents.length})
            </div>
            {dependents.map((dep) => (
              <div key={dep.task.id}>
                {renderTaskNode({
                  id: dep.task.id,
                  title: dep.task.title,
                  status: dep.task.status,
                  type: 'dependent',
                  level: 1
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  const renderVerticalLayout = () => (
    <div className="flex flex-col items-center space-y-4">
      {/* Dependencies */}
      {dependencies.length > 0 && (
        <>
          <div className="w-full">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Dependencies ({dependencies.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {dependencies.map((dep) => (
                <div key={dep.dependsOn.id}>
                  {renderTaskNode({
                    id: dep.dependsOn.id,
                    title: dep.dependsOn.title,
                    status: dep.dependsOn.status,
                    type: 'dependency',
                    level: -1
                  })}
                </div>
              ))}
            </div>
          </div>
          {renderArrow('vertical')}
        </>
      )}

      {/* Current Task */}
      <div className="w-full max-w-xs">
        <div className="text-xs font-medium text-muted-foreground mb-2 text-center">
          Current Task
        </div>
        {renderTaskNode({
          id: taskId,
          title: 'Current Task',
          status: 'CURRENT',
          type: 'current',
          level: 0
        })}
      </div>

      {/* Dependents */}
      {dependents.length > 0 && (
        <>
          {renderArrow('vertical')}
          <div className="w-full">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Dependents ({dependents.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {dependents.map((dep) => (
                <div key={dep.task.id}>
                  {renderTaskNode({
                    id: dep.task.id,
                    title: dep.task.title,
                    status: dep.task.status,
                    type: 'dependent',
                    level: 1
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )

  const blockingDeps = getBlockingDependencies()
  const readyDeps = getReadyDependents()

  if (dependencies.length === 0 && dependents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>This task has no dependencies or dependents</p>
            <p className="text-sm">It can be started independently</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <GitBranch className="w-5 h-5" />
                <span>Task Dependencies</span>
              </CardTitle>
              <CardDescription>
                Task workflow and dependency relationships
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={isExpanded ? 'min-h-96' : ''}>
            {layout === 'horizontal' ? renderHorizontalLayout() : renderVerticalLayout()}
          </div>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {blockingDeps.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            This task is blocked by {blockingDeps.length} incomplete dependencies: {' '}
            {blockingDeps.map(dep => dep.dependsOn.title).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {readyDeps.length > 0 && (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>
            {readyDeps.length} dependent task{readyDeps.length !== 1 ? 's' : ''} ready to start: {' '}
            {readyDeps.map(dep => dep.task.title).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Selected Task Details */}
      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Task Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">{selectedNode.title}</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getStatusColor(selectedNode.status)}>
                    {selectedNode.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline">
                    {selectedNode.type === 'dependency' ? 'Prerequisite' : 
                     selectedNode.type === 'current' ? 'Current Focus' : 'Next Step'}
                  </Badge>
                </div>
              </div>

              {selectedNode.type === 'dependency' && selectedNode.status !== 'COMPLETED' && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    This prerequisite task must be completed before the current task can proceed.
                  </AlertDescription>
                </Alert>
              )}

              {selectedNode.type === 'dependent' && selectedNode.status === 'PENDING' && canTaskStart(selectedNode) && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    This task is ready to start once the current task is completed.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm">
            <h4 className="font-medium mb-2">Legend</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Blocked</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Ready</span>
              </div>
              <div className="flex items-center space-x-1">
                <Target className="w-3 h-3 text-primary" />
                <span>Current Task</span>
              </div>
              <div className="flex items-center space-x-1">
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span>Dependency Flow</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}