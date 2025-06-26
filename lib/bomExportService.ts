/**
 * BOM Export Service
 * 
 * Provides Excel-like PDF export functionality for Bill of Materials
 * with comprehensive hierarchical data including all parent-child relationships
 */

import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface BOMExportItem {
  id: string
  partNumber?: string
  name: string
  description?: string
  quantity: number
  unitOfMeasure?: string
  category: string
  type: string
  level: number
  parentId?: string
  parentName?: string
  manufacturer?: string
  manufacturerPartNumber?: string
  status?: string
  notes?: string
  indentLevel?: number
  isChild?: boolean
  hasChildren?: boolean
  isAssembly?: boolean
  isPart?: boolean
  totalCost?: number
  unitCost?: number
}

export interface BOMExportData {
  orderInfo: {
    orderId?: string
    customerName?: string
    orderDate?: string
    buildNumbers?: string[]
    projectName?: string
  }
  items: BOMExportItem[]
  summary: {
    totalItems: number
    totalQuantity: number
    maxDepth: number
    itemsByLevel: Record<number, number>
    assembliesCount: number
    partsCount: number
  }
}

export class BOMExportService {
  
  /**
   * Convert hierarchical BOM data to flat export format
   */
  static flattenBOMForExport(hierarchicalBOM: any[], orderInfo: any = {}): BOMExportData {
    const exportItems: BOMExportItem[] = []
    const summary = {
      totalItems: 0,
      totalQuantity: 0,
      maxDepth: 0,
      itemsByLevel: {} as Record<number, number>,
      assembliesCount: 0,
      partsCount: 0
    }

    const processItem = (
      item: any, 
      level: number = 0, 
      parentId?: string, 
      parentName?: string
    ): void => {
      const isAssembly = item.type !== 'PART' && item.type !== 'COMPONENT'
      const children = item.components || item.children || item.subItems || []
      const hasChildren = children.length > 0

      const exportItem: BOMExportItem = {
        id: item.id || item.assemblyId || item.partNumber || `unknown-${exportItems.length}`,
        partNumber: item.partNumber || item.id || item.assemblyId,
        name: item.name || 'Unknown Item',
        description: item.description || '',
        quantity: item.quantity || 1,
        unitOfMeasure: item.unitOfMeasure || 'EA',
        category: item.category || 'UNKNOWN',
        type: item.type || 'UNKNOWN',
        level: level,
        parentId: parentId,
        parentName: parentName,
        manufacturer: item.manufacturer || item.manufacturerInfo?.name || '',
        manufacturerPartNumber: item.manufacturerPartNumber || item.manufacturer_part_number || '',
        status: item.status || 'ACTIVE',
        notes: item.notes || '',
        indentLevel: level,
        isChild: level > 0,
        hasChildren: hasChildren,
        isAssembly: isAssembly,
        isPart: !isAssembly,
        totalCost: item.totalCost || 0,
        unitCost: item.unitCost || 0
      }

      exportItems.push(exportItem)

      // Update summary
      summary.totalItems++
      summary.totalQuantity += exportItem.quantity
      summary.maxDepth = Math.max(summary.maxDepth, level)
      summary.itemsByLevel[level] = (summary.itemsByLevel[level] || 0) + 1
      
      if (isAssembly) {
        summary.assembliesCount++
      } else {
        summary.partsCount++
      }

      // Process children recursively
      if (hasChildren) {
        children.forEach((child: any) => {
          processItem(child, level + 1, exportItem.id, exportItem.name)
        })
      }
    }

    // Process all top-level items
    hierarchicalBOM.forEach(item => {
      processItem(item, 0)
    })

    return {
      orderInfo: {
        orderId: orderInfo.orderId || 'N/A',
        customerName: orderInfo.customerName || orderInfo.customer?.name || 'Unknown Customer',
        orderDate: orderInfo.orderDate || new Date().toISOString().split('T')[0],
        buildNumbers: orderInfo.buildNumbers || ['Unknown'],
        projectName: orderInfo.projectName || 'CleanStation BOM'
      },
      items: exportItems,
      summary
    }
  }

