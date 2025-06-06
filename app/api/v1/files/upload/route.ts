/**
 * File Upload API Endpoint
 * Secure file upload with validation and metadata management
 */

import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
  createAPIResponse,
  getRequestId,
  handleAPIError,
  API_ERROR_CODES
} from '@/lib/apiResponse'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

const prisma = new PrismaClient()

// File upload configuration
const UPLOAD_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: {
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    documents: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
    archives: ['application/zip', 'application/x-rar-compressed'],
    cad: ['application/dwg', 'application/dxf', 'application/step', 'application/iges']
  },
  uploadDir: process.env.UPLOADS_DIR || './uploads'
}

const getAllowedMimeTypes = () => {
  return Object.values(UPLOAD_CONFIG.allowedMimeTypes).flat()
}

/**
 * POST /api/v1/files/upload
 * Upload single or multiple files with metadata
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const category = formData.get('category') as string
    const isPublic = formData.get('isPublic') === 'true'
    const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {}

    if (!files || files.length === 0) {
      return createAPIResponse(
        createValidationErrorResponse([{
          field: 'files',
          message: 'No files provided'
        }], requestId),
        400
      )
    }

    // Validate files
    const validationErrors = []
    const allowedMimeTypes = getAllowedMimeTypes()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      if (file.size > UPLOAD_CONFIG.maxFileSize) {
        validationErrors.push({
          field: `files[${i}]`,
          message: `File ${file.name} exceeds maximum size of ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`
        })
      }

      if (!allowedMimeTypes.includes(file.type)) {
        validationErrors.push({
          field: `files[${i}]`,
          message: `File ${file.name} has unsupported type: ${file.type}`
        })
      }
    }

    if (validationErrors.length > 0) {
      return createAPIResponse(
        createValidationErrorResponse(validationErrors, requestId),
        400
      )
    }

    // Ensure upload directory exists
    const uploadDir = path.resolve(UPLOAD_CONFIG.uploadDir)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Create date-based subdirectory
    const today = new Date()
    const dateDir = path.join(uploadDir, today.getFullYear().toString(), (today.getMonth() + 1).toString().padStart(2, '0'))
    if (!existsSync(dateDir)) {
      await mkdir(dateDir, { recursive: true })
    }

    // Process all files
    const uploadedFiles = []
    const errors = []

    for (const file of files) {
      try {
        // Generate unique filename
        const fileExtension = path.extname(file.name)
        const baseFilename = path.basename(file.name, fileExtension)
        const uniqueId = crypto.randomUUID()
        const filename = `${baseFilename}_${uniqueId}${fileExtension}`
        const filePath = path.join(dateDir, filename)
        const relativePath = path.relative(uploadDir, filePath)

        // Write file to disk
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        await writeFile(filePath, buffer)

        // Determine file category
        const fileCategory = category || determineFileCategory(file.type)

        // Create database record
        const fileRecord = await prisma.fileUpload.create({
          data: {
            filename,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            path: relativePath,
            uploadedById: user.id,
            isPublic,
            metadata: {
              ...metadata,
              category: fileCategory,
              uploadedAt: new Date().toISOString(),
              uploadedBy: user.fullName,
              checksum: generateChecksum(buffer)
            }
          }
        })

        uploadedFiles.push({
          id: fileRecord.id,
          filename: fileRecord.filename,
          originalName: fileRecord.originalName,
          mimeType: fileRecord.mimeType,
          size: fileRecord.size,
          category: fileCategory,
          uploadedAt: fileRecord.createdAt,
          downloadUrl: `/api/v1/files/${fileRecord.id}/download`,
          thumbnailUrl: isImageFile(file.type) ? `/api/v1/files/${fileRecord.id}/thumbnail` : null
        })

      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error)
        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'FILE_UPLOAD',
        entityType: 'FileUpload',
        entityId: uploadedFiles.map(f => f.id).join(','),
        newValues: {
          uploadedFiles: uploadedFiles.length,
          totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
          category
        }
      }
    })

    return createAPIResponse(
      createSuccessResponse({
        uploadedFiles,
        successCount: uploadedFiles.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0)
      }, undefined, requestId),
      201
    )

  } catch (error) {
    console.error('Error uploading files:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

/**
 * GET /api/v1/files/upload/config
 * Get upload configuration and limits
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  
  try {
    const user = await getAuthUser()
    if (!user) {
      return createAPIResponse(
        createUnauthorizedResponse('Authentication required', requestId),
        401
      )
    }

    return createAPIResponse(
      createSuccessResponse({
        maxFileSize: UPLOAD_CONFIG.maxFileSize,
        maxFileSizeMB: UPLOAD_CONFIG.maxFileSize / 1024 / 1024,
        allowedMimeTypes: UPLOAD_CONFIG.allowedMimeTypes,
        allowedExtensions: generateAllowedExtensions(),
        categories: getFileCategories(),
        limits: {
          maxFiles: 10, // Per upload request
          totalDailyLimit: 500 * 1024 * 1024, // 500MB per day per user
          allowedFormats: Object.keys(UPLOAD_CONFIG.allowedMimeTypes)
        }
      }, undefined, requestId)
    )

  } catch (error) {
    console.error('Error getting upload config:', error)
    return createAPIResponse(
      handleAPIError(error, requestId),
      500
    )
  }
}

// Helper functions

function determineFileCategory(mimeType: string): string {
  for (const [category, types] of Object.entries(UPLOAD_CONFIG.allowedMimeTypes)) {
    if (types.includes(mimeType)) {
      return category
    }
  }
  return 'other'
}

function isImageFile(mimeType: string): boolean {
  return UPLOAD_CONFIG.allowedMimeTypes.images.includes(mimeType)
}

function generateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function generateAllowedExtensions(): Record<string, string[]> {
  const extensionMap: Record<string, string[]> = {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    documents: ['.pdf', '.txt', '.doc', '.docx'],
    spreadsheets: ['.xls', '.xlsx', '.csv'],
    archives: ['.zip', '.rar'],
    cad: ['.dwg', '.dxf', '.step', '.iges']
  }
  return extensionMap
}

function getFileCategories(): Array<{ id: string; name: string; description: string }> {
  return [
    { id: 'qc-photos', name: 'QC Photos', description: 'Quality control inspection photos' },
    { id: 'work-instructions', name: 'Work Instructions', description: 'Assembly and process documentation' },
    { id: 'technical-drawings', name: 'Technical Drawings', description: 'CAD files and technical specifications' },
    { id: 'order-documents', name: 'Order Documents', description: 'Order-related documentation and files' },
    { id: 'service-documents', name: 'Service Documents', description: 'Service department files and manuals' },
    { id: 'general', name: 'General', description: 'General purpose file uploads' }
  ]
}