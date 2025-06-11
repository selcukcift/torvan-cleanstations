"use client"

import React, { useState, useEffect } from "react"
import { QCFormInterface } from "./QCFormInterface"
import { DocumentPreview } from "@/components/ui/document-preview"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  FileText, 
  Image as ImageIcon, 
  Eye, 
  Camera,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  Loader2
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

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

interface QCFormWithDocumentsProps {
  orderId: string
  orderData: any
  template: any
  onSubmit: (data: any) => void
  loading?: boolean
}

interface QCPhoto {
  id: string
  filename: string
  category: string
  notes: string
  capturedAt: string
}

export function QCFormWithDocuments({ 
  orderId, 
  orderData, 
  template, 
  onSubmit, 
  loading = false 
}: QCFormWithDocumentsProps) {
  const { toast } = useToast()
  const [orderDocuments, setOrderDocuments] = useState<DocumentFile[]>([])
  const [qcPhotos, setQcPhotos] = useState<QCPhoto[]>([])
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null)
  const [showDocumentPreview, setShowDocumentPreview] = useState(false)
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [photoCapturing, setPhotoCapturing] = useState(false)
  const [photoForm, setPhotoForm] = useState({
    category: 'inspection',
    notes: ''
  })
  const [showPhotoCapture, setShowPhotoCapture] = useState(false)

  useEffect(() => {
    fetchOrderDocuments()
    fetchQCPhotos()
  }, [orderId])

  const fetchOrderDocuments = async () => {
    try {
      setDocumentsLoading(true)
      const response = await nextJsApiClient.get(`/orders/${orderId}`)
      
      if (response.data.success && response.data.data.associatedDocuments) {
        setOrderDocuments(response.data.data.associatedDocuments)
      }
    } catch (error) {
      console.error('Error fetching order documents:', error)
      toast({
        title: "Warning",
        description: "Could not load order documents",
        variant: "destructive"
      })
    } finally {
      setDocumentsLoading(false)
    }
  }

  const fetchQCPhotos = async () => {
    try {
      // Fetch QC-specific photos for this order
      const response = await nextJsApiClient.get(`/orders/${orderId}/qc/photos`)
      
      if (response.data.success) {
        setQcPhotos(response.data.data || [])
      }
    } catch (error) {
      // Silently fail if endpoint doesn't exist yet
      console.log('QC photos endpoint not available yet')
    }
  }

  const handleDocumentPreview = (document: DocumentFile) => {
    setSelectedDocument(document)
    setShowDocumentPreview(true)
  }

  const handlePhotoCapture = async (imageData: string) => {
    setPhotoCapturing(true)
    try {
      // Convert base64 to blob
      const response = await fetch(imageData)
      const blob = await response.blob()
      
      // Create FormData
      const formData = new FormData()
      formData.append('file', blob, `qc-photo-${Date.now()}.jpg`)
      formData.append('category', photoForm.category)
      formData.append('notes', photoForm.notes)
      formData.append('orderId', orderId)
      formData.append('type', 'qc-photo')
      
      // Upload photo
      const uploadResponse = await nextJsApiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      if (uploadResponse.data.success) {
        toast({
          title: "Photo Captured",
          description: "QC photo has been saved successfully"
        })
        setShowPhotoCapture(false)
        setPhotoForm({ category: 'inspection', notes: '' })
        fetchQCPhotos()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to capture photo",
        variant: "destructive"
      })
    } finally {
      setPhotoCapturing(false)
    }
  }

  const categorizeDocuments = (documents: DocumentFile[]) => {
    const categories = {
      'Technical Drawings': documents.filter(doc => 
        doc.mimeType.includes('dwg') || 
        doc.mimeType.includes('dxf') || 
        doc.originalName.toLowerCase().includes('drawing')
      ),
      'Purchase Orders': documents.filter(doc => 
        doc.originalName.toLowerCase().includes('po') ||
        doc.category === 'purchase-order'
      ),
      'Specifications': documents.filter(doc => 
        doc.mimeType === 'application/pdf' &&
        (doc.originalName.toLowerCase().includes('spec') ||
         doc.originalName.toLowerCase().includes('requirement'))
      ),
      'Other': documents.filter(doc => {
        const isDwg = doc.mimeType.includes('dwg') || doc.mimeType.includes('dxf')
        const isPO = doc.originalName.toLowerCase().includes('po') || doc.category === 'purchase-order'
        const isSpec = doc.mimeType === 'application/pdf' && 
          (doc.originalName.toLowerCase().includes('spec') || doc.originalName.toLowerCase().includes('requirement'))
        return !isDwg && !isPO && !isSpec
      })
    }
    return categories
  }

  const categorizedDocs = categorizeDocuments(orderDocuments)

  return (
    <div className="space-y-6">
      {/* Documents Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Order Documents & References
              </CardTitle>
              <CardDescription>
                Access technical drawings, specifications, and order documents for inspection reference
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPhotoCapture(true)}
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture Photo
              </Button>
              <Badge variant="outline">
                {orderDocuments.length} Documents
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading documents...
            </div>
          ) : orderDocuments.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No documents found for this order. Technical drawings and specifications should be available for QC inspection.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="technical" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="technical">
                  Technical ({categorizedDocs['Technical Drawings'].length})
                </TabsTrigger>
                <TabsTrigger value="orders">
                  Orders ({categorizedDocs['Purchase Orders'].length})
                </TabsTrigger>
                <TabsTrigger value="specs">
                  Specs ({categorizedDocs['Specifications'].length})
                </TabsTrigger>
                <TabsTrigger value="photos">
                  Photos ({qcPhotos.length})
                </TabsTrigger>
              </TabsList>
              
              {Object.entries(categorizedDocs).map(([category, docs]) => (
                <TabsContent key={category.toLowerCase()} value={category.toLowerCase().replace(' ', '')}>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {docs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                          onClick={() => handleDocumentPreview(doc)}
                        >
                          <div className="flex items-center gap-3">
                            {doc.mimeType.startsWith('image/') ? (
                              <ImageIcon className="w-5 h-5 text-blue-500" />
                            ) : (
                              <FileText className="w-5 h-5 text-blue-500" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{doc.originalName}</p>
                              <p className="text-xs text-slate-500">{doc.mimeType}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
              
              <TabsContent value="photos">
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {qcPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <Camera className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">{photo.filename}</p>
                            <p className="text-xs text-slate-500">{photo.category} - {photo.notes}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {qcPhotos.length === 0 && (
                      <div className="text-center py-4 text-slate-500">
                        <Camera className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">No QC photos captured yet</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* QC Form */}
      <QCFormInterface
        template={template}
        orderData={orderData}
        onSubmit={onSubmit}
        loading={loading}
      />

      {/* Document Preview Dialog */}
      <DocumentPreview
        file={selectedDocument}
        open={showDocumentPreview}
        onOpenChange={setShowDocumentPreview}
      />

      {/* Photo Capture Dialog */}
      {showPhotoCapture && (
        <PhotoCaptureDialog
          open={showPhotoCapture}
          onOpenChange={setShowPhotoCapture}
          onCapture={handlePhotoCapture}
          photoForm={photoForm}
          setPhotoForm={setPhotoForm}
          loading={photoCapturing}
        />
      )}
    </div>
  )
}

