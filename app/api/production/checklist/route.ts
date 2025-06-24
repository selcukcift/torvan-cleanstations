import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'
import { getOrderSingleSourceOfTruth } from '@/lib/orderSingleSourceOfTruth'

const CreateChecklistSchema = z.object({
  orderId: z.string(),
  buildNumber: z.string().optional(),
  jobId: z.string(),
  sections: z.record(z.any()),
  performedBy: z.string()
})

const UpdateChecklistSchema = z.object({
  sections: z.record(z.any()).optional(),
  signatures: z.record(z.any()).optional(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED']).optional(),
  completedAt: z.string().optional()
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
    const buildNumber = searchParams.get('buildNumber')
    const status = searchParams.get('status')

    let where: any = {}

    if (orderId) {
      where.orderId = orderId
    }

    if (buildNumber) {
      where.buildNumber = buildNumber
    }

    if (status) {
      where.status = status
    }

    // Role-based filtering
    if (user.role === 'ASSEMBLER') {
      // Assemblers can only see checklists for orders in production
      where.order = {
        orderStatus: {
          in: ['READY_FOR_PRODUCTION', 'TESTING_COMPLETE']
        }
      }
    } else if (user.role === 'QC_PERSON') {
      // QC can see completed checklists for approval
      where.status = {
        in: ['COMPLETED', 'APPROVED']
      }
    }

    const checklists = await prisma.productionChecklist.findMany({
      where,
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true,
            wantDate: true
          }
        },
        performer: {
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
      data: checklists
    })

  } catch (error) {
    console.error('Error fetching production checklists:', error)
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

    // Check permissions - only assemblers and production coordinators can create checklists
    if (!['ASSEMBLER', 'PRODUCTION_COORDINATOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to create production checklists' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = CreateChecklistSchema.parse(body)

    // Verify order exists and is in the right state
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: {
        sinkConfigurations: true,
        productionChecklists: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.orderStatus !== 'READY_FOR_PRODUCTION') {
      return NextResponse.json(
        { success: false, message: 'Order must be in READY_FOR_PRODUCTION status to create checklist' },
        { status: 400 }
      )
    }

    // Check if checklist already exists for this order/build number
    const existingChecklist = await prisma.productionChecklist.findFirst({
      where: {
        orderId: validatedData.orderId,
        buildNumber: validatedData.buildNumber || null
      }
    })

    if (existingChecklist) {
      return NextResponse.json(
        { success: false, message: 'Production checklist already exists for this order and build number' },
        { status: 400 }
      )
    }

    // Get order configuration to populate checklist sections
    let checklistSections = validatedData.sections
    
    try {
      const orderConfig = await getOrderSingleSourceOfTruth(validatedData.orderId)
      
      // Generate checklist sections based on order configuration
      checklistSections = generateChecklistSections(orderConfig, validatedData.buildNumber)
      
    } catch (configError) {
      console.warn('Could not load order configuration, using provided sections:', configError)
      // Continue with provided sections if order config is not available
    }

    // Create production checklist
    const checklist = await prisma.productionChecklist.create({
      data: {
        orderId: validatedData.orderId,
        buildNumber: validatedData.buildNumber || null,
        jobId: validatedData.jobId,
        sections: checklistSections,
        signatures: {},
        status: 'DRAFT',
        performedBy: validatedData.performedBy,
        performedById: user.id
      },
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true
          }
        },
        performer: {
          select: {
            fullName: true,
            initials: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: checklist,
      message: 'Production checklist created successfully'
    })

  } catch (error) {
    console.error('Error creating production checklist:', error)
    
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

// Helper function to generate checklist sections from order configuration
function generateChecklistSections(orderConfig: any, buildNumber?: string): any {
  const sections = {
    preProduction: {
      title: 'Pre-Production',
      items: [
        { id: 'documentation', text: 'Work order documentation reviewed and printed', completed: false, required: true },
        { id: 'materials', text: 'All materials and components available', completed: false, required: true },
        { id: 'workspace', text: 'Work area prepared and organized', completed: false, required: true },
        { id: 'tools', text: 'Required tools and equipment verified', completed: false, required: true }
      ]
    },
    sinkProduction: {
      title: 'Sink Production',
      items: [
        { id: 'frame_assembly', text: 'Sink frame assembled per specifications', completed: false, required: true },
        { id: 'basin_installation', text: 'Basins installed and aligned', completed: false, required: true },
        { id: 'plumbing', text: 'Plumbing connections completed', completed: false, required: true },
        { id: 'electrical', text: 'Electrical systems wired and tested', completed: false, required: true }
      ]
    },
    basinProduction: {
      title: 'Basin Production',
      items: [
        { id: 'basin_prep', text: 'Basin surfaces cleaned and prepared', completed: false, required: true },
        { id: 'faucet_install', text: 'Faucets installed per configuration', completed: false, required: true },
        { id: 'sprayer_install', text: 'Sprayer systems installed (if applicable)', completed: false, required: false },
        { id: 'leak_test', text: 'All connections tested for leaks', completed: false, required: true }
      ]
    },
    packaging: {
      title: 'Standard Packaging',
      items: [
        { id: 'final_inspection', text: 'Final quality inspection completed', completed: false, required: true },
        { id: 'cleaning', text: 'Unit cleaned and polished', completed: false, required: true },
        { id: 'protection', text: 'Protective materials applied', completed: false, required: true },
        { id: 'documentation_package', text: 'Documentation package prepared', completed: false, required: true }
      ]
    }
  }

  // Customize sections based on order configuration
  if (orderConfig?.configuration) {
    const config = orderConfig.configuration
    
    // Add configuration-specific items
    if (config.pegboard?.enabled) {
      sections.sinkProduction.items.push({
        id: 'pegboard_install',
        text: 'Pegboard installed and secured',
        completed: false,
        required: true
      })
    }

    if (config.basins?.length > 1) {
      sections.basinProduction.items.push({
        id: 'multi_basin_alignment',
        text: 'Multiple basin alignment verified',
        completed: false,
        required: true
      })
    }

    if (config.sprayers?.length > 0) {
      sections.basinProduction.items.find(item => item.id === 'sprayer_install')!.required = true
    }
  }

  return sections
}