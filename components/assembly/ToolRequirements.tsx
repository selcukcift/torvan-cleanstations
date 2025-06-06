"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Wrench, 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  Filter,
  Download,
  BarChart3,
  Calendar,
  MapPin,
  User,
  ExternalLink
} from "lucide-react"

interface Tool {
  id: string
  name: string
  type: 'HAND_TOOL' | 'POWER_TOOL' | 'MEASURING' | 'SAFETY' | 'SPECIALIZED'
  description: string
  availability: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'MISSING'
  location: string
  lastChecked: string
  nextMaintenance?: string
  serialNumber?: string
  assignedTo?: string
  estimatedUsageTime?: number // in minutes
  criticality: 'CRITICAL' | 'IMPORTANT' | 'NICE_TO_HAVE'
  alternatives?: string[]
  specifications?: {
    model?: string
    manufacturer?: string
    calibrationDate?: string
    accuracy?: string
  }
}

interface ToolRequirement {
  id: string
  toolId: string
  tool: Tool
  quantity: number
  usageTime: number // in minutes
  sequence: number
  notes?: string
  checked: boolean
}

interface ToolRequirementsProps {
  taskId: string
  workInstructionId?: string
  onToolCheck?: (requirementId: string, checked: boolean) => void
  onRequestTool?: (toolId: string) => void
  readonly?: boolean
  showAvailabilityOnly?: boolean
}