  /**
   * Generate Excel-like PDF with comprehensive BOM data
   */
  static async generatePDF(exportData: BOMExportData): Promise<Uint8Array> {
    const pdf = new jsPDF('l', 'mm', 'a4') // Landscape orientation for more columns
    
    // Colors and styling
    const colors = {
      primary: [41, 128, 185], // Blue
      secondary: [52, 73, 94], // Dark gray
      accent: [231, 76, 60], // Red
      light: [236, 240, 241], // Light gray
      white: [255, 255, 255],
      success: [39, 174, 96], // Green
      warning: [241, 196, 15] // Yellow
    }

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15

    let yPosition = margin

    // Header Section
    pdf.setFillColor(...colors.primary)
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 25, 'F')
    
    pdf.setTextColor(...colors.white)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text('BILL OF MATERIALS', margin + 5, yPosition + 8)
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, yPosition + 8)
    
    yPosition += 35

    // Order Information Section
    pdf.setTextColor(...colors.secondary)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Order Information', margin, yPosition)
    yPosition += 8

    const orderInfo = [
      ['Order ID:', exportData.orderInfo.orderId || 'N/A'],
      ['Customer:', exportData.orderInfo.customerName || 'Unknown'],
      ['Date:', exportData.orderInfo.orderDate || 'N/A'],
      ['Build Numbers:', (exportData.orderInfo.buildNumbers || []).join(', ')],
      ['Project:', exportData.orderInfo.projectName || 'CleanStation BOM']
    ]

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    orderInfo.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(label, margin, yPosition)
      pdf.setFont('helvetica', 'normal')
      pdf.text(value, margin + 30, yPosition)
      yPosition += 6
    })

    yPosition += 10

    // Summary Section
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Summary', margin, yPosition)
    yPosition += 8

    const summaryInfo = [
      ['Total Items:', exportData.summary.totalItems.toString()],
      ['Total Quantity:', exportData.summary.totalQuantity.toString()],
      ['Assemblies:', exportData.summary.assembliesCount.toString()],
      ['Parts:', exportData.summary.partsCount.toString()],
      ['Max Depth:', `${exportData.summary.maxDepth} levels`]
    ]

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    summaryInfo.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold')
      pdf.text(label, margin, yPosition)
      pdf.setFont('helvetica', 'normal')
      pdf.text(value, margin + 30, yPosition)
      yPosition += 6
    })

    yPosition += 15

    // Prepare table data
    const tableHeaders = [
      'Level',
      'Part Number',
      'Description',
      'Qty',
      'UOM',
      'Category',
      'Type',
      'Parent',
      'Manufacturer',
      'MPN',
      'Status'
    ]

    const tableData = exportData.items.map(item => [
      item.level.toString(),
      item.partNumber || '',
      item.name || '',
      item.quantity.toString(),
      item.unitOfMeasure || 'EA',
      item.category || '',
      item.type || '',
      item.parentName || '',
      item.manufacturer || '',
      item.manufacturerPartNumber || '',
      item.status || ''
    ])

    // Generate table with styling
    pdf.autoTable({
      startY: yPosition,
      head: [tableHeaders],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fillColor: colors.primary,
        textColor: colors.white,
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: colors.light
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 }, // Level
        1: { cellWidth: 25 }, // Part Number
        2: { cellWidth: 50 }, // Description
        3: { halign: 'center', cellWidth: 15 }, // Qty
        4: { halign: 'center', cellWidth: 15 }, // UOM
        5: { cellWidth: 20 }, // Category
        6: { cellWidth: 18 }, // Type
        7: { cellWidth: 35 }, // Parent
        8: { cellWidth: 25 }, // Manufacturer
        9: { cellWidth: 25 }, // MPN
        10: { halign: 'center', cellWidth: 18 } // Status
      },
      didParseCell: function(data: any) {
        const item = exportData.items[data.row.index]
        if (data.section === 'body' && item) {
          // Indent based on level
          if (data.column.index === 2) { // Description column
            const indent = '  '.repeat(item.level)
            data.cell.text[0] = indent + data.cell.text[0]
          }
          
          // Color coding based on level and type
          if (item.level === 0) {
            data.cell.styles.fillColor = [230, 230, 250] // Light blue for top level
            data.cell.styles.fontStyle = 'bold'
          } else if (item.level === 1) {
            data.cell.styles.fillColor = [245, 245, 245] // Light gray for level 1
          } else if (item.level >= 2) {
            data.cell.styles.fillColor = [250, 250, 250] // Very light gray for grandchildren
          }
          
          // Assembly vs Part styling
          if (item.isAssembly) {
            data.cell.styles.textColor = colors.primary
          } else {
            data.cell.styles.textColor = colors.secondary
          }
        }
      },
      didDrawPage: function(data: any) {
        // Add page footer
        const pageNumber = pdf.getNumberOfPages()
        pdf.setFontSize(8)
        pdf.setTextColor(...colors.secondary)
        pdf.text(
          `Page ${pageNumber} - Generated by CleanStation BOM System`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
      }
    })

    // Add legend on last page
    const finalY = (pdf as any).lastAutoTable.finalY + 20
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...colors.secondary)
    pdf.text('Legend', margin, finalY)
    
    const legendItems = [
      { color: [230, 230, 250], text: 'Top Level Items (Level 0)' },
      { color: [245, 245, 245], text: 'Sub-assemblies (Level 1)' },
      { color: [250, 250, 250], text: 'Components/Parts (Level 2+)' }
    ]
    
    let legendY = finalY + 8
    legendItems.forEach(item => {
      pdf.setFillColor(...item.color)
      pdf.rect(margin, legendY - 3, 8, 5, 'F')
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(item.text, margin + 12, legendY)
      legendY += 8
    })

    return pdf.output('arraybuffer') as Uint8Array
  }

  /**
   * Download PDF file
   */
  static downloadPDF(pdfData: Uint8Array, filename: string = 'BOM_Export.pdf'): void {
    const blob = new Blob([pdfData], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  /**
   * Generate aggregated BOM (combines identical items across all levels)
   */
  static generateAggregatedBOM(exportData: BOMExportData): BOMExportData {
    const aggregatedMap = new Map<string, BOMExportItem>()
    
    exportData.items.forEach(item => {
      const key = item.partNumber || item.id
      
      if (aggregatedMap.has(key)) {
        const existing = aggregatedMap.get(key)!
        existing.quantity += item.quantity
        // Keep the lowest level (most detailed) information
        if (item.level < existing.level) {
          existing.level = item.level
          existing.parentId = item.parentId
          existing.parentName = item.parentName
        }
      } else {
        aggregatedMap.set(key, { ...item })
      }
    })
    
    const aggregatedItems = Array.from(aggregatedMap.values())
      .sort((a, b) => {
        // Sort by level first, then by name
        if (a.level !== b.level) return a.level - b.level
        return a.name.localeCompare(b.name)
      })
    
    // Recalculate summary
    const summary = {
      totalItems: aggregatedItems.length,
      totalQuantity: aggregatedItems.reduce((sum, item) => sum + item.quantity, 0),
      maxDepth: exportData.summary.maxDepth,
      itemsByLevel: exportData.summary.itemsByLevel,
      assembliesCount: aggregatedItems.filter(item => item.isAssembly).length,
      partsCount: aggregatedItems.filter(item => item.isPart).length
    }
    
    return {
      ...exportData,
      items: aggregatedItems,
      summary
    }
  }
}

export default BOMExportService