"use client"

import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, Download, Image as ImageIcon, FileText, Paperclip, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QCResult {
  id: string
  overallStatus: 'PASSED' | 'FAILED'
  qcPerformedById: string
  qcPerformedBy: {
    fullName: string
  }
  qcTimestamp?: string
  notes?: string
  qcFormTemplate: {
    name: string
    version: string
  }
  itemResults: Array<{
    id: string
    qcFormTemplateItem: {
      checklistItem: string
      itemType: string
      section: string
    }
    resultValue: string
    isConformant?: boolean
    notes?: string
    attachedDocument?: {
      id: string
      filename: string
      originalName: string
      size: number
      mimeType: string
    }
  }>
}

interface QCCertificateDocumentProps {
  qcResult: QCResult
  orderId: string
  orderDetails?: {
    poNumber?: string
    customerName?: string
    buildNumbers?: string[]
    productType?: string
    jobId?: string
    sinkDimensions?: {
      length?: number
      width?: number
      depth?: number
    }
  }
}

export function QCCertificateDocument({ qcResult, orderId, orderDetails }: QCCertificateDocumentProps) {
  const handleExport = () => {
    // TODO: Implement PDF export functionality
    console.log('Export functionality to be implemented')
  }

  // Function to improve specific wording issues
  const improveItemWording = (originalText: string): string => {
    const text = originalText.toLowerCase()
    
    // Fix mounting holes wording
    if (text.includes('faucet mounting holes drilled and positioned per drawing specifications')) {
      return 'Faucet mounting holes - position and specifications'
    }
    
    if (text.includes('all mounting holes match drawing specifications - check positions and sizes')) {
      return 'All mounting holes - positions and sizes per specifications'
    }
    
    // Default: return original text
    return originalText
  }



  // Group items by section and filter out Job ID items
  const groupedItems = qcResult.itemResults
    .filter(item => !item.qcFormTemplateItem.checklistItem.toLowerCase().includes('job id'))
    .reduce((acc, item) => {
      let section = item.qcFormTemplateItem.section || 'General'
      
      // Map section names to more meaningful headers
      const sectionMapping: Record<string, string> = {
        'Final Assembly': 'Primary Assembly',
        'Structural Components': 'Primary Assembly', 
        'Mounting & Holes': 'Hardware Installation',
        'Basin Inspection': 'Basin Configuration'
      }
      
      section = sectionMapping[section] || section
      
      if (!acc[section]) acc[section] = []
      acc[section].push(item)
      return acc
    }, {} as Record<string, typeof qcResult.itemResults>)

  // Get all attachments
  const attachments = qcResult.itemResults
    .filter(item => item.attachedDocument)
    .map(item => ({
      ...item.attachedDocument!,
      itemName: item.qcFormTemplateItem.checklistItem,
      section: item.qcFormTemplateItem.section || 'General'
    }))

  const hasAttachments = attachments.length > 0

  return (
    <div className="qc-certificate-container">
      {/* Print-specific styles */}
      <style jsx>{`
        @media print {
          .qc-certificate-container {
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .print-hide {
            display: none !important;
          }
          
          .print-page-break {
            page-break-before: always;
          }
          
          .print-table {
            border-collapse: collapse;
            width: 100%;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 4px 8px;
            text-align: left;
          }
          
          .signature-area {
            border-top: 1px solid #000;
            margin-top: 20px;
            padding-top: 10px;
          }
          
          .company-logo {
            height: 60px;
          }
        }
        
      `}</style>

      {/* Action Buttons - Hidden on print */}
      <div className="flex justify-end gap-2 mb-4 print-hide">
        <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      {/* QC Inspection Report */}
      <Card className="bg-white border shadow-lg">
        <CardContent className="p-6 space-y-6">
          {/* Document Header */}
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-xl font-bold text-gray-800 mb-1">
              Pre-QC Inspection Report
            </h1>
            <div className="text-lg text-gray-600">
              {(() => {
                // Create meaningful subtitle with build number and model
                const buildNumber = orderDetails?.buildNumbers?.[0] || 'Build-001'
                const sinkModel = orderDetails?.productType || 'CleanStation'
                // Clean template name (remove any order ID or extra text)
                const templateName = qcResult.qcFormTemplate.name.split(' - ')[0]
                
                return `${buildNumber} • ${sinkModel} • ${templateName}`
              })()}
            </div>
          </div>

          {/* Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Inspection Details</h3>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-medium">Date:</span>
                  <span>
                    {qcResult.qcTimestamp 
                      ? format(new Date(qcResult.qcTimestamp), "MMM dd, yyyy")
                      : 'Not specified'
                    }
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-medium">Inspector:</span>
                  <span>{qcResult.qcPerformedBy.fullName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="font-medium">Template:</span>
                  <span>v{qcResult.qcFormTemplate.version}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Sink Details</h3>
              <div className="space-y-2 text-sm">
                {orderDetails?.poNumber && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">PO Number:</span>
                    <span>{orderDetails.poNumber}</span>
                  </div>
                )}
                {orderDetails?.customerName && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Customer:</span>
                    <span>{orderDetails.customerName}</span>
                  </div>
                )}
                {orderDetails?.productType && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Sink Model:</span>
                    <span>{orderDetails.productType}</span>
                  </div>
                )}
                {orderDetails?.buildNumbers?.[0] && (
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">Build Number:</span>
                    <span className="font-mono">{orderDetails.buildNumbers[0]}</span>
                  </div>
                )}
                {/* Get Job ID from inspection results */}
                {(() => {
                  const jobIdItem = qcResult.itemResults.find(item => 
                    item.qcFormTemplateItem.checklistItem.toLowerCase().includes('job id')
                  )
                  return jobIdItem?.resultValue && (
                    <div className="grid grid-cols-2 gap-2">
                      <span className="font-medium">Job ID:</span>
                      <span className="font-mono">{jobIdItem.resultValue}</span>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>


          {/* Detailed Inspection Results */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Detailed Inspection Results</h3>
            
            {Object.entries(groupedItems).map(([section, items]) => (
              <div key={section}>
                <h4 className="font-semibold text-md mb-2 text-gray-700 border-b border-gray-200 pb-1">
                  {section}
                </h4>
                <Table className="print-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Inspection Item</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-20">Notes</TableHead>
                      <TableHead className="w-20">Attachment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-center font-mono text-sm">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {improveItemWording(item.qcFormTemplateItem.checklistItem)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="secondary" 
                            className={`${
                              item.isConformant 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            } text-xs`}
                          >
                            {item.isConformant ? 'PASS' : 'FAIL'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.notes ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                              onClick={() => {
                                // Show notes in a modal or popup
                                alert(`Notes for "${improveItemWording(item.qcFormTemplateItem.checklistItem)}":\n\n${item.notes}`)
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.attachedDocument ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                              onClick={() => {
                                // Handle attachment viewing/download
                                alert(`Attachment: ${item.attachedDocument?.originalName}\nSize: ${((item.attachedDocument?.size || 0) / 1024).toFixed(1)} KB`)
                              }}
                            >
                              {item.attachedDocument.mimeType.startsWith('image/') ? (
                                <ImageIcon className="w-3 h-3 mr-1" />
                              ) : (
                                <Paperclip className="w-3 h-3 mr-1" />
                              )}
                              View
                            </Button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>

          {/* Photo Documentation & Attachments */}
          {hasAttachments && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Photo Documentation & Attachments</h3>
              
              {/* Images Gallery */}
              {attachments.filter(att => att.mimeType.startsWith('image/')).length > 0 && (
                <div>
                  <h4 className="font-semibold text-md mb-3 text-gray-700">Inspection Photos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-4">
                    {attachments
                      .filter(att => att.mimeType.startsWith('image/'))
                      .map((attachment) => (
                        <div key={attachment.id} className="border border-gray-200 rounded p-2">
                          <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                            <span className="sr-only">Photo: {attachment.originalName}</span>
                          </div>
                          <div className="text-xs text-gray-600 text-center">
                            <div className="font-medium truncate">{attachment.itemName}</div>
                            <div className="text-gray-500">{attachment.originalName}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Document Attachments */}
              {attachments.filter(att => !att.mimeType.startsWith('image/')).length > 0 && (
                <div>
                  <h4 className="font-semibold text-md mb-3 text-gray-700">Document Attachments</h4>
                  <Table className="print-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Inspection Item</TableHead>
                        <TableHead>Document Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attachments
                        .filter(att => !att.mimeType.startsWith('image/'))
                        .map((attachment) => (
                          <TableRow key={attachment.id}>
                            <TableCell className="font-medium">{attachment.itemName}</TableCell>
                            <TableCell>{attachment.originalName}</TableCell>
                            <TableCell className="text-sm">{attachment.mimeType}</TableCell>
                            <TableCell className="text-sm">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-800">Attachment Note:</div>
                    <div>
                      All attached photos and documents are integral parts of this quality control 
                      inspection certificate and provide visual evidence of the inspection process 
                      and results. Total attachments: {attachments.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inspector Notes */}
          {qcResult.notes && (
            <div className="border border-gray-300 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">Inspector Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{qcResult.notes}</p>
            </div>
          )}

          {/* Inspector Information */}
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Inspected By</h4>
                <div className="space-y-1">
                  <div>{qcResult.qcPerformedBy.fullName}</div>
                  <div className="text-gray-600">QC Inspector</div>
                  <div className="text-gray-600">
                    {qcResult.qcTimestamp 
                      ? format(new Date(qcResult.qcTimestamp), "MMM dd, yyyy 'at' HH:mm")
                      : 'Date not specified'
                    }
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Report Information</h4>
                <div className="space-y-1">
                  <div>Template: {qcResult.qcFormTemplate.name} v{qcResult.qcFormTemplate.version}</div>
                  <div className="text-gray-600">Generated: {format(new Date(), "MMM dd, yyyy 'at' HH:mm")}</div>
                  <div className="text-gray-600 font-mono text-xs">
                    Report ID: QC-{qcResult.id.slice(-8).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}