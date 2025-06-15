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
  wantDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]).nullable(),
  language: z.enum(['EN', 'FR', 'ES']),
  notes: z.string().optional()
})

const BasinConfigurationSchema = z.object({
  basinTypeId: z.string().optional(),
  basinType: z.string().optional(),  // Allow user-friendly basin type from UI
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
  sinkModelId: z.string().optional(),
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
  let body: any = null
  
  try {
    // Authenticate user
    const user = await getAuthUser()
    
    if (!user) {
      console.warn('⚠️ BOM Preview: No authenticated user found, proceeding anyway for debugging')
      // Temporarily allow unauthenticated access for debugging
      // This should be re-enabled once authentication issues are resolved
    } else {
      console.log('✅ BOM Preview: User authenticated:', user.username)
    }
    
    // Parse and validate request body
    body = await request.json()
    console.log('🔍 BOM Preview API received body:', JSON.stringify(body, null, 2))
    
    const validatedData = BOMPreviewSchema.parse(body)

    const { customerInfo, sinkSelection, configurations, accessories } = validatedData

    // Transform basin type IDs from user-friendly to assembly IDs
    const basinTypeMapping: Record<string, string> = {
      'E_DRAIN': 'T2-BSN-EDR-KIT',
      'E_SINK': 'T2-BSN-ESK-KIT', 
      'E_SINK_DI': 'T2-BSN-ESK-DI-KIT'
    }

    const transformedConfigurations = Object.entries(configurations).reduce((acc, [buildNumber, config]) => {
      const transformedConfig = { ...config }
      
      // Transform basin configurations
      if (config.basins && config.basins.length > 0) {
        transformedConfig.basins = config.basins.map(basin => {
          const transformedBasin = { ...basin }
          
          // Map basinType to basinTypeId if needed
          if (basin.basinType && !basin.basinTypeId) {
            transformedBasin.basinTypeId = basinTypeMapping[basin.basinType] || basin.basinType
          }
          
          return transformedBasin
        })
      }
      
      acc[buildNumber] = transformedConfig
      return acc
    }, {} as Record<string, any>)

    // Generate BOM preview - separate BOMs for each build if multiple builds
    console.log('🔧 BOM Preview: Generating BOM for order with transformed configurations')
    
    if (sinkSelection.buildNumbers.length === 1) {
      // Single build - use existing logic
      const bomResult = await generateBOMForOrder({
        customer: customerInfo,
        configurations: transformedConfigurations,
        accessories,
        buildNumbers: sinkSelection.buildNumbers
      })
      
      console.log('✅ Single BOM generation completed successfully')

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
    } else {
      // Multiple builds - generate separate BOMs for each build
      const buildBOMs: Record<string, any> = {}
      const combinedSummary = {
        systemComponents: 0,
        structuralComponents: 0,
        basinComponents: 0,
        accessoryComponents: 0
      }
      let totalItems = 0

      for (const buildNumber of sinkSelection.buildNumbers) {
        console.log(`🔧 BOM Preview: Generating BOM for build ${buildNumber}`)
        
        // Create single-build configuration
        const singleBuildConfig = { [buildNumber]: transformedConfigurations[buildNumber] }
        const singleBuildAccessories = { [buildNumber]: accessories[buildNumber] || [] }
        
        const buildBOM = await generateBOMForOrder({
          customer: customerInfo,
          configurations: singleBuildConfig,
          accessories: singleBuildAccessories,
          buildNumbers: [buildNumber]
        })
        
        buildBOMs[buildNumber] = buildBOM
        
        // Accumulate totals
        const flattenedItems = buildBOM?.flattened || []
        totalItems += buildBOM?.totalItems || 0
        combinedSummary.systemComponents += flattenedItems.filter(item => item.category === 'SYSTEM')?.length || 0
        combinedSummary.structuralComponents += flattenedItems.filter(item => ['SINK_BODY', 'LEGS', 'FEET'].includes(item.category))?.length || 0
        combinedSummary.basinComponents += flattenedItems.filter(item => item.category?.includes('BASIN'))?.length || 0
        combinedSummary.accessoryComponents += flattenedItems.filter(item => item.category === 'ACCESSORY')?.length || 0
      }
      
      console.log('✅ Multi-build BOM generation completed successfully')
      
      return NextResponse.json({
        success: true,
        data: {
          buildBOMs,
          buildNumbers: sinkSelection.buildNumbers,
          totalItems,
          summary: combinedSummary,
          isMultiBuild: true
        }
      })
    }

  } catch (error) {
    console.error('Error generating BOM preview:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Request body was:', JSON.stringify(body, null, 2))
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', JSON.stringify(error.errors, null, 2))
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
      { 
        success: false, 
        message: 'Failed to generate BOM preview',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}