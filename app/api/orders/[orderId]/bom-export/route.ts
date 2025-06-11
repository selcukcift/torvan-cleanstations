import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';
import { generateBOMForOrder } from '@/lib/bomService.native';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Check authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Fetch the order with all related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            assembly: true
          }
        },
        bomItems: {
          include: {
            part: true,
            assembly: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check authorization - users can only view their own orders unless admin
    if (user.role !== 'ADMIN' && order.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Generate BOM if not already generated
    let bomItems = order.bomItems;
    if (!bomItems || bomItems.length === 0) {
      const bomResult = await generateBOMForOrder(order);
      bomItems = bomResult.bomItems;
    }

    // Format BOM items for export
    const formattedBOM = bomItems.map(item => ({
      partNumber: item.partNumber,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      source: item.source,
      notes: item.notes
    }));

    // Calculate totals
    const totalQuantity = bomItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = bomItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    // Create CSV content
    const csvHeaders = [
      'Part Number',
      'Description', 
      'Category',
      'Subcategory',
      'Quantity',
      'Unit Price',
      'Total Price',
      'Source',
      'Notes'
    ].join(',');

    const csvRows = formattedBOM.map(item => [
      `"${item.partNumber || ''}"`,
      `"${item.description || ''}"`,
      `"${item.category || ''}"`,
      `"${item.subcategory || ''}"`,
      item.quantity,
      item.unitPrice || 0,
      item.totalPrice || 0,
      `"${item.source || ''}"`,
      `"${item.notes || ''}"`
    ].join(','));

    const csvContent = [
      csvHeaders,
      ...csvRows,
      '',
      `"Total Items",,,"${bomItems.length}"`,
      `"Total Quantity",,,"${totalQuantity}"`,
      `"Total Price",,,"$${totalPrice.toFixed(2)}"`
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="order-${orderId}-bom.csv"`
      }
    });

  } catch (error) {
    console.error('Error exporting BOM:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}