// Photo Capture Component
interface PhotoCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (imageData: string) => void
  photoForm: any
  setPhotoForm: (form: any) => void
  loading: boolean
}

function PhotoCaptureDialog({ 
  open, 
  onOpenChange, 
  onCapture, 
  photoForm, 
  setPhotoForm, 
  loading 
}: PhotoCaptureDialogProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
    }
    
    return () => stopCamera()
  }, [open])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      if (context) {
        context.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageData)
      }
    }
  }

  const handleSave = () => {
    if (capturedImage) {
      onCapture(capturedImage)
    }
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/80" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Capture QC Photo</h3>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <select
                  value={photoForm.category}
                  onChange={(e) => setPhotoForm({ ...photoForm, category: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="inspection">General Inspection</option>
                  <option value="defect">Defect/Issue</option>
                  <option value="measurement">Measurement</option>
                  <option value="assembly">Assembly Detail</option>
                  <option value="packaging">Packaging</option>
                </select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={photoForm.notes}
                  onChange={(e) => setPhotoForm({ ...photoForm, notes: e.target.value })}
                  placeholder="Describe what this photo shows..."
                />
              </div>
            </div>
            
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {!capturedImage ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}
              
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="flex items-center justify-center gap-4">
              {!capturedImage ? (
                <Button onClick={capturePhoto} size="lg">
                  <Camera className="w-5 h-5 mr-2" />
                  Capture Photo
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setCapturedImage(null)}>
                    Retake
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Photo
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}