import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { generateBOMForOrder } from '@/lib/bomService.native';
// PDF export types will be imported dynamically to avoid build issues

// Local type definitions to avoid static imports
interface BOMItem {
  id?: string
  partIdOrAssemblyId?: string
  partNumber?: string
  name: string
  description?: string
  quantity: number
  category?: string
  itemType?: string
  isCustom?: boolean
  parentId?: string
}

interface OrderInfo {
  poNumber: string
  customerName: string
  orderDate?: string | Date
  wantDate?: string | Date
  projectName?: string
  salesPerson?: string
  buildNumbers?: string[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const resolvedParams = await params;
  const orderId = resolvedParams.orderId;
  
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
    let bomItems: BOMItem[] = [];
    if (order.generatedBoms && order.generatedBoms.length > 0) {
      // Use existing BOM items and convert to our format
      bomItems = order.generatedBoms[0].bomItems.map(item => ({
        id: item.id,
        partIdOrAssemblyId: item.partIdOrAssemblyId,
        partNumber: item.partIdOrAssemblyId,
        name: item.name,
        description: item.name,
        quantity: item.quantity,
        itemType: item.itemType,
        category: item.category || undefined,
        isCustom: item.isCustom,
        parentId: item.parentId || undefined
      }));
    } else {
      // Generate new BOM
      const bomResult = await generateBOMForOrder(order);
      bomItems = (bomResult.bomItems || []).map(item => ({
        id: item.id,
        partIdOrAssemblyId: item.partIdOrAssemblyId,
        partNumber: item.partIdOrAssemblyId,
        name: item.name,
        description: item.name,
        quantity: item.quantity,
        itemType: item.itemType,
        category: item.category || undefined,
        isCustom: item.isCustom,
        parentId: item.parentId || undefined
      }));
    }

    // Prepare order info for PDF generation
    const orderInfo: OrderInfo = {
      poNumber: order.poNumber,
      customerName: order.customerName,
      orderDate: order.createdAt,
      wantDate: order.wantDate,
      projectName: order.projectName || undefined,
      salesPerson: order.salesPerson || undefined,
      buildNumbers: order.sinkConfigurations?.map(config => config.buildNumber) || undefined
    };

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
      // PDF generation is now handled client-side due to browser dependencies
      // Return the data needed for client-side PDF generation
      try {
        // Import server-safe aggregation utilities (no jsPDF dependencies)
        const { aggregateBOMItems, sortBOMItemsByPriority } = await import('@/lib/bomAggregation');
        
        // Aggregate BOM items (flatten and combine quantities)
        const aggregatedItems = sortBOMItemsByPriority(aggregateBOMItems(bomItems));
        
        return NextResponse.json({
          success: true,
          data: {
            bomItems: aggregatedItems,
            orderInfo: orderInfo
          }
        });
      } catch (pdfError) {
        console.error('PDF data preparation error:', pdfError);
        return NextResponse.json(
          { error: 'Failed to prepare PDF data. Please try CSV format.' },
          { status: 500 }
        );
      }
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