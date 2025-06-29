import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    // Fetch orders that need QC inspection OR have completed QC
    const ordersNeedingQC = await prisma.order.findMany({
      where: {
        OR: [
          { orderStatus: "READY_FOR_PRE_QC" },
          { orderStatus: "READY_FOR_FINAL_QC" },
          // Include orders that have completed QC
          { orderStatus: "READY_FOR_PRODUCTION" }, // Completed Pre-QC
          { orderStatus: "READY_FOR_SHIP" }, // Completed Final QC
          { orderStatus: "TESTING_COMPLETE" } // Completed other QC types
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
            },
            qcPerformedBy: {
              select: {
                fullName: true
              }
            }
          },
          orderBy: {
            qcTimestamp: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Transform to QC tasks format matching the QCTask interface
    const tasks = ordersNeedingQC.map(order => {
      // Determine QC task status based on order status and QC results
      let taskStatus: "PENDING" | "IN_PROGRESS" | "PRE_QC_COMPLETED" | "FINAL_QC_COMPLETED" | "FAILED" = "PENDING";
      let completedAt: string | undefined = undefined;
      let templateName = "Pre-Production Check";
      
      if (order.qcResults && order.qcResults.length > 0) {
        const latestQcResult = order.qcResults[0]; // Most recent QC result
        
        if (latestQcResult.overallStatus === "PASSED") {
          // Determine completion type based on template name
          if (latestQcResult.qcFormTemplate?.name?.includes("Pre-Production")) {
            taskStatus = "PRE_QC_COMPLETED";
          } else if (latestQcResult.qcFormTemplate?.name?.includes("Final")) {
            taskStatus = "FINAL_QC_COMPLETED";
          } else {
            taskStatus = "PRE_QC_COMPLETED"; // Default to Pre-QC for now
          }
        } else if (latestQcResult.overallStatus === "FAILED") {
          taskStatus = "FAILED";
        }
        
        completedAt = latestQcResult.qcTimestamp?.toISOString();
        templateName = latestQcResult.qcFormTemplate?.name || templateName;
      } else {
        // No QC results yet - determine based on order status
        if (order.orderStatus === "READY_FOR_PRE_QC") {
          taskStatus = "PENDING";
          templateName = "Pre-Production Check";
        } else if (order.orderStatus === "READY_FOR_FINAL_QC") {
          taskStatus = "PENDING";
          templateName = "Final QC Check";
        } else {
          // Order has moved to next status but no QC results found - might be in progress
          taskStatus = "IN_PROGRESS";
        }
      }
      
      return {
        id: order.id,
        orderId: order.id,
        poNumber: order.poNumber,
        customerName: order.customerName,
        productFamily: order.productFamily || "MDRD_T2_SINK",
        status: taskStatus,
        priority: "MEDIUM" as const,
        dueDate: order.wantDate || new Date().toISOString(),
        templateId: order.qcResults?.[0]?.qcFormTemplate?.id || "default-template",
        templateName,
        assignedAt: order.createdAt.toISOString(),
        completedAt,
        notes: order.projectName || undefined
      };
    })

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