import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getAuthUser } from "@/lib/auth"
import { z } from "zod"

const prisma = new PrismaClient()

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
    const { orderId } = await params
    
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to view procurement data
    if (!["ADMIN", "PROCUREMENT_SPECIALIST", "PRODUCTION_COORDINATOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // TODO: OutsourcedPart model doesn't exist in schema yet
    // For now, return a simulated response based on order history or comments
    console.log('📦 Fetching outsourced parts for order:', orderId)
    
    // Check if there are any order history logs about outsourced parts
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
    const outsourcedParts = orderHistory.map(log => {
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

    return NextResponse.json({
      success: true,
      data: outsourcedParts,
    })
  } catch (error) {
    console.error("Error fetching outsourced parts:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch outsourced parts" },
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
    const { orderId } = await params
    
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

    // TODO: OutsourcedPart model doesn't exist in schema yet
    // For now, simulate creating an outsourced part by logging it in order history
    
    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Log the action as order history (since OutsourcedPart table doesn't exist)
    // Store part data as JSON in notes field for reliable parsing
    const partData = {
      partNumber: validatedData.partNumber,
      partName: validatedData.partName,
      quantity: validatedData.quantity,
      supplier: validatedData.supplier || 'Sink Body Manufacturer',
      notes: validatedData.notes
    }
    
    const historyLog = await prisma.orderHistoryLog.create({
      data: {
        orderId: orderId,
        userId: user.id,
        action: "PART_MARKED_FOR_OUTSOURCING",
        notes: `OUTSOURCED_PART_DATA:${JSON.stringify(partData)}`,
      },
    })

    // Return a simulated outsourced part response
    const simulatedOutsourcedPart = {
      id: historyLog.id,
      partNumber: validatedData.partNumber,
      partName: validatedData.partName,
      quantity: validatedData.quantity,
      supplier: validatedData.supplier || 'Sink Body Manufacturer',
      status: 'PENDING', // Default status
      notes: validatedData.notes,
      markedAt: historyLog.createdAt,
      markedBy: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    }

    return NextResponse.json({
      success: true,
      data: simulatedOutsourcedPart,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating outsourced part:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create outsourced part" },
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
    const { orderId } = await params
    
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

    // TODO: OutsourcedPart model doesn't exist in schema yet
    return NextResponse.json(
      { success: false, error: "OutsourcedPart feature not yet implemented" },
      { status: 501 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating outsourced part:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update outsourced part" },
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
    const { orderId } = await params
    
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

    // TODO: OutsourcedPart model doesn't exist in schema yet
    return NextResponse.json(
      { success: false, error: "OutsourcedPart feature not yet implemented" },
      { status: 501 }
    )
  } catch (error) {
    console.error("Error deleting outsourced part:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete outsourced part" },
      { status: 500 }
    )
  }
}