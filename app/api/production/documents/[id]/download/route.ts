import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const document = await prisma.productionDocument.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            poNumber: true,
            customerName: true,
            orderStatus: true
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Production document not found' },
        { status: 404 }
      )
    }

    // For now, return the HTML content as a downloadable file
    // In a production environment, you might want to convert HTML to PDF using libraries like puppeteer
    const filename = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${document.version}.html`
    
    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'text/html')
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    headers.set('Cache-Control', 'no-cache')

    return new NextResponse(document.content, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Error downloading production document:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Alternative PDF generation endpoint (commented out for now)
/*
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const document = await prisma.productionDocument.findUnique({
      where: { id: params.id }
    })

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Production document not found' },
        { status: 404 }
      )
    }

    // Generate PDF using puppeteer (requires puppeteer installation)
    const puppeteer = require('puppeteer')
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    
    await page.setContent(document.content, { waitUntil: 'networkidle0' })
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      }
    })
    
    await browser.close()

    const filename = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${document.version}.pdf`
    
    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)

    return new NextResponse(pdf, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
*/