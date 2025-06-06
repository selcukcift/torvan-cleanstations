"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  FileText,
  Image,
  Play,
  AlertTriangle,
  Wrench,
  Eye,
  ZoomIn,
  Download,
  RefreshCw
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface WorkInstructionStep {
  id: string
  stepNumber: number
  title: string
  description: string
  estimatedMinutes?: number
  images: string[]
  videos: string[]
  checkpoints: string[]
  requiredTools: Array<{
    tool: {
      id: string
      name: string
      category: string
      description?: string
    }
  }>
}

interface WorkInstruction {
  id: string
  title: string
  description?: string
  version: string
  estimatedMinutes?: number
  isActive: boolean
  steps: WorkInstructionStep[]
}

interface WorkInstructionViewerProps {
  workInstructionId: string
  currentTaskId?: string
  onStepComplete?: (stepId: string) => void
  readonly?: boolean
}

export function WorkInstructionViewer({ 
  workInstructionId, 
  currentTaskId, 
  onStepComplete,
  readonly = false 
}: WorkInstructionViewerProps) {
  const [workInstruction, setWorkInstruction] = useState<WorkInstruction | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkInstruction()
  }, [workInstructionId])

  const fetchWorkInstruction = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await nextJsApiClient.get(`/api/v1/assembly/work-instructions/${workInstructionId}`)
      
      if (response.data.success) {
        setWorkInstruction(response.data.data)
      } else {
        setError('Failed to load work instruction')
      }
    } catch (error) {
      console.error('Error fetching work instruction:', error)
      setError('Error loading work instruction')
    } finally {
      setLoading(false)
    }
  }

  const handleStepComplete = (stepId: string) => {
    if (readonly) return

    const newCompleted = new Set(completedSteps)
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId)
    } else {
      newCompleted.add(stepId)
    }
    setCompletedSteps(newCompleted)

    if (onStepComplete) {
      onStepComplete(stepId)
    }
  }

  const goToStep = (index: number) => {
    if (index >= 0 && index < (workInstruction?.steps.length || 0)) {
      setCurrentStepIndex(index)
    }
  }

  const goToNextStep = () => {
    goToStep(currentStepIndex + 1)
  }

  const goToPreviousStep = () => {
    goToStep(currentStepIndex - 1)
  }

  const getStepProgress = () => {
    if (!workInstruction?.steps.length) return 0
    return (completedSteps.size / workInstruction.steps.length) * 100
  }

  const getEstimatedTimeRemaining = () => {
    if (!workInstruction?.steps.length) return 0
    
    const remainingSteps = workInstruction.steps.filter(step => !completedSteps.has(step.id))
    return remainingSteps.reduce((total, step) => total + (step.estimatedMinutes || 0), 0)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading work instruction...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !workInstruction) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>{error || 'Work instruction not found'}</AlertDescription>
      </Alert>
    )
  }

  const currentStep = workInstruction.steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === workInstruction.steps.length - 1
  const isStepCompleted = currentStep ? completedSteps.has(currentStep.id) : false

  return (
    <div className="space-y-4">
      {/* Work Instruction Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>{workInstruction.title}</span>
                <Badge variant="outline">v{workInstruction.version}</Badge>
              </CardTitle>
              <CardDescription>{workInstruction.description}</CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{workInstruction.estimatedMinutes || 0} min total</span>
              </div>
              <div className="flex items-center space-x-1 mt-1">
                <Clock className="w-4 h-4" />
                <span>{getEstimatedTimeRemaining()} min remaining</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedSteps.size} of {workInstruction.steps.length} steps completed
              </span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
            
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousStep}
                disabled={isFirstStep}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <span className="text-sm px-4">
                Step {currentStepIndex + 1} of {workInstruction.steps.length}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextStep}
                disabled={isLastStep}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      {currentStep && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <span>Step {currentStep.stepNumber}: {currentStep.title}</span>
                {isStepCompleted && <CheckCircle className="w-5 h-5 text-green-600" />}
              </CardTitle>
              <div className="flex items-center space-x-2">
                {currentStep.estimatedMinutes && (
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    {currentStep.estimatedMinutes}m
                  </Badge>
                )}
                {!readonly && (
                  <Button
                    size="sm"
                    variant={isStepCompleted ? "outline" : "default"}
                    onClick={() => handleStepComplete(currentStep.id)}
                  >
                    {isStepCompleted ? "Mark Incomplete" : "Mark Complete"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step Description */}
            <div>
              <h4 className="font-medium mb-2">Instructions</h4>
              <p className="text-sm leading-relaxed">{currentStep.description}</p>
            </div>

            {/* Required Tools */}
            {currentStep.requiredTools.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Wrench className="w-4 h-4 mr-2" />
                  Required Tools
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentStep.requiredTools.map((toolRef) => (
                    <div
                      key={toolRef.tool.id}
                      className="flex items-center space-x-2 p-2 bg-muted rounded"
                    >
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{toolRef.tool.name}</p>
                        <p className="text-xs text-muted-foreground">{toolRef.tool.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Images */}
            {currentStep.images.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Image className="w-4 h-4 mr-2" />
                  Reference Images
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {currentStep.images.map((imagePath, index) => (
                    <div
                      key={index}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border"
                      onClick={() => {
                        setSelectedImage(imagePath)
                        setImageModalOpen(true)
                      }}
                    >
                      <img
                        src={imagePath}
                        alt={`Step ${currentStep.stepNumber} - Image ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {currentStep.videos.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Play className="w-4 h-4 mr-2" />
                  Instructional Videos
                </h4>
                <div className="space-y-2">
                  {currentStep.videos.map((videoPath, index) => (
                    <div key={index} className="aspect-video bg-muted rounded-lg">
                      <video
                        controls
                        className="w-full h-full rounded-lg"
                        src={videoPath}
                      >
                        Your browser does not support video playback.
                      </video>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checkpoints */}
            {currentStep.checkpoints.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Quality Checkpoints
                </h4>
                <div className="space-y-2">
                  {currentStep.checkpoints.map((checkpoint, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{checkpoint}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={isFirstStep}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous Step
            </Button>

            <div className="flex items-center space-x-1">
              {workInstruction.steps.map((step, index) => (
                <Button
                  key={step.id}
                  variant={index === currentStepIndex ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => goToStep(index)}
                >
                  {completedSteps.has(step.id) ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    step.stepNumber
                  )}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={goToNextStep}
              disabled={isLastStep}
            >
              Next Step
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Image Modal */}
      {imageModalOpen && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="max-w-4xl max-h-4xl p-4">
            <img
              src={selectedImage}
              alt="Step instruction"
              className="max-w-full max-h-full object-contain"
            />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setImageModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}