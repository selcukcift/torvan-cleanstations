"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  Timer,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle
} from "lucide-react"

interface Task {
  id: string
  title: string
  status: string
  estimatedMinutes?: number
  actualMinutes?: number
  startedAt?: string
}

interface TaskTimerProps {
  task: Task
  onTimeUpdate?: (minutes: number) => void
  onStatusChange?: (status: string) => void
  autoStart?: boolean
}

export function TaskTimer({ 
  task, 
  onTimeUpdate, 
  onStatusChange,
  autoStart = false 
}: TaskTimerProps) {
  const [isRunning, setIsRunning] = useState(autoStart && task.status === 'IN_PROGRESS')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [totalElapsedMinutes, setTotalElapsedMinutes] = useState(task.actualMinutes || 0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)

  // Calculate initial elapsed time if task was already started
  useEffect(() => {
    if (task.startedAt && task.status === 'IN_PROGRESS') {
      const startTime = new Date(task.startedAt)
      const currentTime = new Date()
      const diffInSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
      setElapsedSeconds(diffInSeconds % 60)
      
      // Update total elapsed time
      const sessionMinutes = Math.floor(diffInSeconds / 60)
      setTotalElapsedMinutes((task.actualMinutes || 0) + sessionMinutes)
    }
  }, [task.startedAt, task.actualMinutes, task.status])

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = new Date()
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const newSeconds = prev + 1
          
          // Update total minutes every minute
          if (newSeconds % 60 === 0) {
            const newTotalMinutes = totalElapsedMinutes + 1
            setTotalElapsedMinutes(newTotalMinutes)
            
            if (onTimeUpdate) {
              onTimeUpdate(newTotalMinutes)
            }
          }
          
          return newSeconds
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, totalElapsedMinutes, onTimeUpdate])

  const handleStart = () => {
    setIsRunning(true)
    if (onStatusChange && task.status !== 'IN_PROGRESS') {
      onStatusChange('IN_PROGRESS')
    }
  }

  const handlePause = () => {
    setIsRunning(false)
    
    // Update total elapsed time with current session
    if (startTimeRef.current) {
      const sessionSeconds = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000)
      const sessionMinutes = Math.floor(sessionSeconds / 60)
      const newTotalMinutes = totalElapsedMinutes + sessionMinutes
      setTotalElapsedMinutes(newTotalMinutes)
      
      if (onTimeUpdate) {
        onTimeUpdate(newTotalMinutes)
      }
    }
  }

  const handleStop = () => {
    setIsRunning(false)
    setElapsedSeconds(0)
    
    // Update total elapsed time
    if (startTimeRef.current) {
      const sessionSeconds = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000)
      const sessionMinutes = Math.floor(sessionSeconds / 60)
      const newTotalMinutes = totalElapsedMinutes + sessionMinutes
      setTotalElapsedMinutes(newTotalMinutes)
      
      if (onTimeUpdate) {
        onTimeUpdate(newTotalMinutes)
      }
    }
    
    if (onStatusChange) {
      onStatusChange('COMPLETED')
    }
  }

  const handleReset = () => {
    setIsRunning(false)
    setElapsedSeconds(0)
    setTotalElapsedMinutes(0)
    
    if (onTimeUpdate) {
      onTimeUpdate(0)
    }
  }

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const getCurrentSessionTime = () => {
    if (startTimeRef.current && isRunning) {
      const sessionSeconds = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000)
      return sessionSeconds + elapsedSeconds
    }
    return elapsedSeconds
  }

  const getTotalTimeInSeconds = () => {
    const sessionTime = getCurrentSessionTime()
    const sessionMinutes = Math.floor(sessionTime / 60)
    return (totalElapsedMinutes + sessionMinutes) * 60 + (sessionTime % 60)
  }

  const getEfficiencyPercentage = () => {
    if (!task.estimatedMinutes || totalElapsedMinutes === 0) return null
    return Math.round((task.estimatedMinutes / totalElapsedMinutes) * 100)
  }

  const getProgressPercentage = () => {
    if (!task.estimatedMinutes) return 0
    return Math.min((totalElapsedMinutes / task.estimatedMinutes) * 100, 100)
  }

  const isOvertime = () => {
    return task.estimatedMinutes && totalElapsedMinutes > task.estimatedMinutes
  }

  const getOvertimeMinutes = () => {
    if (!task.estimatedMinutes || !isOvertime()) return 0
    return totalElapsedMinutes - task.estimatedMinutes
  }

  const efficiency = getEfficiencyPercentage()
  const progressPercentage = getProgressPercentage()
  const overtime = isOvertime()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Timer className="w-5 h-5" />
          <span>Time Tracking</span>
          <Badge variant={isRunning ? "default" : "secondary"}>
            {isRunning ? "Running" : "Paused"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Track time spent on "{task.title}"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Timer Display */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold mb-2">
            {formatTime(getTotalTimeInSeconds())}
          </div>
          <div className="text-sm text-muted-foreground">
            Total time spent on this task
          </div>
        </div>

        {/* Current Session */}
        {isRunning && (
          <div className="text-center">
            <div className="text-lg font-mono">
              Current session: {formatTime(getCurrentSessionTime())}
            </div>
          </div>
        )}

        {/* Timer Controls */}
        <div className="flex items-center justify-center space-x-2">
          {!isRunning ? (
            <Button onClick={handleStart} className="flex items-center space-x-2">
              <Play className="w-4 h-4" />
              <span>Start</span>
            </Button>
          ) : (
            <Button onClick={handlePause} variant="outline" className="flex items-center space-x-2">
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </Button>
          )}

          <Button onClick={handleStop} variant="outline" className="flex items-center space-x-2">
            <Square className="w-4 h-4" />
            <span>Complete</span>
          </Button>

          <Button onClick={handleReset} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress and Estimates */}
        {task.estimatedMinutes && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">
                  {totalElapsedMinutes} / {task.estimatedMinutes} minutes
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Efficiency Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Estimated</span>
                </div>
                <div className="text-lg font-semibold">{task.estimatedMinutes}m</div>
              </div>

              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Timer className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Actual</span>
                </div>
                <div className="text-lg font-semibold">{totalElapsedMinutes}m</div>
              </div>

              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  {efficiency && efficiency >= 100 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-orange-600" />
                  )}
                  <span className="text-sm font-medium">Efficiency</span>
                </div>
                <div className={`text-lg font-semibold ${
                  efficiency && efficiency >= 100 ? 'text-green-600' : 
                  efficiency && efficiency >= 80 ? 'text-yellow-600' : 'text-orange-600'
                }`}>
                  {efficiency ? `${efficiency}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overtime Warning */}
        {overtime && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Task is running {getOvertimeMinutes()} minutes over the estimated time.
            </AlertDescription>
          </Alert>
        )}

        {/* Completion Status */}
        {task.status === 'COMPLETED' && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              Task completed in {totalElapsedMinutes} minutes
              {task.estimatedMinutes && (
                <>
                  {' '}({totalElapsedMinutes <= task.estimatedMinutes ? 'on time' : 
                    `${getOvertimeMinutes()}m overtime`})
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Time Tracking Tips */}
        {!isRunning && task.status === 'IN_PROGRESS' && (
          <div className="text-center text-sm text-muted-foreground">
            <p>Timer is paused. Click "Start" to resume tracking time.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}