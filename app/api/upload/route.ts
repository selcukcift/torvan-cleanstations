import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🔍 Upload route - User:', user)
    console.log('🔍 Upload route - User ID:', user.id)

    const formData = await request.formData()
    const file = formData.get('file') as File
    const orderId = formData.get('orderId') as string
    const docType = formData.get('docType') as string || 'PO_DOCUMENT'

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // CAD file types for sink drawings
      'application/octet-stream', // DWG and DXF files often come as this
      'application/acad',
      'application/x-acad',
      'application/autocad_dwg',
      'application/dwg',
      'application/dxf',
      'image/vnd.dwg',
      'image/vnd.dxf'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'File type not allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size too large (max 10MB)' },
        { status: 400 }
      )
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', 'documents')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch {
      // Directory might already exist, which is fine
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    const filePath = join(uploadDir, fileName)

    // Save file
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Ensure user ID exists
    if (!user.id) {
      console.error('❌ Upload route - User ID is missing!')
      return NextResponse.json(
        { success: false, message: 'User ID not found in session' },
        { status: 400 }
      )
    }

    // Store file information in database
    console.log('📝 Creating document record with:', {
      docName: file.name,
      docURL: `/uploads/documents/${fileName}`,
      uploadedBy: user.id,
      docType: docType,
      orderId: orderId
    })

    const document = await prisma.associatedDocument.create({
      data: {
        docName: file.name,
        docURL: `/uploads/documents/${fileName}`,
        uploadedBy: String(user.id), // Ensure it's a string
        docType: docType,
        orderId: orderId // orderId is required
      }
    })

    return NextResponse.json({
      success: true,
      documentId: document.id,
      fileName: file.name,
      fileUrl: document.docURL,
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser()
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: 'Document ID required' },
        { status: 400 }
      )
    }

    // Find the document
    const document = await prisma.associatedDocument.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to delete (must be uploader or admin)
    if (document.uploadedBy !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Permission denied' },
        { status: 403 }
      )
    }

    // Delete file from filesystem
    try {
      const { promises: fs } = await import('fs')
      const filePath = join(process.cwd(), 'uploads', 'documents', document.docURL.split('/').pop()!)
      await fs.unlink(filePath)
    } catch (error) {
      console.warn('Could not delete file from filesystem:', error)
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await prisma.associatedDocument.delete({
      where: { id: documentId }
    })

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting document:', error)
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}