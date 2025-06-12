import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getAuthUser } from "@/lib/auth"

const prisma = new PrismaClient()

// GET /api/qc/tasks - Get QC tasks for the current user
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has QC permissions
    if (!["ADMIN", "QC_PERSON", "PRODUCTION_COORDINATOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch orders that need QC inspection
    const ordersNeedingQC = await prisma.order.findMany({
      where: {
        OR: [
          { orderStatus: "READY_FOR_PRE_QC" },
          { orderStatus: "READY_FOR_FINAL_QC" }
        ]
      },
      include: {
        createdBy: {
          select: {
            fullName: true
          }
        },
        qcResults: {
          include: {
            qcFormTemplate: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    })

    // Transform to QC tasks format
    const tasks = ordersNeedingQC.map(order => ({
      id: order.id,
      poNumber: order.poNumber,
      customerName: order.customerName,
      projectName: order.projectName,
      status: order.orderStatus,
      type: order.orderStatus === "READY_FOR_PRE_QC" ? "Pre-Production Check" : "Final QC",
      priority: "medium" as const,
      assignedTo: order.currentAssignee || null,
      dueDate: order.wantDate,
      createdAt: order.createdAt,
      createdBy: order.createdBy.fullName,
      qcResults: order.qcResults
    }))

    return NextResponse.json({
      success: true,
      tasks
    })

  } catch (error) {
    console.error("Error fetching QC tasks:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch QC tasks" },
      { status: 500 }
    )
  }
}