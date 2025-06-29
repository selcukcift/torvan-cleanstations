import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/auth"


// GET /api/orders/[orderId]/qc/photos
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to view QC photos
    if (!["ADMIN", "QC_PERSON", "PRODUCTION_COORDINATOR"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { orderId } = await params
    // Get QC photos for this order
    const photos = await prisma.fileUpload.findMany({
      where: {
        metadata: {
          path: ["orderId"],
          equals: orderId
        },
        category: "qc-photo"
      },
      orderBy: {
        uploadedAt: "desc"
      },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        uploadedAt: true,
        metadata: true,
        uploadedBy: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: photos.map(photo => ({
        id: photo.id,
        filename: photo.filename,
        originalName: photo.originalName,
        mimeType: photo.mimeType,
        size: photo.size,
        uploadedAt: photo.uploadedAt,
        category: photo.metadata?.category || "inspection",
        notes: photo.metadata?.notes || "",
        uploadedBy: photo.uploadedBy?.fullName
      }))
    })
  } catch (error) {
    console.error("Error fetching QC photos:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch QC photos" },
      { status: 500 }
    )
  }
}

// POST /api/orders/[orderId]/qc/photos
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only QC persons and admins can add QC photos
    if (!["ADMIN", "QC_PERSON"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { orderId } = await params
    const { fileId, category, notes } = await request.json()

    // Update the file metadata to mark it as a QC photo for this order
    const updatedFile = await prisma.fileUpload.update({
      where: { id: fileId },
      data: {
        category: "qc-photo",
        metadata: {
          orderId: orderId,
          category: category || "inspection",
          notes: notes || "",
          qcPhotoType: "inspection"
        }
      }
    })

    // Log the action
    await prisma.orderHistoryLog.create({
      data: {
        orderId: orderId,
        userId: user.id,
        action: "QC_PHOTO_ADDED",
        notes: `QC photo added: ${category} - ${notes}`
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedFile.id,
        filename: updatedFile.filename,
        category: category,
        notes: notes
      }
    })
  } catch (error) {
    console.error("Error adding QC photo:", error)
    return NextResponse.json(
      { success: false, error: "Failed to add QC photo" },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[orderId]/qc/photos
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only QC persons and admins can delete QC photos
    if (!["ADMIN", "QC_PERSON"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { orderId } = await params
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get("photoId")

    if (!photoId) {
      return NextResponse.json(
        { error: "Photo ID is required" },
        { status: 400 }
      )
    }

    // Verify the photo belongs to this order
    const photo = await prisma.fileUpload.findFirst({
      where: {
        id: photoId,
        metadata: {
          path: ["orderId"],
          equals: orderId
        }
      }
    })

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      )
    }

    // Delete the photo
    await prisma.fileUpload.delete({
      where: { id: photoId }
    })

    // Log the action
    await prisma.orderHistoryLog.create({
      data: {
        orderId: orderId,
        userId: user.id,
        action: "QC_PHOTO_DELETED",
        notes: `QC photo deleted: ${photo.originalName}`
      }
    })

    return NextResponse.json({
      success: true,
      message: "QC photo deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting QC photo:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete QC photo" },
      { status: 500 }
    )
  }
}