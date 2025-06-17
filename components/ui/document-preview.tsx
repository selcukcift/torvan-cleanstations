/**
 * Document Preview Component
 * Supports PDF and image preview without downloading
 */

"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  FileText, 
  Image as ImageIcon, 
  Download, 
  ExternalLink, 
  Eye, 
  FileIcon, 
  Calendar,
  User,
  HardDrive,
  Loader2,
  AlertTriangle,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2
} from "lucide-react"
import { format } from "date-fns"

interface DocumentFile {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  uploadedAt: string
  uploadedBy?: string
  category?: string
  metadata?: any
}

interface DocumentPreviewProps {
  file: DocumentFile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  downloadUrl?: string
  onDownload?: () => void
}

const PREVIEW_SUPPORTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain'
]

const FILE_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  'application/pdf': FileText,
  'image/jpeg': ImageIcon,
  'image/jpg': ImageIcon,
  'image/png': ImageIcon,
  'image/gif': ImageIcon,
  'image/webp': ImageIcon,
  'text/plain': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'application/dwg': FileIcon,
  'application/dxf': FileIcon,
}

export function DocumentPreview({ file, open, onOpenChange, downloadUrl, onDownload }: DocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(100)
  const [imageRotation, setImageRotation] = useState(0)

  const isPreviewSupported = file ? PREVIEW_SUPPORTED_TYPES.includes(file.mimeType) : false
  const isPdf = file?.mimeType === 'application/pdf'
  const isImage = file?.mimeType?.startsWith('image/') || false
  const isText = file?.mimeType === 'text/plain'
  
  const FileIconComponent = file ? (FILE_TYPE_ICONS[file.mimeType] || FileIcon) : FileIcon

  useEffect(() => {
    if (file && isPreviewSupported && open) {
      loadPreview()
    } else {
      setPreviewUrl(null)
      setPreviewError(null)
    }
    
    // Reset zoom and rotation when file changes
    setImageZoom(100)
    setImageRotation(0)
  }, [file, open])

  const loadPreview = async () => {
    if (!file) return

    setPreviewLoading(true)
    setPreviewError(null)

    try {
      // Use the download endpoint with inline=true for preview
      const previewEndpoint = downloadUrl 
        ? `${downloadUrl}?inline=true`
        : `/api/v1/files/${file.id}/download?inline=true`
      
      setPreviewUrl(previewEndpoint)
    } catch (error) {
      console.error('Error loading preview:', error)
      setPreviewError('Failed to load preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else if (file) {
      const downloadEndpoint = downloadUrl || `/api/v1/files/${file.id}/download`
      window.open(downloadEndpoint, '_blank')
    }
  }

  const handleOpenExternal = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const resetImageView = () => {
    setImageZoom(100)
    setImageRotation(0)
  }

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileIconComponent className="w-6 h-6 text-blue-500" />
              <div>
                <DialogTitle className="text-lg">{file.originalName}</DialogTitle>
                <DialogDescription>
                  File information and preview
                </DialogDescription>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline">{file.mimeType}</Badge>
                  <span>•</span>
                  <span>{formatFileSize(file.size)}</span>
                  {file.category && (
                    <>
                      <span>•</span>
                      <Badge variant="secondary">{file.category}</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isPreviewSupported && (
                <Button
                  onClick={handleOpenExternal}
                  variant="outline"
                  size="sm"
                  disabled={!previewUrl}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open External
                </Button>
              )}
              
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 flex overflow-hidden">
          {/* File Info Sidebar */}
          <div className="w-64 border-r bg-slate-50 p-4 flex-shrink-0 overflow-y-auto">
            <h3 className="font-semibold mb-3">File Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-600 mb-1">Filename</p>
                <p className="font-medium break-all">{file.filename}</p>
              </div>
              
              <div>
                <p className="text-slate-600 mb-1">Original Name</p>
                <p className="font-medium break-all">{file.originalName}</p>
              </div>

              <div>
                <p className="text-slate-600 mb-1">File Type</p>
                <Badge variant="outline">{file.mimeType}</Badge>
              </div>

              <div>
                <p className="text-slate-600 mb-1">Size</p>
                <p className="font-medium">{formatFileSize(file.size)}</p>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-slate-600">Uploaded</p>
                  <p className="font-medium">
                    {format(new Date(file.uploadedAt), "MMM dd, yyyy 'at' HH:mm")}
                  </p>
                </div>
              </div>

              {file.uploadedBy && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-slate-600">Uploaded by</p>
                    <p className="font-medium">{file.uploadedBy}</p>
                  </div>
                </div>
              )}

              {file.category && (
                <div>
                  <p className="text-slate-600 mb-1">Category</p>
                  <Badge variant="secondary">{file.category}</Badge>
                </div>
              )}

              {/* Image Controls */}
              {isImage && previewUrl && (
                <div className="border-t pt-3 mt-3">
                  <h4 className="font-semibold mb-2">Image Controls</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Zoom</span>
                      <div className="flex items-center space-x-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setImageZoom(Math.max(25, imageZoom - 25))}
                          disabled={imageZoom <= 25}
                        >
                          <ZoomOut className="w-3 h-3" />
                        </Button>
                        <span className="text-xs w-12 text-center">{imageZoom}%</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setImageZoom(Math.min(400, imageZoom + 25))}
                          disabled={imageZoom >= 400}
                        >
                          <ZoomIn className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Rotate</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setImageRotation((imageRotation + 90) % 360)}
                      >
                        <RotateCw className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={resetImageView}
                      className="w-full"
                    >
                      Reset View
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex-1 flex flex-col">
            {previewLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Loading preview...</span>
                </div>
              </div>
            ) : previewError ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600 font-medium mb-2">Preview Error</p>
                  <p className="text-sm text-slate-600 mb-4">{previewError}</p>
                  <Button onClick={handleDownload} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </Button>
                </div>
              </div>
            ) : !isPreviewSupported ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium mb-2">Preview not available</p>
                  <p className="text-sm text-slate-500 mb-4">
                    This file type ({file.mimeType}) cannot be previewed in the browser.
                  </p>
                  <Button onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download to View
                  </Button>
                </div>
              </div>
            ) : previewUrl && isPdf ? (
              <div className="flex-1">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title={`PDF Preview: ${file.originalName}`}
                />
              </div>
            ) : previewUrl && isImage ? (
              <ScrollArea className="flex-1">
                <div className="flex items-center justify-center min-h-full p-4">
                  <img
                    src={previewUrl}
                    alt={file.originalName}
                    className="max-w-none transition-transform duration-200"
                    style={{
                      transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                      transformOrigin: 'center'
                    }}
                    onError={() => setPreviewError('Failed to load image')}
                  />
                </div>
              </ScrollArea>
            ) : previewUrl && isText ? (
              <div className="flex-1">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0 bg-white"
                  title={`Text Preview: ${file.originalName}`}
                />
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}