import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const OrderStatusUpdateSchema = z.object({
  newStatus: z.enum([
    'SINK_BODY_EXTERNAL_PRODUCTION',
    'READY_FOR_PRE_QC',
    'PRE_QC_REJECTED',
    'ASSEMBLY_REWORK_PRE_QC',
    'READY_FOR_PRODUCTION',
    'ASSEMBLY_ON_HOLD_PARTS_ISSUE',
    'TESTING_COMPLETE',
    'PACKAGING_COMPLETE',
    'READY_FOR_FINAL_QC',
    'FINAL_QC_REJECTED',
    'ASSEMBLY_REWORK_FINAL_QC',
    'READY_FOR_SHIP',
    'SHIPPED',
  ]),
  notes: z.string().optional().nullable(),
  userId: z.string().optional(), // Optional, will be derived from session in real app
});

export async function PUT(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    const body = await request.json();
    const validatedData = OrderStatusUpdateSchema.parse(body);

    // In a real application, you would get the userId from the session
    const userId = validatedData.userId || 'system'; // Placeholder

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: validatedData.newStatus,
        historyLogs: {
          create: {
            userId: userId,
            action: `Order status changed from ${existingOrder.orderStatus} to ${validatedData.newStatus}`,
            oldStatus: existingOrder.orderStatus,
            newStatus: validatedData.newStatus,
            notes: validatedData.notes,
          },
        },
        notifications: {
          create: {
            message: `Order ${existingOrder.poNumber} status changed to ${validatedData.newStatus}`,
            linkToOrder: orderId,
            type: 'ORDER_STATUS_CHANGE',
            recipientId: userId, // Assuming the user who triggered the change should be notified
          },
        },
      },
    });

    return NextResponse.json({ success: true, message: "Order status updated successfully", order: updatedOrder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation Error", errors: error.errors }, { status: 400 });
    }
    console.error("Error updating order status:", error);
    return NextResponse.json({ message: "Failed to update order status" }, { status: 500 });
  }
}