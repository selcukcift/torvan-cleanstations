import { NextRequest, NextResponse } from 'next/server'
import { generateBOMForOrder } from '@/lib/bomService.native'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

// Same validation schemas as the main orders route
const CustomerInfoSchema = z.object({
  poNumber: z.string().min(1, 'PO Number is required'),
  customerName: z.string().min(1, 'Customer Name is required'),
  projectName: z.string().optional(),
  salesPerson: z.string().min(1, 'Sales Person is required'),
  wantDate: z.string().transform((str) => new Date(str)),
  language: z.enum(['EN', 'FR', 'ES']),
  notes: z.string().optional()
})

const BasinConfigurationSchema = z.object({
  basinTypeId: z.string().optional(),
  basinSizePartNumber: z.string().optional(),
  addonIds: z.array(z.string()).optional()
})

const FaucetConfigurationSchema = z.object({
  faucetTypeId: z.string().optional(),
  quantity: z.number().optional()
})

const SprayerConfigurationSchema = z.object({
  hasSprayerSystem: z.boolean(),
  sprayerTypeIds: z.array(z.string()).optional()
})

const SprayerItemSchema = z.object({
  id: z.string().optional(),
  sprayerTypeId: z.string().optional(),
  location: z.string().optional()
})

const SinkConfigurationSchema = z.object({
  sinkModelId: z.string(),
  sinkWidth: z.number().optional(),
  sinkLength: z.number().optional(),
  width: z.number().optional(),
  length: z.number().optional(),
  legsTypeId: z.string().optional(),
  legTypeId: z.string().optional(),
  feetTypeId: z.string().optional(),
  pegboard: z.boolean().optional(),
  pegboardTypeId: z.string().optional(),
  pegboardType: z.string().optional(),
  pegboardColor: z.string().optional(),
  pegboardColorId: z.string().optional(),
  pegboardSizePartNumber: z.string().optional(),
  specificPegboardKitId: z.string().optional(),
  drawersAndCompartments: z.array(z.string()).optional(),
  workflowDirection: z.enum(['LEFT_TO_RIGHT', 'RIGHT_TO_LEFT']).optional(),
  basins: z.array(BasinConfigurationSchema).default([]),
  faucet: FaucetConfigurationSchema.optional(),
  faucets: z.array(FaucetConfigurationSchema).optional(),
  sprayer: SprayerConfigurationSchema.optional(),
  sprayers: z.array(SprayerItemSchema).optional(),
  controlBoxId: z.string().nullable().optional()
})

const SelectedAccessorySchema = z.object({
  assemblyId: z.string(),
  quantity: z.number().min(1)
})

const SinkSelectionSchema = z.object({
  sinkModelId: z.string(),
  quantity: z.number().min(1),
  buildNumbers: z.array(z.string())
})

const BOMPreviewSchema = z.object({
  customerInfo: CustomerInfoSchema,
  sinkSelection: SinkSelectionSchema,
  configurations: z.record(z.string(), SinkConfigurationSchema),
  accessories: z.record(z.string(), z.array(SelectedAccessorySchema))
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = BOMPreviewSchema.parse(body)

    const { customerInfo, sinkSelection, configurations, accessories } = validatedData

    // Generate BOM preview using the same service as order creation
    const bomResult = await generateBOMForOrder({
      customer: customerInfo,
      configurations,
      accessories,
      buildNumbers: sinkSelection.buildNumbers
    })

    // bomResult is an object with hierarchical, flattened, totalItems, and topLevelItems properties
    const flattenedItems = bomResult?.flattened || []
    
    return NextResponse.json({
      success: true,
      data: {
        bom: bomResult,
        buildNumbers: sinkSelection.buildNumbers,
        totalItems: bomResult?.totalItems || 0,
        summary: {
          systemComponents: flattenedItems.filter(item => item.category === 'SYSTEM')?.length || 0,
          structuralComponents: flattenedItems.filter(item => ['SINK_BODY', 'LEGS', 'FEET'].includes(item.category))?.length || 0,
          basinComponents: flattenedItems.filter(item => item.category?.includes('BASIN'))?.length || 0,
          accessoryComponents: flattenedItems.filter(item => item.category === 'ACCESSORY')?.length || 0
        }
      }
    })

  } catch (error) {
    console.error('Error generating BOM preview:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation error', 
          errors: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Failed to generate BOM preview' },
      { status: 500 }
    )
  }
}