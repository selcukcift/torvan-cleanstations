import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/auth"
import { z } from "zod"

// Schema for creating outsourced part
const createOutsourcedPartSchema = z.object({
  bomItemId: z.string().optional(),
  partNumber: z.string().min(1),
  partName: z.string().min(1),
  quantity: z.number().int().positive(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  expectedReturnDate: z.string().datetime().optional(),
})

// Schema for updating outsourced part
const updateOutsourcedPartSchema = z.object({
  status: z.enum(["PENDING", "SENT", "IN_PROGRESS", "RECEIVED", "CANCELLED"]).optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
  expectedReturnDate: z.string().datetime().optional(),
  actualReturnDate: z.string().datetime().optional(),
})

// GET /api/orders/[orderId]/outsourced-parts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    console.log('📦 GET /api/orders/[orderId]/outsourced-parts - Start')
    
    // Await the params
    const resolvedParams = await params
    const orderId = resolvedParams.orderId
    
    console.log('📦 Order ID:', orderId)
    
    const user = await getAuthUser()
    if (!user) {
      console.log('📦 No user found - returning 401')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('📦 User:', user.email, 'Role:', user.role)

    // Check if user has permission to view procurement data
    if (!["ADMIN", "PROCUREMENT_SPECIALIST", "PRODUCTION_COORDINATOR"].includes(user.role)) {
      console.log('📦 User lacks permission - returning 403')
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get order with procurementData
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        procurementData: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    console.log('📦 Fetching outsourced parts for order:', orderId)
    
    // Extract outsourced parts from procurementData JSON
    const procurementData = order.procurementData as any
    let outsourcedParts: any[] = []

    if (procurementData?.outsourcedParts) {
      outsourcedParts = procurementData.outsourcedParts.map((part: any) => ({
        id: part.id || part.partNumber,
        partNumber: part.partNumber,
        partName: part.partName,
        quantity: part.quantity,
        supplier: part.supplier || 'Sink Body Manufacturer',
        status: part.status || 'PENDING',
        notes: part.notes,
        category: part.category,
        markedAt: part.createdAt || new Date(),
        markedBy: order.createdBy
      }))
    }
    
    // Fallback: Also check order history logs for backwards compatibility
    if (outsourcedParts.length === 0) {
      const orderHistory = await prisma.orderHistoryLog.findMany({
        where: { 
          orderId: orderId,
          action: 'PART_MARKED_FOR_OUTSOURCING'
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        }
      })
      
      // Convert history logs to outsourced parts format
      outsourcedParts = orderHistory.map(log => {
        try {
          // Parse JSON data from notes field
          if (log.notes?.startsWith('OUTSOURCED_PART_DATA:')) {
            const jsonData = log.notes.substring('OUTSOURCED_PART_DATA:'.length)
            const partData = JSON.parse(jsonData)
            
            return {
              id: log.id,
              partNumber: partData.partNumber,
              partName: partData.partName,
              quantity: partData.quantity,
              supplier: partData.supplier,
              status: 'SENT',
              notes: partData.notes,
              markedAt: log.createdAt,
              markedBy: log.user
            }
          }
        } catch (error) {
          console.error('Error parsing outsourced part data:', error)
        }
        
        // Fallback to regex parsing for old format
        return {
          id: log.id,
          partNumber: log.notes?.match(/Part\s+([^\s]+)/)?.[1] || 'Unknown',
          partName: log.notes?.match(/Part\s+[^\s]+\s+\(([^)]+)\)/)?.[1] || 'Unknown Part',
          quantity: 1,
          supplier: 'Sink Body Manufacturer',
          status: 'SENT',
          notes: log.notes,
          markedAt: log.createdAt,
          markedBy: log.user
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: outsourcedParts,
    })
  } catch (error) {
    console.error("Error fetching outsourced parts:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch outsourced parts",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/orders/[orderId]/outsourced-parts
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const resolvedParams = await params
    const orderId = resolvedParams.orderId
    
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only procurement specialists and admins can mark parts for outsourcing
    if (!["ADMIN", "PROCUREMENT_SPECIALIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createOutsourcedPartSchema.parse(body)

    // Get current order and its procurementData
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        procurementData: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Get existing procurement data or initialize
    const currentProcurementData = (order.procurementData as any) || {
      analysisCompleted: false,
      outsourcedParts: [],
      missingParts: []
    }

    // Create new outsourced part entry
    const newOutsourcedPart = {
      id: `outsourced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bomItemId: validatedData.bomItemId,
      partNumber: validatedData.partNumber,
      partName: validatedData.partName,
      quantity: validatedData.quantity,
      supplier: validatedData.supplier || 'Sink Body Manufacturer',
      status: 'PENDING',
      category: validatedData.partNumber.includes('DL27') || validatedData.partNumber.includes('DL14') || validatedData.partNumber.includes('LC1') ? 'LEGS' : 'FEET',
      notes: validatedData.notes,
      createdAt: new Date().toISOString(),
      createdBy: user.id
    }

    // Add to outsourced parts array
    const updatedProcurementData = {
      ...currentProcurementData,
      analysisCompleted: true,
      analysisDate: new Date().toISOString(),
      analysisBy: user.id,
      outsourcedParts: [...(currentProcurementData.outsourcedParts || []), newOutsourcedPart],
      estimatedDeliveryDate: validatedData.expectedReturnDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
    }

    // Update order with new procurement data
    await prisma.order.update({
      where: { id: orderId },
      data: {
        procurementData: updatedProcurementData
      }
    })

    // Also create history log for tracking
    await prisma.orderHistoryLog.create({
      data: {
        orderId: orderId,
        userId: user.id,
        action: "PART_MARKED_FOR_OUTSOURCING",
        notes: `Part ${validatedData.partNumber} (${validatedData.partName}) marked for outsourcing to ${newOutsourcedPart.supplier}`,
      },
    })

    // Return the created outsourced part
    const responseOutsourcedPart = {
      id: newOutsourcedPart.id,
      partNumber: newOutsourcedPart.partNumber,
      partName: newOutsourcedPart.partName,
      quantity: newOutsourcedPart.quantity,
      supplier: newOutsourcedPart.supplier,
      status: newOutsourcedPart.status,
      category: newOutsourcedPart.category,
      notes: newOutsourcedPart.notes,
      markedAt: newOutsourcedPart.createdAt,
      markedBy: {
        id: user.id,
        fullName: user.name,
        email: user.email,
      },
    }

    return NextResponse.json({
      success: true,
      data: responseOutsourcedPart,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating outsourced part:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { success: false, error: "Failed to create outsourced part", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT /api/orders/[orderId]/outsourced-parts
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const resolvedParams = await params
    const orderId = resolvedParams.orderId
    
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only procurement specialists and admins can update outsourced parts
    if (!["ADMIN", "PROCUREMENT_SPECIALIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const outsourcedPartId = searchParams.get("id")

    if (!outsourcedPartId) {
      return NextResponse.json(
        { error: "Outsourced part ID is required" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateOutsourcedPartSchema.parse(body)

    // Get current order and its procurementData
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        procurementData: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Get existing procurement data
    const currentProcurementData = (order.procurementData as any) || {
      analysisCompleted: false,
      outsourcedParts: [],
      missingParts: []
    }

    // Find the outsourced part to update
    const outsourcedParts = currentProcurementData.outsourcedParts || []
    const partIndex = outsourcedParts.findIndex((part: any) => part.id === outsourcedPartId)

    if (partIndex === -1) {
      return NextResponse.json(
        { error: "Outsourced part not found" },
        { status: 404 }
      )
    }

    // Update the part with new data
    const updatedPart = {
      ...outsourcedParts[partIndex],
      ...Object.fromEntries(
        Object.entries(validatedData).filter(([_, value]) => value !== undefined)
      ),
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    }

    // Update the outsourced parts array
    outsourcedParts[partIndex] = updatedPart

    // Update procurement data
    const updatedProcurementData = {
      ...currentProcurementData,
      outsourcedParts,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: user.id
    }

    // Save updated procurement data
    await prisma.order.update({
      where: { id: orderId },
      data: {
        procurementData: updatedProcurementData
      }
    })

    // Create history log for tracking
    await prisma.orderHistoryLog.create({
      data: {
        orderId: orderId,
        userId: user.id,
        action: "OUTSOURCED_PART_UPDATED",
        notes: `Updated ${updatedPart.partNumber} status to ${updatedPart.status || 'PENDING'}`,
      },
    })

    console.log('📦 Updated outsourced part:', {
      orderId,
      partId: outsourcedPartId,
      partNumber: updatedPart.partNumber,
      status: updatedPart.status
    })

    // Return the updated part in the expected format
    const responseData = {
      id: updatedPart.id,
      partNumber: updatedPart.partNumber,
      partName: updatedPart.partName,
      quantity: updatedPart.quantity,
      supplier: updatedPart.supplier,
      status: updatedPart.status,
      category: updatedPart.category,
      notes: updatedPart.notes,
      expectedReturnDate: updatedPart.expectedReturnDate,
      actualReturnDate: updatedPart.actualReturnDate,
      markedAt: updatedPart.createdAt,
      updatedAt: updatedPart.updatedAt,
      markedBy: {
        id: user.id,
        fullName: user.name,
        email: user.email,
      },
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating outsourced part:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { success: false, error: "Failed to update outsourced part", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[orderId]/outsourced-parts
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const resolvedParams = await params
    const orderId = resolvedParams.orderId
    
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only procurement specialists and admins can delete outsourced parts
    if (!["ADMIN", "PROCUREMENT_SPECIALIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const outsourcedPartId = searchParams.get("id")

    if (!outsourcedPartId) {
      return NextResponse.json(
        { error: "Outsourced part ID is required" },
        { status: 400 }
      )
    }

    // Get current order and its procurementData
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        procurementData: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Get existing procurement data
    const currentProcurementData = (order.procurementData as any) || {
      analysisCompleted: false,
      outsourcedParts: [],
      missingParts: []
    }

    // Find the outsourced part to delete
    const outsourcedParts = currentProcurementData.outsourcedParts || []
    const partIndex = outsourcedParts.findIndex((part: any) => part.id === outsourcedPartId)

    if (partIndex === -1) {
      return NextResponse.json(
        { error: "Outsourced part not found" },
        { status: 404 }
      )
    }

    // Get part info before deletion for logging
    const partToDelete = outsourcedParts[partIndex]

    // Remove the part from the array
    outsourcedParts.splice(partIndex, 1)

    // Update procurement data
    const updatedProcurementData = {
      ...currentProcurementData,
      outsourcedParts,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: user.id
    }

    // Save updated procurement data
    await prisma.order.update({
      where: { id: orderId },
      data: {
        procurementData: updatedProcurementData
      }
    })

    // Create history log for tracking
    await prisma.orderHistoryLog.create({
      data: {
        orderId: orderId,
        userId: user.id,
        action: "OUTSOURCED_PART_DELETED",
        notes: `Removed ${partToDelete.partNumber} (${partToDelete.partName}) from outsourced parts`,
      },
    })

    console.log('📦 Deleted outsourced part:', {
      orderId,
      partId: outsourcedPartId,
      partNumber: partToDelete.partNumber
    })

    return NextResponse.json({
      success: true,
      message: "Outsourced part deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting outsourced part:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { success: false, error: "Failed to delete outsourced part", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}