"use client"

import { useState, useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  Camera,
  QrCode,
  CheckCircle,
  AlertCircle,
  Clock,
  Package,
  Settings,
  FileText,
  Save,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Volume2,
  VolumeX
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface WorkstationTask {
  id: string
  title: string
  description: string
  category: string
  completed: boolean
  requiredParts: string[]
  requiredTools: string[]
  estimatedTime: number
  actualTime?: number
  startTime?: string
  endTime?: string
  photos: string[]
  notes?: string
  qrVerified?: boolean
}

interface ProductionWorkstationInterfaceProps {
  orderId: string
  buildNumber?: string
  mode?: 'checklist' | 'tasks' | 'both'
  enableOffline?: boolean
  enableCamera?: boolean
  enableQR?: boolean
  enableTimer?: boolean
  onTaskComplete?: (taskId: string) => void
}

export function ProductionWorkstationInterface({
  orderId,
  buildNumber,
  mode = 'both',
  enableOffline = true,
  enableCamera = true,
  enableQR = true,
  enableTimer = true,
  onTaskComplete
}: ProductionWorkstationInterfaceProps) {
  const { user, isLoaded } = useUser()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<WorkstationTask[]>([])
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSync, setPendingSync] = useState<any[]>([])
  const [cameraActive, setCameraActive] = useState(false)
  const [qrScannerActive, setQrScannerActive] = useState(false)
  const [timerActive, setTimerActive] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Network status monitoring
    const handleOnline = () => {
      setIsOnline(true)
      syncPendingData()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    fetchTasks()
    loadFromLocalStorage()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [orderId, buildNumber])

  useEffect(() => {
    // Timer logic
    if (timerActive && timerRef.current === null) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1)
      }, 1000)
    } else if (!timerActive && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [timerActive])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get(`/production/workstation/${orderId}${buildNumber ? `/${buildNumber}` : ''}`)
      
      if (response.data.success) {
        setTasks(response.data.data.tasks || [])
        saveToLocalStorage(response.data.data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      if (enableOffline) {
        toast({
          title: "Offline Mode",
          description: "Loading cached data - changes will sync when online",
          variant: "default"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const saveToLocalStorage = (tasksData: WorkstationTask[]) => {
    if (!enableOffline) return
    
    const storageKey = `workstation_${orderId}_${buildNumber || 'default'}`
    localStorage.setItem(storageKey, JSON.stringify({
      tasks: tasksData,
      lastSync: new Date().toISOString(),
      currentTaskIndex
    }))
  }

  const loadFromLocalStorage = () => {
    if (!enableOffline) return
    
    const storageKey = `workstation_${orderId}_${buildNumber || 'default'}`
    const cached = localStorage.getItem(storageKey)
    
    if (cached) {
      try {
        const data = JSON.parse(cached)
        if (!isOnline) {
          setTasks(data.tasks || [])
          setCurrentTaskIndex(data.currentTaskIndex || 0)
        }
      } catch (error) {
        console.error('Error loading cached data:', error)
      }
    }
  }

  const syncPendingData = async () => {
    if (pendingSync.length === 0) return

    try {
      const syncPromises = pendingSync.map(update => 
        nextJsApiClient.put(`/production/workstation/${orderId}/sync`, update)
      )
      
      await Promise.all(syncPromises)
      setPendingSync([])
      toast({
        title: "Synced",
        description: "Offline changes have been synchronized"
      })
    } catch (error) {
      console.error('Error syncing data:', error)
    }
  }

  const updateTask = async (taskId: string, updates: Partial<WorkstationTask>) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    )
    setTasks(updatedTasks)
    saveToLocalStorage(updatedTasks)

    const updateData = {
      taskId,
      updates,
      timestamp: new Date().toISOString(),
      userId: user?.id
    }

    if (isOnline) {
      try {
        await nextJsApiClient.put(`/production/workstation/${orderId}/${taskId}`, updateData)
      } catch (error) {
        console.error('Error updating task:', error)
        if (enableOffline) {
          setPendingSync(prev => [...prev, updateData])
        }
      }
    } else if (enableOffline) {
      setPendingSync(prev => [...prev, updateData])
    }

    if (updates.completed && onTaskComplete) {
      onTaskComplete(taskId)
    }
  }

  const startCamera = async () => {
    if (!enableCamera) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      toast({
        title: "Camera Error",
        description: "Unable to access camera",
        variant: "destructive"
      })
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (context) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      const currentTask = tasks[currentTaskIndex]
      
      if (currentTask) {
        updateTask(currentTask.id, {
          photos: [...currentTask.photos, imageData]
        })
        
        if (soundEnabled) {
          // Play capture sound
          const audio = new Audio('/sounds/camera-shutter.mp3')
          audio.play().catch(() => {})
        }
        
        toast({
          title: "Photo Captured",
          description: "Photo added to task documentation"
        })
      }
    }
  }

  const startQRScanner = () => {
    if (!enableQR) return
    setQrScannerActive(true)
    // QR scanner implementation would go here
  }

  const stopQRScanner = () => {
    setQrScannerActive(false)
  }

  const startTimer = () => {
    if (!enableTimer) return
    const currentTask = tasks[currentTaskIndex]
    if (currentTask && !currentTask.startTime) {
      updateTask(currentTask.id, {
        startTime: new Date().toISOString()
      })
    }
    setTimerActive(true)
  }

  const pauseTimer = () => {
    setTimerActive(false)
  }

  const resetTimer = () => {
    setTimerActive(false)
    setTimerSeconds(0)
    const currentTask = tasks[currentTaskIndex]
    if (currentTask) {
      updateTask(currentTask.id, {
        startTime: undefined,
        endTime: undefined,
        actualTime: undefined
      })
    }
  }

  const completeCurrentTask = () => {
    const currentTask = tasks[currentTaskIndex]
    if (!currentTask) return

    const endTime = new Date().toISOString()
    updateTask(currentTask.id, {
      completed: true,
      endTime,
      actualTime: timerSeconds
    })

    if (soundEnabled) {
      // Play completion sound
      const audio = new Audio('/sounds/task-complete.mp3')
      audio.play().catch(() => {})
    }

    // Move to next task
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1)
      setTimerSeconds(0)
      setTimerActive(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const currentTask = tasks[currentTaskIndex]
  const progress = tasks.length > 0 ? ((currentTaskIndex + (currentTask?.completed ? 1 : 0)) / tasks.length) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading workstation interface...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-4">
      {/* Status Bar */}
      <div className="bg-white rounded-lg p-3 mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-sm">
              Order: {orderId}
            </Badge>
            {buildNumber && (
              <Badge variant="secondary" className="text-sm">
                Build: {buildNumber}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {enableOffline && (
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
                <span className="text-xs text-muted-foreground">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {pendingSync.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {pendingSync.length} pending
                  </Badge>
                )}
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">
            {currentTaskIndex + 1} of {tasks.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Task */}
      {currentTask && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{currentTask.title}</CardTitle>
              <Badge className={currentTask.completed ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                {currentTask.completed ? 'Complete' : 'In Progress'}
              </Badge>
            </div>
            <CardDescription>{currentTask.description}</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Timer */}
            {enableTimer && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5" />
                    <div>
                      <div className="text-2xl font-mono font-bold">
                        {formatTime(timerSeconds)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Est: {formatTime(currentTask.estimatedTime * 60)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetTimer}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={timerActive ? "secondary" : "default"}
                      size="sm"
                      onClick={timerActive ? pauseTimer : startTimer}
                    >
                      {timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Required Parts & Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentTask.requiredParts.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Required Parts</Label>
                  <div className="space-y-1">
                    {currentTask.requiredParts.map((part, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <Package className="w-3 h-3" />
                        <span>{part}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {currentTask.requiredTools.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Required Tools</Label>
                  <div className="space-y-1">
                    {currentTask.requiredTools.map((tool, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <Settings className="w-3 h-3" />
                        <span>{tool.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Camera & QR Controls */}
            <div className="flex flex-wrap gap-2">
              {enableCamera && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cameraActive ? stopCamera : startCamera}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {cameraActive ? 'Stop Camera' : 'Start Camera'}
                  </Button>
                  
                  {cameraActive && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={capturePhoto}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Capture Photo
                    </Button>
                  )}
                </>
              )}
              
              {enableQR && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={qrScannerActive ? stopQRScanner : startQRScanner}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {qrScannerActive ? 'Stop Scanner' : 'Scan QR'}
                </Button>
              )}
            </div>

            {/* Camera Preview */}
            {cameraActive && (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full max-w-md rounded-lg"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            {/* Photos */}
            {currentTask.photos.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Photos ({currentTask.photos.length})
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {currentTask.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Task photo ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Notes</Label>
              <Textarea
                value={currentTask.notes || ''}
                onChange={(e) => updateTask(currentTask.id, { notes: e.target.value })}
                placeholder="Add notes about this task..."
                rows={3}
              />
            </div>

            {/* Task Completion */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentTaskIndex(Math.max(0, currentTaskIndex - 1))}
                  disabled={currentTaskIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentTaskIndex(Math.min(tasks.length - 1, currentTaskIndex + 1))}
                  disabled={currentTaskIndex === tasks.length - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              <Button
                onClick={completeCurrentTask}
                disabled={currentTask.completed}
                className="bg-green-600 hover:bg-green-700"
              >
                {currentTask.completed ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Completed
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task List Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={`p-3 rounded border cursor-pointer transition-colors ${
                  index === currentTaskIndex 
                    ? 'bg-blue-50 border-blue-200' 
                    : task.completed 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white border-gray-200'
                }`}
                onClick={() => setCurrentTaskIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle 
                      className={`w-4 h-4 ${
                        task.completed ? 'text-green-600' : 'text-gray-300'
                      }`} 
                    />
                    <span className={`font-medium ${
                      index === currentTaskIndex ? 'text-blue-700' : ''
                    }`}>
                      {task.title}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {task.category}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}