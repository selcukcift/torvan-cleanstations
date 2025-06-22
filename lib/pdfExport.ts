import { format } from 'date-fns'

// Use dynamic imports for jsPDF to avoid SSR issues
let jsPDF: any = null
let autoTable: any = null

// Initialize jsPDF and autoTable dynamically
const initializePDF = async () => {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available on the client side')
  }
  
  if (!jsPDF) {
    // Import jsPDF without html2canvas dependencies
    const jsPDFModule = await import('jspdf')
    jsPDF = jsPDFModule.default
    
    // Import autoTable plugin
    const autoTableModule = await import('jspdf-autotable')
    autoTable = autoTableModule.default
  }
  
  return { jsPDF, autoTable }
}

export interface BOMItem {
  assemblyId?: string
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

export interface AggregatedBOMItem {
  partNumber: string
  description: string
  quantity: number
  category: string
  sources: string[]
}

export interface OrderInfo {
  poNumber: string
  customerName: string
  orderDate?: string | Date
  wantDate?: string | Date
  projectName?: string
  salesPerson?: string
  buildNumbers?: string[]
}

/**
 * Aggregates BOM items by part number, combining quantities
 */
export function aggregateBOMItems(bomItems: BOMItem[]): AggregatedBOMItem[] {
  const aggregated = new Map<string, AggregatedBOMItem>()

  bomItems.forEach(item => {
    // Get the part number from various possible fields
    const partNumber = item.partNumber || 
                      item.assemblyId || 
                      item.partIdOrAssemblyId || 
                      item.id || 
                      'UNKNOWN'

    const description = item.description || item.name || partNumber
    const category = item.category || item.itemType || 'UNCATEGORIZED'
    const source = item.itemType || 'UNKNOWN'

    if (aggregated.has(partNumber)) {
      const existing = aggregated.get(partNumber)!
      existing.quantity += item.quantity
      if (!existing.sources.includes(source)) {
        existing.sources.push(source)
      }
    } else {
      aggregated.set(partNumber, {
        partNumber,
        description,
        quantity: item.quantity,
        category: category.toUpperCase(),
        sources: [source]
      })
    }
  })

  // Convert to array and sort by category, then by part number
  return Array.from(aggregated.values()).sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category)
    }
    return a.partNumber.localeCompare(b.partNumber)
  })
}

/**
 * Generates a PDF for the flattened BOM
 */
