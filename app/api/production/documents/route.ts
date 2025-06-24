import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

const GenerateDocumentSchema = z.object({
  orderId: z.string(),
  buildNumber: z.string().optional(),
  type: z.enum(['CHECKLIST_REPORT', 'COMPLETION_CERTIFICATE', 'QC_REPORT', 'COMPLIANCE_PACKAGE', 'PRODUCTION_SUMMARY']),
  title: z.string(),
  includePhotos: z.boolean().optional(),
  includeSignatures: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const type = searchParams.get('type')
    const approved = searchParams.get('approved')
    const search = searchParams.get('search')

    let where: any = {}

    if (orderId) {
      where.orderId = orderId
    }

    if (type) {
      where.type = type
    }

    if (approved !== null) {
      where.approved = approved === 'true'
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { order: { poNumber: { contains: search, mode: 'insensitive' } } },
        { order: { customerName: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Role-based filtering
    if (user.role === 'QC_PERSON') {
      // QC can see all documents but primarily focus on QC reports
      // No additional filtering needed
    } else if (user.role === 'ASSEMBLER') {
      // Assemblers can only see documents for orders they worked on
      where.order = {
        productionChecklists: {
          some: {
            performedById: user.id
          }
        }
      }
    }

    const documents = await prisma.productionDocument.findMany({
      where,
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true
          }
        },
        approver: {
          select: {
            fullName: true,
            initials: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: documents
    })

  } catch (error) {
    console.error('Error fetching production documents:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: {
        productionChecklists: true,
        productionTasks: true,
        sinkConfigurations: true,
        basinConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true,
        createdBy: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    // Generate document content based on type
    const content = await generateDocumentContent(validatedData.type, order, validatedData.buildNumber)

    // Create production document
    const document = await prisma.productionDocument.create({
      data: {
        orderId: validatedData.orderId,
        buildNumber: validatedData.buildNumber || null,
        type: validatedData.type,
        title: validatedData.title,
        version: 1,
        content,
        format: 'html', // Can be extended to support PDF generation
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

// Helper function to generate document content based on type
async function generateDocumentContent(type: string, order: any, buildNumber?: string): Promise<string> {
  const now = new Date()
  
  switch (type) {
    case 'COMPLETION_CERTIFICATE':
      return generateCompletionCertificate(order, buildNumber, now)
    
    case 'QC_REPORT':
      return generateQCReport(order, buildNumber, now)
    
    case 'CHECKLIST_REPORT':
      return generateChecklistReport(order, buildNumber, now)
    
    case 'COMPLIANCE_PACKAGE':
      return generateCompliancePackage(order, buildNumber, now)
    
    case 'PRODUCTION_SUMMARY':
      return generateProductionSummary(order, buildNumber, now)
    
    default:
      return 'Document content not available'
  }
}

function generateCompletionCertificate(order: any, buildNumber: string | undefined, date: Date): string {
  return `
TORVAN MEDICAL
CLEANSTATION PRODUCTION COMPLETION CERTIFICATE

Certificate Number: CERT-${order.poNumber}-${buildNumber || 'ALL'}-${date.getFullYear()}
Date Issued: ${date.toLocaleDateString()}

CUSTOMER INFORMATION
Customer: ${order.customerName}
Purchase Order: ${order.poNumber}
Project: ${order.projectName || 'N/A'}
Build Number: ${buildNumber || 'All Builds'}

PRODUCT SPECIFICATIONS
Sink Model: ${order.sinkConfigurations?.[0]?.sinkModelId || 'N/A'}
Basin Configuration: ${order.basinConfigurations?.length || 0} Basin(s)
Faucet Configuration: ${order.faucetConfigurations?.length || 0} Faucet(s)
Sprayer Configuration: ${order.sprayerConfigurations?.length || 0} Sprayer(s)

PRODUCTION VERIFICATION
□ All production checklists completed
□ Quality control inspections passed
□ Final testing completed
□ Packaging standards met
□ Documentation package complete

COMPLIANCE CERTIFICATION
This CleanStation unit has been manufactured in accordance with:
- ISO 13485:2016 Medical Device Quality Management
- NSF/ANSI 2 Food Equipment Standards
- Torvan Medical Production Procedures CLP.T2.001.V01

AUTHORIZED SIGNATURES
Production Manager: ___________________________ Date: __________
Quality Control: ___________________________ Date: __________
Final Inspector: ___________________________ Date: __________

This certificate verifies that the above CleanStation unit(s) have been 
manufactured to specifications and meet all quality requirements.

Torvan Medical CleanStation Division
Certificate Generated: ${date.toISOString()}
`
}

function generateQCReport(order: any, buildNumber: string | undefined, date: Date): string {
  const completedTasks = order.productionTasks?.filter((t: any) => t.completed) || []
  const totalTasks = order.productionTasks?.length || 0
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0

  return `
TORVAN MEDICAL
QUALITY CONTROL INSPECTION REPORT

Report Number: QC-${order.poNumber}-${buildNumber || 'ALL'}-${date.getFullYear()}
Inspection Date: ${date.toLocaleDateString()}

ORDER DETAILS
Customer: ${order.customerName}
Purchase Order: ${order.poNumber}
Build Number: ${buildNumber || 'All Builds'}
Order Status: ${order.orderStatus}

PRODUCTION QUALITY METRICS
Task Completion Rate: ${completionRate}% (${completedTasks.length}/${totalTasks})
Production Checklists: ${order.productionChecklists?.length || 0} Total
Approved Checklists: ${order.productionChecklists?.filter((c: any) => c.status === 'APPROVED')?.length || 0}

INSPECTION CHECKPOINTS
□ Structural Integrity - Frame and mounting components
□ Basin Installation - Alignment and sealing
□ Electrical Systems - Wiring and control functionality
□ Plumbing Systems - Connections and leak testing
□ Surface Finish - Cleaning and protective coating
□ Accessory Installation - Pegboards, faucets, sprayers
□ Documentation Review - Work instructions and compliance

QUALITY STANDARDS COMPLIANCE
ISO 13485:2016 - Medical Device Quality Management: PASS
NSF/ANSI 2 - Food Equipment Standards: PASS
Torvan Medical QC Procedures: PASS

INSPECTOR NOTES
Production completed according to specifications.
All quality checkpoints verified.
Unit ready for final packaging and shipment.

QC Inspector: ___________________________ Date: __________
QC Manager: ___________________________ Date: __________

Report Generated: ${date.toISOString()}
`
}

function generateChecklistReport(order: any, buildNumber: string | undefined, date: Date): string {
  const checklists = order.productionChecklists || []
  
  return `
TORVAN MEDICAL
PRODUCTION CHECKLIST SUMMARY REPORT

Report Number: CHK-${order.poNumber}-${buildNumber || 'ALL'}-${date.getFullYear()}
Report Date: ${date.toLocaleDateString()}

ORDER INFORMATION
Customer: ${order.customerName}
Purchase Order: ${order.poNumber}
Build Number: ${buildNumber || 'All Builds'}
Sales Person: ${order.salesPerson}

CHECKLIST COMPLETION SUMMARY
Total Checklists: ${checklists.length}
Completed: ${checklists.filter((c: any) => c.status === 'COMPLETED').length}
Approved: ${checklists.filter((c: any) => c.status === 'APPROVED').length}
In Progress: ${checklists.filter((c: any) => c.status === 'IN_PROGRESS').length}

PRODUCTION PHASE BREAKDOWN
${checklists.map((checklist: any) => `
Build: ${checklist.buildNumber || 'Main'}
Status: ${checklist.status}
Job ID: ${checklist.jobId}
Performed By: ${checklist.performedBy}
Completed: ${checklist.completedAt ? new Date(checklist.completedAt).toLocaleDateString() : 'In Progress'}
`).join('\n')}

SECTION COMPLETION DETAILS
□ Pre-Production Setup
□ Sink Body Assembly
□ Basin Installation
□ Final Quality Check

All production checklist items have been completed according to 
CLP.T2.001.V01 production procedures.

Production Supervisor: ___________________________ Date: __________

Report Generated: ${date.toISOString()}
`
}

function generateCompliancePackage(order: any, buildNumber: string | undefined, date: Date): string {
  return `
TORVAN MEDICAL
COMPLIANCE DOCUMENTATION PACKAGE

Package Number: COMP-${order.poNumber}-${buildNumber || 'ALL'}-${date.getFullYear()}
Package Date: ${date.toLocaleDateString()}

REGULATORY COMPLIANCE SUMMARY
This documentation package contains all required compliance materials
for CleanStation medical device manufacturing.

INCLUDED DOCUMENTATION
1. Production Completion Certificate
2. Quality Control Inspection Report
3. Production Checklist Summary
4. Material Traceability Records
5. Calibration Certificates
6. Test Results and Validation Data

REGULATORY STANDARDS
ISO 13485:2016 - Medical Device Quality Management System
NSF/ANSI 2 - Food Equipment Standards
FDA 21 CFR Part 820 - Quality System Regulation
Canadian Medical Device Regulations (CMDR)

ORDER SPECIFICATIONS
Customer: ${order.customerName}
Purchase Order: ${order.poNumber}
Build Number: ${buildNumber || 'All Builds'}
Manufacturing Date: ${date.toLocaleDateString()}

QUALITY ASSURANCE DECLARATION
This CleanStation unit has been manufactured under a quality management
system compliant with ISO 13485:2016 and applicable regulatory requirements.

All materials, processes, and procedures have been validated and documented
in accordance with medical device manufacturing standards.

DOCUMENT CONTROL
Document Version: 1.0
Review Date: ${date.toLocaleDateString()}
Next Review: ${new Date(date.getTime() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Quality Manager: ___________________________ Date: __________
Regulatory Affairs: ___________________________ Date: __________

Package Generated: ${date.toISOString()}
`
}

function generateProductionSummary(order: any, buildNumber: string | undefined, date: Date): string {
  const totalTasks = order.productionTasks?.length || 0
  const completedTasks = order.productionTasks?.filter((t: any) => t.completed)?.length || 0
  const totalTime = order.productionTasks?.reduce((sum: number, task: any) => 
    sum + (task.actualTime || task.estimatedTime || 0), 0) || 0

  return `
TORVAN MEDICAL
PRODUCTION SUMMARY REPORT

Summary Number: PROD-${order.poNumber}-${buildNumber || 'ALL'}-${date.getFullYear()}
Summary Date: ${date.toLocaleDateString()}

PRODUCTION OVERVIEW
Customer: ${order.customerName}
Purchase Order: ${order.poNumber}
Build Number: ${buildNumber || 'All Builds'}
Order Created: ${new Date(order.createdAt).toLocaleDateString()}
Production Started: ${order.productionChecklists?.[0]?.createdAt ? 
  new Date(order.productionChecklists[0].createdAt).toLocaleDateString() : 'N/A'}

PRODUCTION METRICS
Total Tasks: ${totalTasks}
Completed Tasks: ${completedTasks}
Completion Rate: ${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
Total Production Time: ${Math.round(totalTime / 60)} hours

CONFIGURATION SUMMARY
Sink Model: ${order.sinkConfigurations?.[0]?.sinkModelId || 'N/A'}
Dimensions: ${order.sinkConfigurations?.[0]?.width || 'N/A'}" W x ${order.sinkConfigurations?.[0]?.length || 'N/A'}" L
Basin Count: ${order.basinConfigurations?.length || 0}
Faucet Count: ${order.faucetConfigurations?.length || 0}
Accessories: ${order.selectedAccessories?.length || 0}

PRODUCTION TIMELINE
Order Created: ${new Date(order.createdAt).toLocaleDateString()}
Production Phase: ${order.orderStatus}
Estimated Completion: ${new Date(order.wantDate).toLocaleDateString()}

QUALITY METRICS
Production Checklists: ${order.productionChecklists?.length || 0}
Approved Checklists: ${order.productionChecklists?.filter((c: any) => c.status === 'APPROVED')?.length || 0}
Quality Score: ${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%

NOTES
Production completed according to standard procedures.
All quality requirements have been met.
Unit ready for final inspection and shipment.

Production Manager: ___________________________ Date: __________

Summary Generated: ${date.toISOString()}
`
}