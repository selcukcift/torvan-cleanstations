"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  FileText,
  Download,
  Eye,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  Share2,
  FileCheck,
  Shield,
  Award,
  Package,
  Signature,
  Calendar,
  User,
  Building,
  Settings
} from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { nextJsApiClient } from '@/lib/api'

interface ProductionDocument {
  id: string
  orderId: string
  buildNumber?: string
  type: 'CHECKLIST_REPORT' | 'COMPLETION_CERTIFICATE' | 'QC_REPORT' | 'COMPLIANCE_PACKAGE' | 'PRODUCTION_SUMMARY'
  title: string
  version: number
  content: string
  format: string
  approved: boolean
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  order: {
    poNumber: string
    customerName: string
    orderStatus: string
  }
  approver?: {
    fullName: string
    initials: string
  }
}

const documentTypeLabels = {
  'CHECKLIST_REPORT': 'Production Checklist Report',
  'COMPLETION_CERTIFICATE': 'Completion Certificate',
  'QC_REPORT': 'Quality Control Report',
  'COMPLIANCE_PACKAGE': 'Compliance Documentation',
  'PRODUCTION_SUMMARY': 'Production Summary'
}

const documentTypeIcons = {
  'CHECKLIST_REPORT': <FileCheck className="w-4 h-4" />,
  'COMPLETION_CERTIFICATE': <Award className="w-4 h-4" />,
  'QC_REPORT': <Shield className="w-4 h-4" />,
  'COMPLIANCE_PACKAGE': <Building className="w-4 h-4" />,
  'PRODUCTION_SUMMARY': <Package className="w-4 h-4" />
}

