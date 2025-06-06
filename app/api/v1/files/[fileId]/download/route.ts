/**
 * File Download API Endpoint
 * Secure file download with access control and audit logging
 */

import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import {
  createErrorResponse,
  createNotFoundResponse,
  createUnauthorizedResponse,
  createAPIResponse,
  getRequestId,
  handleAPIError,
  API_ERROR_CODES
} from '@/lib/apiResponse'
import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

const UPLOAD_DIR = process.env.UPLOADS_DIR || './uploads'

/**
 * GET /api/v1/files/[fileId]/download
 * Download a file with access control
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    const { fileId } = params

    // Get file record from database
    const fileRecord = await prisma.fileUpload.findUnique({
      where: { id: fileId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    })

    if (!fileRecord) {
      return createAPIResponse(
        createNotFoundResponse('File', fileId, requestId),
        404
      )
    }

    // Access control check
    const hasAccess = checkFileAccess(fileRecord, user)
    if (!hasAccess) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'You do not have permission to access this file'
        }, requestId),
        403
      )
    }

    // Check if file exists on disk
    const fullFilePath = path.resolve(UPLOAD_DIR, fileRecord.path)
    if (!existsSync(fullFilePath)) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'File not found on disk'
        }, requestId),
        404
      )
    }

    // Get file stats
    const fileStat = await stat(fullFilePath)
    
    // Verify file integrity
    if (fileStat.size !== fileRecord.size) {
      return createAPIResponse(
        createErrorResponse({
          code: API_ERROR_CODES.INTERNAL_ERROR,
          message: 'File integrity check failed'
        }, requestId),
        500
      )
    }

    // Check for range request (partial content)
    const rangeHeader = request.headers.get('range')
    let start = 0
    let end = fileStat.size - 1
    let status = 200

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-')
      start = parseInt(parts[0], 10)
      end = parts[1] ? parseInt(parts[1], 10) : fileStat.size - 1
      status = 206
    }

    // Read file (or file chunk for range requests)
    const buffer = await readFile(fullFilePath)
    const chunk = status === 206 ? buffer.slice(start, end + 1) : buffer

    // Determine content disposition
    const url = new URL(request.url)
    const inline = url.searchParams.get('inline') === 'true'
    const disposition = inline ? 'inline' : 'attachment'

    // Log file access
    await logFileAccess(fileRecord.id, user.id, request.headers.get('user-agent') || 'Unknown')

    // Prepare response headers
    const headers: Record<string, string> = {
      'Content-Type': fileRecord.mimeType,
      'Content-Length': chunk.length.toString(),
      'Content-Disposition': `${disposition}; filename="${fileRecord.originalName}"`,
      'Cache-Control': 'private, max-age=3600',
      'X-File-ID': fileRecord.id,
      'X-Upload-Date': fileRecord.createdAt.toISOString()
    }

    if (status === 206) {
      headers['Content-Range'] = `bytes ${start}-${end}/${fileStat.size}`
      headers['Accept-Ranges'] = 'bytes'
    }

    // Add security headers for sensitive files
    if (!fileRecord.isPublic) {
      headers['X-Robots-Tag'] = 'noindex, nofollow'
    }

    return new Response(chunk, {
      status,
      headers
    })

  } catch (error) {
    console.error('Error downloading file:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

/**
 * HEAD /api/v1/files/[fileId]/download
 * Get file metadata without downloading
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return new Response(null, { status: 401 })
    }

    const { fileId } = params

    const fileRecord = await prisma.fileUpload.findUnique({
      where: { id: fileId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    })

    if (!fileRecord) {
      return new Response(null, { status: 404 })
    }

    const hasAccess = checkFileAccess(fileRecord, user)
    if (!hasAccess) {
      return new Response(null, { status: 403 })
    }

    // Check if file exists on disk
    const fullFilePath = path.resolve(UPLOAD_DIR, fileRecord.path)
    if (!existsSync(fullFilePath)) {
      return new Response(null, { status: 404 })
    }

    const headers: Record<string, string> = {
      'Content-Type': fileRecord.mimeType,
      'Content-Length': fileRecord.size.toString(),
      'Last-Modified': fileRecord.updatedAt.toUTCString(),
      'X-File-ID': fileRecord.id,
      'X-Upload-Date': fileRecord.createdAt.toISOString(),
      'Accept-Ranges': 'bytes'
    }

    return new Response(null, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Error getting file metadata:', error)
    return new Response(null, { status: 500 })
  }
}

// Helper functions

function checkFileAccess(fileRecord: any, user: any): boolean {
  // Public files are accessible to all authenticated users
  if (fileRecord.isPublic) {
    return true
  }

  // File owners can always access their files
  if (fileRecord.uploadedById === user.id) {
    return true
  }

  // Admins can access all files
  if (user.role === 'ADMIN') {
    return true
  }

  // Role-based access based on file category
  const category = fileRecord.metadata?.category

  switch (category) {
    case 'qc-photos':
      return ['PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(user.role)
    
    case 'work-instructions':
      return ['PRODUCTION_COORDINATOR', 'ASSEMBLER', 'QC_PERSON'].includes(user.role)
    
    case 'technical-drawings':
      return ['PRODUCTION_COORDINATOR', 'ASSEMBLER', 'PROCUREMENT_SPECIALIST'].includes(user.role)
    
    case 'order-documents':
      return ['PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST'].includes(user.role)
    
    case 'service-documents':
      return ['SERVICE_DEPARTMENT', 'PRODUCTION_COORDINATOR'].includes(user.role)
    
    default:
      // For uncategorized files, allow access to coordinator roles
      return ['PRODUCTION_COORDINATOR'].includes(user.role)
  }
}

async function logFileAccess(fileId: string, userId: string, userAgent: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'FILE_ACCESS',
        entityType: 'FileUpload',
        entityId: fileId,
        newValues: {
          accessedAt: new Date().toISOString(),
          userAgent
        }
      }
    })
  } catch (error) {
    console.error('Error logging file access:', error)
    // Don't fail the download if logging fails
  }
}