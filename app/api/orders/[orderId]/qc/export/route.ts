import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, checkUserRole } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/orders/[orderId]/qc/export - Export QC results as CSV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!checkUserRole(user, ['QC_PERSON', 'PRODUCTION_COORDINATOR', 'ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const resultId = searchParams.get('resultId');

    // Get QC result
    const qcResult = await prisma.orderQcResult.findFirst({
      where: resultId 
        ? { id: resultId, orderId: orderId }
        : { orderId: orderId },
      include: {
        order: {
          select: {
            poNumber: true,
            buildNumbers: true,
            customerName: true,
            projectName: true
          }
        },
        qcFormTemplate: {
          include: {
            items: {
              orderBy: { order: 'asc' }
            }
          }
        },
        itemResults: {
          include: {
            qcFormTemplateItem: true
          }
        },
        qcPerformedBy: {
          select: {
            fullName: true,
            initials: true
          }
        }
      },
      orderBy: {
        qcTimestamp: 'desc'
      }
    });

    if (!qcResult) {
      return NextResponse.json({ error: 'QC result not found' }, { status: 404 });
    }

    if (format === 'csv') {
      return generateCSVResponse(qcResult);
    } else if (format === 'json') {
      return NextResponse.json({ qcResult });
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error exporting QC result:', error);
    return NextResponse.json({ error: 'Failed to export QC result' }, { status: 500 });
  }
}

function generateCSVResponse(qcResult: any) {
  // Build CSV content
  const csvRows = [];
  
  // Header information
  csvRows.push(['QC Checklist Export']);
  csvRows.push(['Template:', qcResult.qcFormTemplate.name]);
  csvRows.push(['Version:', qcResult.qcFormTemplate.version]);
  csvRows.push(['Order:', qcResult.order.poNumber]);
  csvRows.push(['Customer:', qcResult.order.customerName]);
  csvRows.push(['Build Numbers:', qcResult.order.buildNumbers.join(', ')]);
  csvRows.push(['QC Date:', new Date(qcResult.qcTimestamp).toLocaleString()]);
  csvRows.push(['QC Inspector:', qcResult.qcPerformedBy.fullName]);
  csvRows.push(['Overall Status:', qcResult.overallStatus]);
  csvRows.push(['']); // Empty row
  
  // Column headers
  csvRows.push(['Section', 'Checklist Item', 'Type', 'Result', 'Pass/Fail', 'Notes']);
  
  // Group items by section
  const sections = new Map();
  qcResult.qcFormTemplate.items.forEach((item: any) => {
    if (!sections.has(item.section)) {
      sections.set(item.section, []);
    }
    sections.get(item.section).push(item);
  });
  
  // Process each section
  sections.forEach((items, sectionName) => {
    items.forEach((item: any) => {
      const result = qcResult.itemResults.find((r: any) => r.qcFormTemplateItemId === item.id);
      
      let resultValue = '';
      let passFailValue = '';
      let notes = '';
      
      if (result) {
        if (item.itemType === 'PASS_FAIL') {
          passFailValue = result.isConformant ? 'PASS' : 'FAIL';
        } else {
          resultValue = result.resultValue || '';
        }
        notes = result.notes || '';
      }
      
      csvRows.push([
        sectionName,
        item.checklistItem,
        item.itemType,
        resultValue,
        passFailValue,
        notes
      ]);
    });
  });
  
  // Add general notes if any
  if (qcResult.notes) {
    csvRows.push(['']); // Empty row
    csvRows.push(['General Notes:', qcResult.notes]);
  }
  
  // Convert to CSV string
  const csvContent = csvRows.map(row => 
    row.map(field => {
      // Escape quotes and wrap in quotes if contains comma or newline
      const escaped = String(field).replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
        ? `"${escaped}"`
        : escaped;
    }).join(',')
  ).join('\n');
  
  // Return CSV response
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="qc_result_${qcResult.order.poNumber}_${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}