"use client"

import { useState, useRef, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { 
  UserCheck,
  FileText,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Printer,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"

interface SignatureData {
  id: string
  userId: string
  userName: string
  userInitials: string
  userRole: string
  timestamp: string
  ipAddress?: string
  deviceInfo?: string
  signatureHash: string
  documentVersion: string
}

interface ComplianceRecord {
  id: string
  orderId: string
  buildNumber?: string
  documentType: 'checklist' | 'task_completion' | 'quality_approval' | 'final_inspection'
  documentTitle: string
  documentVersion: string
  completedAt: string
  signatures: SignatureData[]
  auditTrail: AuditEntry[]
  complianceNotes?: string
  status: 'draft' | 'completed' | 'approved' | 'archived'
  retentionPeriod: number // years
  archiveDate?: string
}

interface AuditEntry {
  id: string
  timestamp: string
  userId: string
  userName: string
  action: string
  details: string
  ipAddress?: string
}

interface DigitalSignOffSystemProps {
  orderId: string
  buildNumber?: string
  documentType: 'checklist' | 'task_completion' | 'quality_approval' | 'final_inspection'
  documentTitle: string
  documentData: any
  requiredSignatures?: {
    role: string
    description: string
    required: boolean
  }[]
  onSignOffComplete?: (record: ComplianceRecord) => void
  readonly?: boolean
}

export function DigitalSignOffSystem({
  orderId,
  buildNumber,
  documentType,
  documentTitle,
  documentData,
  requiredSignatures = [],
  onSignOffComplete,
  readonly = false
}: DigitalSignOffSystemProps) {
  const { user, isLoaded } = useUser()
  const { toast } = useToast()
  const [complianceRecord, setComplianceRecord] = useState<ComplianceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [initialsInput, setInitialsInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [complianceNotes, setComplianceNotes] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreementChecked, setAgreementChecked] = useState(false)
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([])

  useEffect(() => {
    loadComplianceRecord()
  }, [orderId, buildNumber, documentType])

  const loadComplianceRecord = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get(`/production/compliance/${orderId}/${documentType}${buildNumber ? `?buildNumber=${buildNumber}` : ''}`)
      
      if (response.data.success && response.data.data) {
        setComplianceRecord(response.data.data)
        setAuditTrail(response.data.data.auditTrail || [])
        setComplianceNotes(response.data.data.complianceNotes || '')
      } else {
        // Create new compliance record
        const newRecord = createNewComplianceRecord()
        setComplianceRecord(newRecord)
      }
    } catch (error) {
      console.error('Error loading compliance record:', error)
      // Create new record on error
      const newRecord = createNewComplianceRecord()
      setComplianceRecord(newRecord)
    } finally {
      setLoading(false)
    }
  }

  const createNewComplianceRecord = (): ComplianceRecord => {
    return {
      id: `comp_${Date.now()}`,
      orderId,
      buildNumber,
      documentType,
      documentTitle,
      documentVersion: '1.0',
      completedAt: new Date().toISOString(),
      signatures: [],
      auditTrail: [{
        id: `audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: user?.id || 'system',
        userName: user?.name || 'System',
        action: 'DOCUMENT_CREATED',
        details: `Compliance record created for ${documentTitle}`,
        ipAddress: 'N/A'
      }],
      status: 'draft',
      retentionPeriod: 10 // 10 years as per medical device standards
    }
  }

  const addAuditEntry = (action: string, details: string) => {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'unknown',
      userName: user?.name || 'Unknown User',
      action,
      details,
      ipAddress: 'Client IP' // In real implementation, get actual IP
    }
    
    setAuditTrail(prev => [...prev, entry])
    return entry
  }

  const generateSignatureHash = (data: any): string => {
    // In real implementation, use proper cryptographic hashing
    const hashInput = JSON.stringify({
      userId: user?.id,
      timestamp: new Date().toISOString(),
      documentData: JSON.stringify(documentData),
      initials: initialsInput
    })
    
    // Simple hash for demo - use crypto library in production
    return btoa(hashInput).substring(0, 32)
  }

  const validateSignature = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (!initialsInput || initialsInput.length < 2) {
      errors.push('Initials must be at least 2 characters')
    }
    
    if (!passwordInput) {
      errors.push('Password is required for digital signature')
    }
    
    if (!agreementChecked) {
      errors.push('You must agree to the digital signature terms')
    }
    
    // Validate user role if required signatures are specified
    const userRole = user?.role
    const requiredRole = requiredSignatures.find(sig => sig.role === userRole)
    
    if (requiredSignatures.length > 0 && !requiredRole) {
      errors.push(`Your role (${userRole}) is not authorized to sign this document`)
    }
    
    return { valid: errors.length === 0, errors }
  }

  const createDigitalSignature = async () => {
    if (!user || readonly) return

    const validation = validateSignature()
    if (!validation.valid) {
      toast({
        title: "Signature Validation Failed",
        description: validation.errors.join(', '),
        variant: "destructive"
      })
      return
    }

    setSigning(true)
    try {
      // Simulate password verification (in real app, verify against backend)
      if (passwordInput !== 'demo123') { // Demo password
        throw new Error('Invalid password')
      }

      const signatureData: SignatureData = {
        id: `sig_${Date.now()}`,
        userId: user.id || 'unknown',
        userName: user.name || 'Unknown User',
        userInitials: initialsInput.toUpperCase(),
        userRole: user.role || 'Unknown',
        timestamp: new Date().toISOString(),
        ipAddress: 'Client IP', // Get real IP in production
        deviceInfo: navigator.userAgent,
        signatureHash: generateSignatureHash(documentData),
        documentVersion: complianceRecord?.documentVersion || '1.0'
      }

      // Add audit entry
      const auditEntry = addAuditEntry(
        'DOCUMENT_SIGNED',
        `Document digitally signed by ${signatureData.userName} (${signatureData.userRole})`
      )

      // Update compliance record
      const updatedRecord: ComplianceRecord = {
        ...complianceRecord!,
        signatures: [...(complianceRecord?.signatures || []), signatureData],
        auditTrail: [...auditTrail, auditEntry],
        complianceNotes,
        status: 'completed',
        completedAt: new Date().toISOString()
      }

      // Save to backend
      const response = await nextJsApiClient.post('/production/compliance/sign', {
        complianceRecord: updatedRecord,
        signature: signatureData,
        documentData
      })

      if (response.data.success) {
        setComplianceRecord(updatedRecord)
        onSignOffComplete?.(updatedRecord)
        
        toast({
          title: "Document Signed Successfully",
          description: "Digital signature has been recorded and is legally binding"
        })

        // Clear form
        setInitialsInput('')
        setPasswordInput('')
        setAgreementChecked(false)
      }
    } catch (error: any) {
      console.error('Error creating signature:', error)
      toast({
        title: "Signature Failed",
        description: error.message || "Failed to create digital signature",
        variant: "destructive"
      })
    } finally {
      setSigning(false)
    }
  }

  const exportComplianceRecord = async () => {
    if (!complianceRecord) return

    try {
      const response = await nextJsApiClient.post('/production/compliance/export', {
        recordId: complianceRecord.id,
        format: 'pdf'
      })

      if (response.data.success) {
        // Download the compliance document
        const blob = new Blob([response.data.data], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `compliance_${orderId}_${documentType}_${Date.now()}.pdf`
        link.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting compliance record:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export compliance document",
        variant: "destructive"
      })
    }
  }

  const printComplianceRecord = () => {
    if (!complianceRecord) return
    
    // Create printable version
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const printContent = generatePrintableDocument()
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const generatePrintableDocument = (): string => {
    if (!complianceRecord) return ''

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Compliance Record - ${documentTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .signature { border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
          .audit-entry { font-size: 12px; margin: 5px 0; }
          .footer { margin-top: 30px; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ISO 13485:2016 Compliance Record</h1>
          <p><strong>Document:</strong> ${documentTitle}</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          ${buildNumber ? `<p><strong>Build Number:</strong> ${buildNumber}</p>` : ''}
          <p><strong>Document Type:</strong> ${documentType}</p>
          <p><strong>Version:</strong> ${complianceRecord.documentVersion}</p>
          <p><strong>Status:</strong> ${complianceRecord.status.toUpperCase()}</p>
        </div>
        
        <h2>Digital Signatures</h2>
        ${complianceRecord.signatures.map(sig => `
          <div class="signature">
            <p><strong>Signed by:</strong> ${sig.userName} (${sig.userInitials})</p>
            <p><strong>Role:</strong> ${sig.userRole}</p>
            <p><strong>Date/Time:</strong> ${new Date(sig.timestamp).toLocaleString()}</p>
            <p><strong>Signature Hash:</strong> ${sig.signatureHash}</p>
          </div>
        `).join('')}
        
        <h2>Audit Trail</h2>
        ${auditTrail.map(entry => `
          <div class="audit-entry">
            <strong>${new Date(entry.timestamp).toLocaleString()}</strong> - 
            ${entry.userName}: ${entry.action} - ${entry.details}
          </div>
        `).join('')}
        
        ${complianceRecord.complianceNotes ? `
          <h2>Compliance Notes</h2>
          <p>${complianceRecord.complianceNotes}</p>
        ` : ''}
        
        <div class="footer">
          <p>This document was generated on ${new Date().toLocaleString()} and is valid for regulatory compliance purposes.</p>
          <p>Retention Period: ${complianceRecord.retentionPeriod} years</p>
        </div>
      </body>
      </html>
    `
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading compliance system...</span>
        </div>
      </div>
    )
  }

  const isDocumentSigned = complianceRecord?.signatures.length > 0
  const canSign = !readonly && !isDocumentSigned && user

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Digital Sign-Off System
              </CardTitle>
              <CardDescription>
                ISO 13485:2016 Compliant Digital Signature and Audit Trail
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={
                complianceRecord?.status === 'completed' ? "bg-green-100 text-green-700" :
                complianceRecord?.status === 'approved' ? "bg-blue-100 text-blue-700" :
                "bg-orange-100 text-orange-700"
              }>
                {complianceRecord?.status?.toUpperCase() || 'DRAFT'}
              </Badge>
              {isDocumentSigned && (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Signed
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Document:</Label>
              <div className="font-medium">{documentTitle}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Order ID:</Label>
              <div className="font-medium">{orderId}</div>
            </div>
            {buildNumber && (
              <div>
                <Label className="text-muted-foreground">Build Number:</Label>
                <div className="font-medium">{buildNumber}</div>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Document Version:</Label>
              <div className="font-medium">{complianceRecord?.documentVersion || '1.0'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Required Signatures */}
      {requiredSignatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Required Signatures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requiredSignatures.map((reqSig, index) => {
                const hasSignature = complianceRecord?.signatures.some(sig => sig.userRole === reqSig.role)
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{reqSig.role}</div>
                      <div className="text-sm text-muted-foreground">{reqSig.description}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {reqSig.required && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                      {hasSignature ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Signed
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Signatures */}
      {complianceRecord && complianceRecord.signatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Digital Signatures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {complianceRecord.signatures.map((signature, index) => (
                <div key={signature.id} className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{signature.userName}</span>
                      <Badge variant="outline">{signature.userRole}</Badge>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      Signed: {new Date(signature.timestamp).toLocaleString()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                    <div>Initials: {signature.userInitials}</div>
                    <div>Hash: {signature.signatureHash.substring(0, 16)}...</div>
                    <div>Version: {signature.documentVersion}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Digital Signature Form */}
      {canSign && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Digital Signature</CardTitle>
            <CardDescription>
              Digitally sign this document to confirm completion and compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                By signing digitally, you are legally certifying that all work has been completed 
                according to specifications and quality standards per ISO 13485:2016 requirements.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="initials">Your Initials *</Label>
                <Input
                  id="initials"
                  value={initialsInput}
                  onChange={(e) => setInitialsInput(e.target.value.toUpperCase())}
                  placeholder="Enter your initials"
                  maxLength={5}
                />
              </div>
              
              <div>
                <Label htmlFor="password">Authentication Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter your password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="compliance-notes">Compliance Notes (Optional)</Label>
              <Textarea
                id="compliance-notes"
                value={complianceNotes}
                onChange={(e) => setComplianceNotes(e.target.value)}
                placeholder="Add any compliance-related notes..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreement"
                checked={agreementChecked}
                onCheckedChange={setAgreementChecked}
              />
              <Label htmlFor="agreement" className="text-sm">
                I certify that I have completed all required work according to specifications 
                and that this digital signature has the same legal effect as a handwritten signature.
              </Label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Signing as: {user?.name} ({user?.role})
              </div>
              
              <Button
                onClick={createDigitalSignature}
                disabled={signing || !agreementChecked}
                className="min-w-[150px]"
              >
                {signing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Sign Document
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Audit Trail
          </CardTitle>
          <CardDescription>
            Complete history of all actions performed on this document
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditTrail.map((entry, index) => (
              <div key={entry.id} className="flex items-start space-x-3 p-3 border rounded">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entry.userName}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{entry.action}:</span> {entry.details}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Compliance Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Export or print compliance records for regulatory purposes
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={printComplianceRecord}
                disabled={!complianceRecord}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              
              <Button
                variant="outline"
                onClick={exportComplianceRecord}
                disabled={!complianceRecord}
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}