import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const serviceRequests = await prisma.serviceOrder.findMany({
      where: {
        status: 'PENDING_APPROVAL',
      },
      include: {
        requestedBy: {
          select: {
            fullName: true,
          },
        },
        items: {
          select: {
            quantityRequested: true,
          },
        },
      },
      orderBy: {
        requestTimestamp: 'asc',
      },
    });

    const formattedRequests = serviceRequests.map(req => ({
      id: req.id,
      requestNumber: req.id.substring(0, 8).toUpperCase(), // Simple ID for display
      department: req.requestedBy.fullName || 'N/A',
      priority: 'NORMAL', // Assuming normal for now, can be added to schema
      status: req.status,
      createdAt: req.requestTimestamp.toISOString(),
      itemsCount: req.items.reduce((sum, item) => sum + item.quantityRequested, 0),
    }));

    return NextResponse.json({ success: true, data: formattedRequests });
  } catch (error) {
    console.error("Error fetching service requests:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch service requests" }, { status: 500 });
  }
}