export function ProductionDocumentManagement() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [documents, setDocuments] = useState<ProductionDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  
  // Document generation state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    orderId: '',
    buildNumber: '',
    type: 'COMPLETION_CERTIFICATE',
    title: '',
    includePhotos: true,
    includeSignatures: true
  })
  
  // Document preview state
  const [previewDocument, setPreviewDocument] = useState<ProductionDocument | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [typeFilter, statusFilter])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (typeFilter !== 'ALL') params.append('type', typeFilter)
      if (statusFilter !== 'ALL') params.append('approved', statusFilter === 'APPROVED' ? 'true' : 'false')
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await nextJsApiClient.get(`/production/documents?${params}`)
      
      if (response.data.success) {
        setDocuments(response.data.data)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch production documents',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchDocuments()
  }

  const generateDocument = async () => {
    try {
      const response = await nextJsApiClient.post('/production/documents/generate', generateForm)
      
      if (response.data.success) {
        toast({
          title: 'Document Generated',
          description: `${documentTypeLabels[generateForm.type as keyof typeof documentTypeLabels]} has been created successfully`
        })
        
        setGenerateDialogOpen(false)
        setGenerateForm({
          orderId: '',
          buildNumber: '',
          type: 'COMPLETION_CERTIFICATE',
          title: '',
          includePhotos: true,
          includeSignatures: true
        })
        fetchDocuments()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to generate document',
        variant: 'destructive'
      })
    }
  }

  const approveDocument = async (documentId: string) => {
    try {
      const response = await nextJsApiClient.put(`/production/documents/${documentId}/approve`)
      
      if (response.data.success) {
        toast({
          title: 'Document Approved',
          description: 'Document has been approved successfully'
        })
        fetchDocuments()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve document',
        variant: 'destructive'
      })
    }
  }

  const downloadDocument = async (documentId: string, title: string) => {
    try {
      const response = await nextJsApiClient.get(`/production/documents/${documentId}/download`, {
        responseType: 'blob'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${title}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive'
      })
    }
  }

  const previewDocument = async (document: ProductionDocument) => {
    setPreviewDocument(document)
    setPreviewDialogOpen(true)
  }

  const getStatusColor = (approved: boolean): string => {
    return approved 
      ? 'bg-green-100 text-green-700 border-green-200' 
      : 'bg-yellow-100 text-yellow-700 border-yellow-200'
  }

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'COMPLETION_CERTIFICATE': 'bg-blue-100 text-blue-700',
      'QC_REPORT': 'bg-purple-100 text-purple-700',
      'CHECKLIST_REPORT': 'bg-green-100 text-green-700',
      'COMPLIANCE_PACKAGE': 'bg-orange-100 text-orange-700',
      'PRODUCTION_SUMMARY': 'bg-gray-100 text-gray-700'
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Document Management</h2>
          <p className="text-slate-600">Generate, manage, and approve production documentation</p>
        </div>
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Generate Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Generate Production Document</DialogTitle>
              <DialogDescription>
                Create a new production document for an order
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Order ID</label>
                <Input
                  value={generateForm.orderId}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, orderId: e.target.value }))}
                  placeholder="Enter order ID"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Build Number (Optional)</label>
                <Input
                  value={generateForm.buildNumber}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, buildNumber: e.target.value }))}
                  placeholder="Enter build number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Document Type</label>
                <Select 
                  value={generateForm.type} 
                  onValueChange={(value) => setGenerateForm(prev => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(documentTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center space-x-2">
                          {documentTypeIcons[value as keyof typeof documentTypeIcons]}
                          <span>{label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Document Title</label>
                <Input
                  value={generateForm.title}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter document title"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={generateDocument}>
                Generate Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Documents</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {documents.filter(d => !d.approved).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {documents.filter(d => d.approved).length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">This Week</p>
                <p className="text-2xl font-bold">
                  {documents.filter(d => {
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return new Date(d.createdAt) >= weekAgo
                  }).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Production Documents</CardTitle>
              <CardDescription>
                Manage production certificates, reports, and compliance documentation
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex items-center space-x-2">
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button type="submit" size="sm" variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </form>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No production documents found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{document.title}</p>
                        <p className="text-sm text-slate-600">
                          {document.buildNumber ? `Build: ${document.buildNumber}` : 'All builds'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{document.order.poNumber}</p>
                        <p className="text-sm text-slate-600">{document.order.customerName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(document.type)} variant="outline">
                        {documentTypeIcons[document.type]}
                        <span className="ml-1">{documentTypeLabels[document.type]}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(document.approved)} variant="outline">
                        {document.approved ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approved
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>v{document.version}</TableCell>
                    <TableCell>
                      {format(new Date(document.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {document.approver ? (
                        <div>
                          <p className="text-sm font-medium">{document.approver.fullName}</p>
                          <p className="text-xs text-slate-500">
                            {document.approvedAt && format(new Date(document.approvedAt), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => previewDocument(document)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocument(document.id, document.title)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {!document.approved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveDocument(document.id)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {previewDocument && documentTypeIcons[previewDocument.type]}
              <span>{previewDocument?.title}</span>
            </DialogTitle>
            <DialogDescription>
              {previewDocument && `${documentTypeLabels[previewDocument.type]} - Version ${previewDocument.version}`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {previewDocument && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Document Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Order:</p>
                      <p className="font-medium">{previewDocument.order.poNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Customer:</p>
                      <p className="font-medium">{previewDocument.order.customerName}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Created:</p>
                      <p className="font-medium">{format(new Date(previewDocument.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Status:</p>
                      <Badge className={getStatusColor(previewDocument.approved)} variant="outline">
                        {previewDocument.approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Document Content</h4>
                  <div className="bg-white border rounded-lg p-4 min-h-[200px]">
                    <pre className="whitespace-pre-wrap text-sm">{previewDocument.content}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            {previewDocument && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => downloadDocument(previewDocument.id, previewDocument.title)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                {!previewDocument.approved && (
                  <Button onClick={() => {
                    approveDocument(previewDocument.id)
                    setPreviewDialogOpen(false)
                  }}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}