export function ToolRequirements({ 
  taskId, 
  workInstructionId,
  onToolCheck,
  onRequestTool,
  readonly = false,
  showAvailabilityOnly = false
}: ToolRequirementsProps) {
  const [requirements, setRequirements] = useState<ToolRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("ALL")
  const [filterAvailability, setFilterAvailability] = useState<string>("ALL")
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [completionStats, setCompletionStats] = useState({
    total: 0,
    checked: 0,
    available: 0,
    critical: 0
  })

  useEffect(() => {
    fetchToolRequirements()
  }, [taskId, workInstructionId])

  useEffect(() => {
    updateCompletionStats()
  }, [requirements])

  const fetchToolRequirements = async () => {
    try {
      setLoading(true)
      
      // Simulate API call - replace with actual API endpoint
      const response = await fetch(`/api/v1/assembly/tasks/${taskId}/tools`)
      if (!response.ok) throw new Error('Failed to fetch tool requirements')
      
      const data = await response.json()
      setRequirements(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      // Fallback to mock data for development
      setRequirements(mockToolRequirements)
    } finally {
      setLoading(false)
    }
  }

  const updateCompletionStats = () => {
    const stats = requirements.reduce((acc, req) => {
      acc.total++
      if (req.checked) acc.checked++
      if (req.tool.availability === 'AVAILABLE') acc.available++
      if (req.tool.criticality === 'CRITICAL') acc.critical++
      return acc
    }, { total: 0, checked: 0, available: 0, critical: 0 })
    
    setCompletionStats(stats)
  }

  const handleToolCheck = (requirementId: string, checked: boolean) => {
    if (readonly) return

    setRequirements(prev => 
      prev.map(req => 
        req.id === requirementId 
          ? { ...req, checked }
          : req
      )
    )

    onToolCheck?.(requirementId, checked)
  }

  const handleRequestTool = (toolId: string) => {
    onRequestTool?.(toolId)
  }

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = req.tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.tool.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === "ALL" || req.tool.type === filterType
    const matchesAvailability = filterAvailability === "ALL" || req.tool.availability === filterAvailability
    
    return matchesSearch && matchesType && matchesAvailability
  })

  const getToolTypeIcon = (type: Tool['type']) => {
    switch (type) {
      case 'HAND_TOOL': return <Wrench className="h-4 w-4" />
      case 'POWER_TOOL': return <Package className="h-4 w-4" />
      case 'MEASURING': return <BarChart3 className="h-4 w-4" />
      case 'SAFETY': return <AlertTriangle className="h-4 w-4" />
      case 'SPECIALIZED': return <ExternalLink className="h-4 w-4" />
      default: return <Wrench className="h-4 w-4" />
    }
  }

  const getAvailabilityBadge = (availability: Tool['availability']) => {
    const variants = {
      'AVAILABLE': { variant: 'default' as const, text: 'Available' },
      'IN_USE': { variant: 'secondary' as const, text: 'In Use' },
      'MAINTENANCE': { variant: 'destructive' as const, text: 'Maintenance' },
      'MISSING': { variant: 'destructive' as const, text: 'Missing' }
    }
    
    const config = variants[availability]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const getCriticalityBadge = (criticality: Tool['criticality']) => {
    const variants = {
      'CRITICAL': { variant: 'destructive' as const, text: 'Critical' },
      'IMPORTANT': { variant: 'secondary' as const, text: 'Important' },
      'NICE_TO_HAVE': { variant: 'outline' as const, text: 'Optional' }
    }
    
    const config = variants[criticality]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Tool Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading tool requirements: {error}
        </AlertDescription>
      </Alert>
    )
  }

  const completionPercentage = completionStats.total > 0 
    ? Math.round((completionStats.checked / completionStats.total) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Tool Requirements
            </span>
            {!showAvailabilityOnly && (
              <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
                {completionStats.checked}/{completionStats.total} Complete
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Required tools and equipment for task completion
          </CardDescription>
        </CardHeader>
        
        {!showAvailabilityOnly && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{completionStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Tools</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completionStats.available}</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{completionStats.critical}</div>
                <div className="text-sm text-muted-foreground">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{completionPercentage}%</div>
                <div className="text-sm text-muted-foreground">Checked</div>
              </div>
            </div>
            
            <Progress value={completionPercentage} className="mb-4" />
            
            {completionStats.critical > completionStats.available && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some critical tools are not available. Contact equipment manager.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        )}
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Tools</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="type-filter">Filter by Type</Label>
              <select
                id="type-filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ALL">All Types</option>
                <option value="HAND_TOOL">Hand Tools</option>
                <option value="POWER_TOOL">Power Tools</option>
                <option value="MEASURING">Measuring</option>
                <option value="SAFETY">Safety</option>
                <option value="SPECIALIZED">Specialized</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="availability-filter">Filter by Availability</Label>
              <select
                id="availability-filter"
                value={filterAvailability}
                onChange={(e) => setFilterAvailability(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="MISSING">Missing</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showAlternatives ? 'Hide' : 'Show'} Alternatives
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tool Requirements List */}
      <div className="space-y-4">
        {filteredRequirements.map((requirement) => (
          <Card key={requirement.id} className={requirement.tool.criticality === 'CRITICAL' ? 'border-red-200' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {!readonly && !showAvailabilityOnly && (
                    <Checkbox
                      checked={requirement.checked}
                      onCheckedChange={(checked) => handleToolCheck(requirement.id, checked as boolean)}
                      className="mt-1"
                    />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getToolTypeIcon(requirement.tool.type)}
                      <h3 className="font-semibold">{requirement.tool.name}</h3>
                      {getCriticalityBadge(requirement.tool.criticality)}
                      {getAvailabilityBadge(requirement.tool.availability)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {requirement.tool.description}
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <span>Qty: {requirement.quantity}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Time: {formatTime(requirement.usageTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>Location: {requirement.tool.location}</span>
                      </div>
                      {requirement.tool.assignedTo && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Assigned: {requirement.tool.assignedTo}</span>
                        </div>
                      )}
                    </div>
                    
                    {requirement.tool.specifications && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {requirement.tool.specifications.model && (
                          <span className="mr-4">Model: {requirement.tool.specifications.model}</span>
                        )}
                        {requirement.tool.specifications.serialNumber && (
                          <span className="mr-4">S/N: {requirement.tool.serialNumber}</span>
                        )}
                        {requirement.tool.specifications.calibrationDate && (
                          <span>Cal: {requirement.tool.specifications.calibrationDate}</span>
                        )}
                      </div>
                    )}
                    
                    {requirement.notes && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                        <strong>Notes:</strong> {requirement.notes}
                      </div>
                    )}
                    
                    {showAlternatives && requirement.tool.alternatives && requirement.tool.alternatives.length > 0 && (
                      <div className="mt-2">
                        <Separator className="my-2" />
                        <div className="text-sm">
                          <strong>Alternatives:</strong>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {requirement.tool.alternatives.map((alt, index) => (
                              <li key={index} className="text-muted-foreground">{alt}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {requirement.tool.availability !== 'AVAILABLE' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestTool(requirement.tool.id)}
                    >
                      Request Tool
                    </Button>
                  )}
                  
                  {requirement.tool.nextMaintenance && (
                    <div className="text-xs text-center">
                      <Calendar className="h-3 w-3 mx-auto mb-1" />
                      <div>Next Maint:</div>
                      <div>{requirement.tool.nextMaintenance}</div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredRequirements.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tool requirements found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Mock data for development
const mockToolRequirements: ToolRequirement[] = [
  {
    id: "req-1",
    toolId: "tool-1",
    tool: {
      id: "tool-1",
      name: "Digital Torque Wrench",
      type: "POWER_TOOL",
      description: "Precision torque wrench with digital display for accurate tightening",
      availability: "AVAILABLE",
      location: "Tool Crib A-12",
      lastChecked: "2024-01-15",
      nextMaintenance: "2024-02-15",
      serialNumber: "TW-2024-001",
      criticality: "CRITICAL",
      specifications: {
        model: "TorquePro 5000",
        manufacturer: "PrecisionTools Inc",
        calibrationDate: "2024-01-01",
        accuracy: "±2%"
      },
      alternatives: ["Manual torque wrench", "Click-type torque wrench"]
    },
    quantity: 1,
    usageTime: 30,
    sequence: 1,
    notes: "Must be calibrated within the last 6 months",
    checked: false
  },
  {
    id: "req-2",
    toolId: "tool-2", 
    tool: {
      id: "tool-2",
      name: "Safety Glasses",
      type: "SAFETY",
      description: "ANSI Z87.1 compliant safety glasses with side shields",
      availability: "AVAILABLE",
      location: "Safety Station",
      lastChecked: "2024-01-16",
      criticality: "CRITICAL",
      specifications: {
        model: "SafeView Pro",
        manufacturer: "SafetyFirst Corp"
      }
    },
    quantity: 1,
    usageTime: 120,
    sequence: 1,
    checked: true
  }
]