export async function generateBOMPDF(
  aggregatedItems: AggregatedBOMItem[],
  orderInfo: OrderInfo
): Promise<any> {
  const { jsPDF: PDFClass } = await initializePDF()
  const doc = new PDFClass()

  // Set up fonts and colors
  const primaryColor = [37, 99, 235] // Blue-600
  const secondaryColor = [107, 114, 128] // Gray-500
  const textColor = [31, 41, 55] // Gray-800

  // Header
  doc.setFontSize(20)
  doc.setTextColor(...primaryColor)
  doc.text('Bill of Materials - Flattened View', 20, 25)

  // Order information
  doc.setFontSize(10)
  doc.setTextColor(...textColor)
  let yPos = 40

  const orderDetails = [
    ['Order:', orderInfo.poNumber],
    ['Customer:', orderInfo.customerName],
    ...(orderInfo.projectName ? [['Project:', orderInfo.projectName]] : []),
    ...(orderInfo.salesPerson ? [['Sales Person:', orderInfo.salesPerson]] : []),
    ...(orderInfo.buildNumbers?.length ? [['Build Numbers:', orderInfo.buildNumbers.join(', ')]] : []),
    ['Order Date:', orderInfo.orderDate ? format(new Date(orderInfo.orderDate), 'MMM dd, yyyy') : 'N/A'],
    ['Want Date:', orderInfo.wantDate ? format(new Date(orderInfo.wantDate), 'MMM dd, yyyy') : 'N/A'],
    ['Generated:', format(new Date(), 'MMM dd, yyyy HH:mm')]
  ]

  // Display order details in two columns
  const leftColumn = orderDetails.slice(0, Math.ceil(orderDetails.length / 2))
  const rightColumn = orderDetails.slice(Math.ceil(orderDetails.length / 2))

  leftColumn.forEach(([label, value], index) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, 20, yPos + (index * 6))
    doc.setFont('helvetica', 'normal')
    doc.text(value, 50, yPos + (index * 6))
  })

  rightColumn.forEach(([label, value], index) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, 120, yPos + (index * 6))
    doc.setFont('helvetica', 'normal')
    doc.text(value, 150, yPos + (index * 6))
  })

  // Table data
  const tableData = aggregatedItems.map(item => [
    item.partNumber,
    item.description,
    item.quantity.toString(),
    item.category,
    item.sources.join(', ')
  ])

  // Calculate totals
  const totalItems = aggregatedItems.length
  const totalQuantity = aggregatedItems.reduce((sum, item) => sum + item.quantity, 0)

  // Add totals row
  tableData.push([
    { content: 'TOTALS', styles: { fontStyle: 'bold' } },
    { content: `${totalItems} unique items`, styles: { fontStyle: 'bold' } },
    { content: totalQuantity.toString(), styles: { fontStyle: 'bold' } },
    { content: '', styles: { fontStyle: 'bold' } },
    { content: '', styles: { fontStyle: 'bold' } }
  ])

  // AutoTable configuration
  const tableStartY = yPos + (Math.max(leftColumn.length, rightColumn.length) * 6) + 10

  // Get autoTable function
  await initializePDF() // Ensure autoTable is loaded
  autoTable(doc, {
    head: [['Part Number', 'Description', 'Qty', 'Category', 'Sources']],
    body: tableData,
    startY: tableStartY,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: textColor,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Part Number
      1: { cellWidth: 80 }, // Description
      2: { cellWidth: 20, halign: 'center' }, // Quantity
      3: { cellWidth: 30 }, // Category
      4: { cellWidth: 25 } // Sources
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] // Gray-50
    },
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
    didParseCell: function(data) {
      // Style the totals row
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = [243, 244, 246] // Gray-100
        data.cell.styles.fontStyle = 'bold'
      }
    }
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...secondaryColor)
    
    // Company info
    doc.text('Torvan Medical CleanStation Production System', 20, doc.internal.pageSize.height - 15)
    doc.text('ISO 13485:2016 Compliant Manufacturing', 20, doc.internal.pageSize.height - 10)
    
    // Page number
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 40,
      doc.internal.pageSize.height - 10
    )
  }

  return doc
}

/**
 * Downloads the PDF with a properly formatted filename
 */
export async function downloadBOMPDF(
  aggregatedItems: AggregatedBOMItem[],
  orderInfo: OrderInfo,
  filename?: string
) {
  const doc = await generateBOMPDF(aggregatedItems, orderInfo)
  
  const defaultFilename = `order-${orderInfo.poNumber}-bom-flattened.pdf`
  const finalFilename = filename || defaultFilename
  
  doc.save(finalFilename)
}

/**
 * Generates PDF blob for server-side use
 */
export async function generateBOMPDFBlob(
  aggregatedItems: AggregatedBOMItem[],
  orderInfo: OrderInfo
): Promise<Blob> {
  const doc = await generateBOMPDF(aggregatedItems, orderInfo)
  return doc.output('blob')
}

/**
 * Category priority for sorting (most important first)
 */
const CATEGORY_PRIORITY: Record<string, number> = {
  'SINK': 1,
  'BASIN': 2,
  'LEGS': 3,
  'FEET': 4,
  'PEGBOARD': 5,
  'FAUCET': 6,
  'SPRAYER': 7,
  'CONTROL': 8,
  'ACCESSORY': 9,
  'HARDWARE': 10,
  'UNCATEGORIZED': 999
}

/**
 * Enhanced sort function that considers category priority
 */
export function sortBOMItemsByPriority(items: AggregatedBOMItem[]): AggregatedBOMItem[] {
  return items.sort((a, b) => {
    const aPriority = CATEGORY_PRIORITY[a.category] || 999
    const bPriority = CATEGORY_PRIORITY[b.category] || 999
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }
    
    return a.partNumber.localeCompare(b.partNumber)
  })
}