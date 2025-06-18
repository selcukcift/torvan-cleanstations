import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';
import { generateBOMForOrder } from '@/lib/bomService.native';
// Dynamic imports to avoid build issues
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  
  try {
    // Check authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    console.log('BOM Export - Order ID:', orderId);
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Get format from query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Fetch the order with all related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sinkConfigurations: true,
        basinConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true,
        generatedBoms: {
          include: {
            bomItems: true
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
    if (user.role !== 'ADMIN' && order.createdById !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Generate BOM if not already generated
    interface BomItem {
      id: string;
      partIdOrAssemblyId: string;
      name: string;
      quantity: number;
      itemType: string;
      category?: string | null;
      isCustom: boolean;
      parentId?: string | null;
      bomId: string;
    }
    
    let bomItems: BomItem[] = [];
    if (order.generatedBoms && order.generatedBoms.length > 0) {
      // Use existing BOM items
      bomItems = order.generatedBoms[0].bomItems;
    } else {
      // Generate new BOM
      const bomResult = await generateBOMForOrder(order);
      bomItems = bomResult.bomItems || [];
    }

    // Format BOM items for export
    const formattedBOM = bomItems.map(item => ({
      partNumber: item.partIdOrAssemblyId,
      description: item.name,
      category: item.category || '',
      subcategory: '',
      quantity: item.quantity,
      unitPrice: 0,
      totalPrice: 0,
      source: item.itemType,
      notes: ''
    }));

    // Calculate totals
    const totalQuantity = bomItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = 0; // Pricing not implemented yet

    if (format === 'pdf') {
      // PDF export temporarily disabled due to dependency issues
      return NextResponse.json(
        { error: 'PDF export is temporarily unavailable. Please use CSV format.' },
        { status: 501 }
      );
    } else {
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
          'Content-Disposition': `attachment; filename="order-${order.poNumber}-bom.csv"`
        }
      });
    }

  } catch (error) {
    console.error('Error exporting BOM:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}