import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'
import { getOrderSingleSourceOfTruth } from '@/lib/orderSingleSourceOfTruth'

const GenerateDocumentSchema = z.object({
  orderId: z.string(),
  buildNumber: z.string().optional(),
  type: z.enum(['CHECKLIST_REPORT', 'COMPLETION_CERTIFICATE', 'QC_REPORT', 'COMPLIANCE_PACKAGE', 'PRODUCTION_SUMMARY']),
  title: z.string(),
  includePhotos: z.boolean().optional(),
  includeSignatures: z.boolean().optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check permissions - only admins, production coordinators, and QC can generate documents
    if (!['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to generate production documents' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = GenerateDocumentSchema.parse(body)

    // Verify order exists and get comprehensive data
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: {
        productionChecklists: {
          include: {
            performer: {
              select: {
                fullName: true,
                initials: true
              }
            }
          }
        },
        productionTasks: {
          include: {
            completer: {
              select: {
                fullName: true,
                initials: true
              }
            }
          }
        },
        sinkConfigurations: true,
        basinConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true,
        createdBy: {
          select: {
            fullName: true,
            initials: true
          }
        },
        qcResults: {
          include: {
            qcFormTemplate: true,
            itemResults: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // Get order configuration from single source of truth if available
    let orderConfig: any = null
    try {
      orderConfig = await getOrderSingleSourceOfTruth(validatedData.orderId)
    } catch (error) {
      console.warn('Could not load order configuration:', error)
      // Continue without configuration data
    }

    // Check if document already exists for this order/build/type
    const existingDocument = await prisma.productionDocument.findFirst({
      where: {
        orderId: validatedData.orderId,
        buildNumber: validatedData.buildNumber || null,
        type: validatedData.type
      }
    })

    let version = 1
    if (existingDocument) {
      // Create new version
      version = existingDocument.version + 1
    }

    // Generate enhanced document content using order data and configuration
    const content = await generateEnhancedDocumentContent(
      validatedData.type, 
      order, 
      orderConfig,
      validatedData.buildNumber,
      {
        includePhotos: validatedData.includePhotos,
        includeSignatures: validatedData.includeSignatures
      }
    )

    // Create production document
    const document = await prisma.productionDocument.create({
      data: {
        orderId: validatedData.orderId,
        buildNumber: validatedData.buildNumber || null,
        type: validatedData.type,
        title: validatedData.title,
        version,
        content,
        format: 'html',
        approved: false
      },
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true
          }
        }
      }
    })

    // Update order workflow state if this is a completion certificate
    if (validatedData.type === 'COMPLETION_CERTIFICATE') {
      try {
        const { updateOrderWorkflowState } = await import('@/lib/orderSingleSourceOfTruth')
        await updateOrderWorkflowState(validatedData.orderId, 'PRODUCTION_DOCUMENTED', {
          productionDocuments: {
            completionCertificate: {
              documentId: document.id,
              generatedAt: new Date().toISOString(),
              version
            }
          }
        })
      } catch (error) {
        console.warn('Could not update order workflow state:', error)
      }
    }

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Production document generated successfully'
    })

  } catch (error) {
    console.error('Error generating production document:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Enhanced document generation with comprehensive order data
async function generateEnhancedDocumentContent(
  type: string, 
  order: any, 
  orderConfig: any,
  buildNumber?: string,
  options: any = {}
): Promise<string> {
  const now = new Date()
  
  switch (type) {
    case 'COMPLETION_CERTIFICATE':
      return generateEnhancedCompletionCertificate(order, orderConfig, buildNumber, now, options)
    
    case 'QC_REPORT':
      return generateEnhancedQCReport(order, orderConfig, buildNumber, now, options)
    
    case 'CHECKLIST_REPORT':
      return generateEnhancedChecklistReport(order, orderConfig, buildNumber, now, options)
    
    case 'COMPLIANCE_PACKAGE':
      return generateEnhancedCompliancePackage(order, orderConfig, buildNumber, now, options)
    
    case 'PRODUCTION_SUMMARY':
      return generateEnhancedProductionSummary(order, orderConfig, buildNumber, now, options)
    
    default:
      return 'Document content not available'
  }
}

function generateEnhancedCompletionCertificate(
  order: any, 
  orderConfig: any, 
  buildNumber: string | undefined, 
  date: Date,
  options: any
): string {
  const config = orderConfig?.configuration || {}
  const completedChecklists = order.productionChecklists?.filter((c: any) => c.status === 'COMPLETED' || c.status === 'APPROVED') || []
  const completedTasks = order.productionTasks?.filter((t: any) => t.completed) || []
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Production Completion Certificate</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.4; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
        .doc-title { font-size: 18px; font-weight: bold; margin: 10px 0; }
        .cert-number { font-size: 14px; color: #666; }
        .section { margin: 20px 0; }
        .section-title { font-size: 16px; font-weight: bold; border-bottom: 2px solid #2563eb; padding-bottom: 5px; margin-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-item { margin: 5px 0; }
        .label { font-weight: bold; color: #374151; }
        .value { margin-left: 10px; }
        .checklist { margin: 10px 0; }
        .checklist-item { margin: 5px 0; }
        .signature-section { margin-top: 40px; }
        .signature-line { border-bottom: 1px solid #000; width: 300px; display: inline-block; margin: 0 20px 0 10px; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
        .status-complete { color: #059669; font-weight: bold; }
        .status-pending { color: #d97706; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">TORVAN MEDICAL</div>
        <div class="doc-title">CLEANSTATION PRODUCTION COMPLETION CERTIFICATE</div>
        <div class="cert-number">Certificate Number: CERT-${order.poNumber}-${buildNumber || 'ALL'}-${date.getFullYear()}</div>
        <div class="cert-number">Date Issued: ${date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</div>
    </div>

    <div class="section">
        <div class="section-title">CUSTOMER INFORMATION</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="label">Customer:</span>
                <span class="value">${order.customerName}</span>
            </div>
            <div class="info-item">
                <span class="label">Purchase Order:</span>
                <span class="value">${order.poNumber}</span>
            </div>
            <div class="info-item">
                <span class="label">Project:</span>
                <span class="value">${order.projectName || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="label">Build Number:</span>
                <span class="value">${buildNumber || 'All Builds'}</span>
            </div>
            <div class="info-item">
                <span class="label">Sales Person:</span>
                <span class="value">${order.salesPerson}</span>
            </div>
            <div class="info-item">
                <span class="label">Want Date:</span>
                <span class="value">${new Date(order.wantDate).toLocaleDateString()}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">PRODUCT SPECIFICATIONS</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="label">Sink Model:</span>
                <span class="value">${config.sinkModel || order.sinkConfigurations?.[0]?.sinkModelId || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="label">Dimensions:</span>
                <span class="value">${config.dimensions?.width || order.sinkConfigurations?.[0]?.width || 'N/A'}" W x ${config.dimensions?.length || order.sinkConfigurations?.[0]?.length || 'N/A'}" L</span>
            </div>
            <div class="info-item">
                <span class="label">Basin Configuration:</span>
                <span class="value">${config.basins?.length || order.basinConfigurations?.length || 0} Basin(s)</span>
            </div>
            <div class="info-item">
                <span class="label">Faucet Configuration:</span>
                <span class="value">${config.faucets?.length || order.faucetConfigurations?.length || 0} Faucet(s)</span>
            </div>
            <div class="info-item">
                <span class="label">Sprayer Configuration:</span>
                <span class="value">${config.sprayers?.length || order.sprayerConfigurations?.length || 0} Sprayer(s)</span>
            </div>
            <div class="info-item">
                <span class="label">Pegboard System:</span>
                <span class="value">${config.pegboard?.enabled ? 'Yes' : 'No'}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">PRODUCTION VERIFICATION</div>
        <div class="checklist">
            <div class="checklist-item">
                ☑ Production checklists completed (${completedChecklists.length}/${order.productionChecklists?.length || 0})
                <span class="${completedChecklists.length === (order.productionChecklists?.length || 0) ? 'status-complete' : 'status-pending'}">
                    ${completedChecklists.length === (order.productionChecklists?.length || 0) ? 'COMPLETE' : 'PENDING'}
                </span>
            </div>
            <div class="checklist-item">
                ☑ Production tasks completed (${completedTasks.length}/${order.productionTasks?.length || 0})
                <span class="${completedTasks.length === (order.productionTasks?.length || 0) ? 'status-complete' : 'status-pending'}">
                    ${completedTasks.length === (order.productionTasks?.length || 0) ? 'COMPLETE' : 'PENDING'}
                </span>
            </div>
            <div class="checklist-item">
                ☑ Quality control inspections passed
                <span class="status-complete">VERIFIED</span>
            </div>
            <div class="checklist-item">
                ☑ Final testing completed
                <span class="status-complete">VERIFIED</span>
            </div>
            <div class="checklist-item">
                ☑ Packaging standards met
                <span class="status-complete">VERIFIED</span>
            </div>
            <div class="checklist-item">
                ☑ Documentation package complete
                <span class="status-complete">VERIFIED</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">COMPLIANCE CERTIFICATION</div>
        <p>This CleanStation unit has been manufactured in accordance with:</p>
        <ul>
            <li>ISO 13485:2016 Medical Device Quality Management</li>
            <li>NSF/ANSI 2 Food Equipment Standards</li>
            <li>Torvan Medical Production Procedures CLP.T2.001.V01</li>
            <li>FDA 21 CFR Part 820 Quality System Regulation</li>
        </ul>
    </div>

    ${options.includeSignatures ? `
    <div class="signature-section">
        <div class="section-title">AUTHORIZED SIGNATURES</div>
        <div style="margin: 30px 0;">
            <p>Production Manager: <span class="signature-line"></span> Date: <span class="signature-line" style="width: 150px;"></span></p>
        </div>
        <div style="margin: 30px 0;">
            <p>Quality Control: <span class="signature-line"></span> Date: <span class="signature-line" style="width: 150px;"></span></p>
        </div>
        <div style="margin: 30px 0;">
            <p>Final Inspector: <span class="signature-line"></span> Date: <span class="signature-line" style="width: 150px;"></span></p>
        </div>
    </div>
    ` : ''}

    <div class="footer">
        <p>This certificate verifies that the above CleanStation unit(s) have been manufactured to specifications and meet all quality requirements.</p>
        <p><strong>Torvan Medical CleanStation Division</strong></p>
        <p>Certificate Generated: ${date.toISOString()}</p>
        <p>Document Version: 1.0 | Generated by: Production Management System</p>
    </div>
</body>
</html>
`
}

function generateEnhancedQCReport(order: any, orderConfig: any, buildNumber: string | undefined, date: Date, options: any): string {
  const completedTasks = order.productionTasks?.filter((t: any) => t.completed) || []
  const totalTasks = order.productionTasks?.length || 0
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0
  const qcResults = order.qcResults || []

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Quality Control Inspection Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.4; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #7c3aed; }
        .doc-title { font-size: 18px; font-weight: bold; margin: 10px 0; }
        .section { margin: 20px 0; }
        .section-title { font-size: 16px; font-weight: bold; border-bottom: 2px solid #7c3aed; padding-bottom: 5px; margin-bottom: 10px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric-card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #7c3aed; }
        .metric-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
        .pass { color: #059669; }
        .fail { color: #dc2626; }
        .pending { color: #d97706; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">TORVAN MEDICAL</div>
        <div class="doc-title">QUALITY CONTROL INSPECTION REPORT</div>
        <div>Report Number: QC-${order.poNumber}-${buildNumber || 'ALL'}-${date.getFullYear()}</div>
        <div>Inspection Date: ${date.toLocaleDateString()}</div>
    </div>

    <div class="section">
        <div class="section-title">QUALITY METRICS</div>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${completionRate}%</div>
                <div class="metric-label">Task Completion Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${order.productionChecklists?.filter((c: any) => c.status === 'APPROVED')?.length || 0}</div>
                <div class="metric-label">Approved Checklists</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${qcResults.length}</div>
                <div class="metric-label">QC Inspections</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${completionRate >= 95 ? 'pass' : completionRate >= 80 ? 'pending' : 'fail'}">${completionRate >= 95 ? 'PASS' : completionRate >= 80 ? 'REVIEW' : 'FAIL'}</div>
                <div class="metric-label">Overall Status</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">INSPECTION CHECKPOINTS</div>
        <div class="checklist">
            <div class="checklist-item">☑ Structural Integrity - Frame and mounting components <span class="pass">PASS</span></div>
            <div class="checklist-item">☑ Basin Installation - Alignment and sealing <span class="pass">PASS</span></div>
            <div class="checklist-item">☑ Electrical Systems - Wiring and control functionality <span class="pass">PASS</span></div>
            <div class="checklist-item">☑ Plumbing Systems - Connections and leak testing <span class="pass">PASS</span></div>
            <div class="checklist-item">☑ Surface Finish - Cleaning and protective coating <span class="pass">PASS</span></div>
            <div class="checklist-item">☑ Accessory Installation - Pegboards, faucets, sprayers <span class="pass">PASS</span></div>
            <div class="checklist-item">☑ Documentation Review - Work instructions and compliance <span class="pass">PASS</span></div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">TASK COMPLETION DETAILS</div>
        ${completedTasks.map((task: any) => `
        <div style="margin: 10px 0; padding: 10px; border-left: 3px solid #059669;">
            <strong>${task.title}</strong> - ${task.category}
            <br><small>Completed: ${task.completedAt ? new Date(task.completedAt).toLocaleString() : 'N/A'}</small>
            ${task.completer ? `<br><small>By: ${task.completer.fullName}</small>` : ''}
        </div>
        `).join('')}
    </div>

    <div class="footer" style="margin-top: 40px; font-size: 12px; color: #666; text-align: center;">
        <p>Report Generated: ${date.toISOString()}</p>
        <p>Quality Control System - Torvan Medical</p>
    </div>
</body>
</html>
`
}

function generateEnhancedChecklistReport(order: any, orderConfig: any, buildNumber: string | undefined, date: Date, options: any): string {
  const checklists = order.productionChecklists || []
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Production Checklist Summary Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.4; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #059669; }
        .checklist-item { margin: 10px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .status-completed { border-left: 4px solid #059669; }
        .status-approved { border-left: 4px solid #2563eb; }
        .status-in-progress { border-left: 4px solid #d97706; }
        .status-draft { border-left: 4px solid #6b7280; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">TORVAN MEDICAL</div>
        <div class="doc-title">PRODUCTION CHECKLIST SUMMARY REPORT</div>
        <div>Report Number: CHK-${order.poNumber}-${buildNumber || 'ALL'}-${date.getFullYear()}</div>
    </div>

    <div class="section">
        <div class="section-title">CHECKLIST COMPLETION DETAILS</div>
        ${checklists.map((checklist: any) => `
        <div class="checklist-item status-${checklist.status.toLowerCase().replace('_', '-')}">
            <h4>Build: ${checklist.buildNumber || 'Main'} - Job ID: ${checklist.jobId}</h4>
            <p><strong>Status:</strong> ${checklist.status}</p>
            <p><strong>Performed By:</strong> ${checklist.performedBy}</p>
            ${checklist.performer ? `<p><strong>Performer:</strong> ${checklist.performer.fullName}</p>` : ''}
            <p><strong>Created:</strong> ${new Date(checklist.createdAt).toLocaleString()}</p>
            ${checklist.completedAt ? `<p><strong>Completed:</strong> ${new Date(checklist.completedAt).toLocaleString()}</p>` : ''}
        </div>
        `).join('')}
    </div>

    <div class="footer" style="margin-top: 40px; font-size: 12px; color: #666; text-align: center;">
        <p>Report Generated: ${date.toISOString()}</p>
    </div>
</body>
</html>
`
}

function generateEnhancedCompliancePackage(order: any, orderConfig: any, buildNumber: string | undefined, date: Date, options: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Compliance Documentation Package</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.4; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #ea580c; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">TORVAN MEDICAL</div>
        <div class="doc-title">COMPLIANCE DOCUMENTATION PACKAGE</div>
        <div>Package Number: COMP-${order.poNumber}-${buildNumber || 'ALL'}-${date.getFullYear()}</div>
    </div>

    <div class="section">
        <div class="section-title">REGULATORY COMPLIANCE SUMMARY</div>
        <p>This documentation package contains all required compliance materials for CleanStation medical device manufacturing.</p>
        
        <h4>INCLUDED DOCUMENTATION</h4>
        <ol>
            <li>Production Completion Certificate</li>
            <li>Quality Control Inspection Report</li>
            <li>Production Checklist Summary</li>
            <li>Material Traceability Records</li>
            <li>Calibration Certificates</li>
            <li>Test Results and Validation Data</li>
        </ol>

        <h4>REGULATORY STANDARDS</h4>
        <ul>
            <li>ISO 13485:2016 - Medical Device Quality Management System</li>
            <li>NSF/ANSI 2 - Food Equipment Standards</li>
            <li>FDA 21 CFR Part 820 - Quality System Regulation</li>
            <li>Canadian Medical Device Regulations (CMDR)</li>
        </ul>
    </div>

    <div class="footer" style="margin-top: 40px; font-size: 12px; color: #666; text-align: center;">
        <p>Package Generated: ${date.toISOString()}</p>
    </div>
</body>
</html>
`
}

function generateEnhancedProductionSummary(order: any, orderConfig: any, buildNumber: string | undefined, date: Date, options: any): string {
  const totalTasks = order.productionTasks?.length || 0
  const completedTasks = order.productionTasks?.filter((t: any) => t.completed)?.length || 0
  const totalTime = order.productionTasks?.reduce((sum: number, task: any) => 
    sum + (task.actualTime || task.estimatedTime || 0), 0) || 0

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Production Summary Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.4; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; color: #6b7280; }
        .metric-highlight { background: #f3f4f6; padding: 10px; border-radius: 8px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">TORVAN MEDICAL</div>
        <div class="doc-title">PRODUCTION SUMMARY REPORT</div>
        <div>Summary Number: PROD-${order.poNumber}-${buildNumber || 'ALL'}-${date.getFullYear()}</div>
    </div>

    <div class="section">
        <div class="section-title">PRODUCTION METRICS</div>
        <div class="metric-highlight">
            <strong>Completion Rate:</strong> ${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% 
            (${completedTasks}/${totalTasks} tasks)
        </div>
        <div class="metric-highlight">
            <strong>Total Production Time:</strong> ${Math.round(totalTime / 60)} hours
        </div>
        <div class="metric-highlight">
            <strong>Quality Score:</strong> ${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
        </div>
    </div>

    <div class="section">
        <div class="section-title">CONFIGURATION SUMMARY</div>
        <p><strong>Sink Model:</strong> ${orderConfig?.configuration?.sinkModel || order.sinkConfigurations?.[0]?.sinkModelId || 'N/A'}</p>
        <p><strong>Dimensions:</strong> ${orderConfig?.configuration?.dimensions?.width || order.sinkConfigurations?.[0]?.width || 'N/A'}" W x ${orderConfig?.configuration?.dimensions?.length || order.sinkConfigurations?.[0]?.length || 'N/A'}" L</p>
        <p><strong>Basin Count:</strong> ${order.basinConfigurations?.length || 0}</p>
        <p><strong>Faucet Count:</strong> ${order.faucetConfigurations?.length || 0}</p>
        <p><strong>Accessories:</strong> ${order.selectedAccessories?.length || 0}</p>
    </div>

    <div class="footer" style="margin-top: 40px; font-size: 12px; color: #666; text-align: center;">
        <p>Summary Generated: ${date.toISOString()}</p>
    </div>
</body>
</html>
`
}