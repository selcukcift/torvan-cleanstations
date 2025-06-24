"use client"

import React, { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Camera, 
  Upload, 
  X, 
  Image as ImageIcon, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Download,
  Eye
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { nextJsApiClient } from "@/lib/api"

interface PhotoAttachment {
  id?: string
  file?: File
  dataUrl?: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  uploading?: boolean
  uploaded?: boolean
  error?: string
}

interface QCPhotoCaptureProps {
  qcItemId: string
  qcItemName: string
  orderId: string
  existingAttachment?: {
    id: string
    filename: string
    originalName: string
    size: number
    mimeType: string
  }
  onAttachmentUpdate?: (attachment: PhotoAttachment | null) => void
  disabled?: boolean
}

export function QCPhotoCapture({ 
  qcItemId, 
  qcItemName, 
  orderId,
  existingAttachment,
  onAttachmentUpdate,
  disabled = false
}: QCPhotoCaptureProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [attachment, setAttachment] = useState<PhotoAttachment | null>(
    existingAttachment ? {
      ...existingAttachment,
      uploaded: true
    } : null
  )
  const [cameraActive, setCameraActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setCameraActive(true)
    } catch (error) {
      console.error('Error accessing camera:', error)
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions or use file upload.",
        variant: "destructive"
      })
    }
  }, [toast])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setCameraActive(false)
  }, [stream])

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (!blob) return
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `qc-photo-${qcItemId}-${timestamp}.jpg`
      
      const file = new File([blob], filename, { type: 'image/jpeg' })
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      
      const newAttachment: PhotoAttachment = {
        file,
        dataUrl,
        filename,
        originalName: filename,
        size: file.size,
        mimeType: 'image/jpeg',
        uploading: false,
        uploaded: false
      }
      
      setAttachment(newAttachment)
      stopCamera()
      
      toast({
        title: "Photo Captured",
        description: "Photo captured successfully. Remember to save your QC inspection to upload the photo.",
      })
    }, 'image/jpeg', 0.8)
  }, [qcItemId, stopCamera, toast])

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPEG, PNG, etc.)",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      
      const newAttachment: PhotoAttachment = {
        file,
        dataUrl,
        filename: file.name,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        uploading: false,
        uploaded: false
      }
      
      setAttachment(newAttachment)
      
      toast({
        title: "Photo Selected",
        description: "Photo selected successfully. Remember to save your QC inspection to upload the photo.",
      })
    }
    reader.readAsDataURL(file)
  }

  // Remove attachment
  const removeAttachment = () => {
    setAttachment(null)
    onAttachmentUpdate?.(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Upload attachment (this would be called by the parent component when saving)
  const uploadAttachment = async (attachment: PhotoAttachment): Promise<string | null> => {
    if (!attachment.file || attachment.uploaded) return attachment.id || null

    try {
      const formData = new FormData()
      formData.append('file', attachment.file)
      formData.append('category', 'qc_inspection')
      formData.append('orderId', orderId)
      formData.append('qcItemId', qcItemId)
      
      const response = await nextJsApiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      if (response.data.success) {
        return response.data.file.id
      } else {
        throw new Error(response.data.error || 'Upload failed')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      throw error
    }
  }

  // Expose upload function to parent
  React.useEffect(() => {
    if (attachment && !attachment.uploaded) {
      onAttachmentUpdate?.(attachment)
    }
  }, [attachment, onAttachmentUpdate])

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="w-4 h-4" />
          Photo Documentation
        </CardTitle>
        <CardDescription className="text-xs">
          {qcItemName} - Capture or upload photos for inspection evidence
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Camera View */}
        {cameraActive && (
          <div className="space-y-3">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full max-w-md mx-auto rounded border bg-black"
            />
            <div className="flex justify-center gap-2">
              <Button onClick={capturePhoto} className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Capture
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Canvas for photo capture (hidden) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Attachment Display */}
        {attachment && (
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              {/* Photo Preview */}
              {attachment.dataUrl && (
                <div className="w-16 h-16 border border-gray-200 rounded overflow-hidden flex-shrink-0">
                  <img 
                    src={attachment.dataUrl} 
                    alt="QC Photo"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Attachment Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium truncate">{attachment.originalName}</span>
                  {attachment.uploaded && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                  {attachment.uploading && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Uploading
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {(attachment.size / 1024).toFixed(1)} KB • {attachment.mimeType}
                </div>
                {attachment.error && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-600">{attachment.error}</span>
                  </div>
                )}
              </div>
              
              {/* Remove Button */}
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeAttachment}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!attachment && !cameraActive && !disabled && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={startCamera}
              className="flex items-center gap-2"
              variant="default"
            >
              <Camera className="w-4 h-4" />
              Take Photo
            </Button>
            
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Photo
            </Button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Instructions */}
        {!attachment && (
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">
            <div className="font-medium mb-1">Photo Guidelines:</div>
            <ul className="space-y-1">
              <li>• Ensure good lighting and clear focus</li>
              <li>• Include relevant inspection area or component</li>
              <li>• Max file size: 10MB</li>
              <li>• Supported formats: JPEG, PNG, WebP</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Export the upload function for use in parent components
export const uploadQCPhoto = async (
  attachment: PhotoAttachment,
  orderId: string,
  qcItemId: string
): Promise<string | null> => {
  if (!attachment.file || attachment.uploaded) return attachment.id || null

  try {
    const formData = new FormData()
    formData.append('file', attachment.file)
    formData.append('category', 'qc_inspection')
    formData.append('orderId', orderId)
    formData.append('qcItemId', qcItemId)
    
    const response = await nextJsApiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    if (response.data.success) {
      return response.data.file.id
    } else {
      throw new Error(response.data.error || 'Upload failed')
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    throw error
  }
}