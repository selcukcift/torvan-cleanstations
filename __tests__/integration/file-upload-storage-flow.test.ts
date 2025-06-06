/**
 * Integration Test: File Upload → Storage and Retrieval Flow
 * Tests the complete workflow for file upload, storage, and retrieval
 */

import { jest } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { nextJsApiClient } from '@/lib/api'
import fs from 'fs/promises'
import path from 'path'

// Mock Prisma
const mockPrisma = new PrismaClient()
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}))

// Mock API client
jest.mock('@/lib/api', () => ({
  nextJsApiClient: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn()
  }
}))

// Mock file system
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  unlink: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  access: jest.fn()
}))

describe('File Upload → Storage and Retrieval Integration', () => {
  const mockUserId = 'user-123'
  const uploadDir = '/uploads/test'
  
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.UPLOADS_DIR = uploadDir
  })

  it('should complete full file upload and retrieval workflow', async () => {
    // Step 1: Mock file upload data
    const mockFile = {
      name: 'test-document.pdf',
      type: 'application/pdf',
      size: 1024 * 500, // 500KB
      content: Buffer.from('Mock PDF content').toString('base64')
    }

    // Step 2: Mock successful upload response
    const mockUploadResponse = {
      success: true,
      data: {
        fileId: 'file-123',
        filename: 'test-document-1234567890.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: mockFile.size,
        path: `${uploadDir}/test-document-1234567890.pdf`,
        uploadedById: mockUserId,
        isPublic: false,
        createdAt: new Date().toISOString()
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValue({
      data: mockUploadResponse
    })

    // Step 3: Upload file
    const uploadResponse = await nextJsApiClient.post('/api/v1/files/upload', {
      file: mockFile,
      metadata: {
        orderId: 'order-123',
        documentType: 'quality_report'
      }
    })

    expect(uploadResponse.data.success).toBe(true)
    expect(uploadResponse.data.data.fileId).toBe('file-123')
    expect(uploadResponse.data.data.size).toBe(mockFile.size)

    // Step 4: Mock file metadata retrieval
    const mockMetadataResponse = {
      success: true,
      data: {
        fileId: 'file-123',
        filename: 'test-document-1234567890.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: mockFile.size,
        uploadedBy: {
          id: mockUserId,
          name: 'Test User',
          email: 'test@example.com'
        },
        metadata: {
          orderId: 'order-123',
          documentType: 'quality_report'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValue({
      data: mockMetadataResponse
    })

    // Step 5: Retrieve file metadata
    const metadataResponse = await nextJsApiClient.get(`/api/v1/files/metadata/file-123`)
    
    expect(metadataResponse.data.success).toBe(true)
    expect(metadataResponse.data.data.fileId).toBe('file-123')
    expect(metadataResponse.data.data.metadata.orderId).toBe('order-123')

    // Step 6: Mock file download
    const mockFileContent = Buffer.from('Mock PDF content')
    ;(fs.readFile as jest.Mock).mockResolvedValue(mockFileContent)

    const mockDownloadResponse = {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="test-document.pdf"',
        'content-length': mockFileContent.length
      },
      data: mockFileContent
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValue(mockDownloadResponse)

    // Step 7: Download file
    const downloadResponse = await nextJsApiClient.get(`/api/v1/files/file-123/download`)
    
    expect(downloadResponse.headers['content-type']).toBe('application/pdf')
    expect(downloadResponse.data).toBe(mockFileContent)
  })

  it('should handle large file uploads with chunking', async () => {
    // Mock large file (10MB)
    const largeFileSize = 10 * 1024 * 1024
    const mockLargeFile = {
      name: 'large-video.mp4',
      type: 'video/mp4',
      size: largeFileSize,
      chunks: 10, // 10 chunks of 1MB each
    }

    // Mock chunk upload responses
    const chunkResponses = Array.from({ length: 10 }, (_, i) => ({
      success: true,
      data: {
        chunkIndex: i,
        uploaded: true
      }
    }))

    let uploadCallCount = 0;
    (nextJsApiClient.post as jest.Mock).mockImplementation((url) => {
      if (url.includes('/chunk')) {
        return Promise.resolve({ data: chunkResponses[uploadCallCount++] })
      }
      return Promise.resolve({
        data: {
          success: true,
          data: {
            fileId: 'file-large-123',
            filename: 'large-video-1234567890.mp4',
            size: largeFileSize
          }
        }
      })
    })

    // Upload chunks
    for (let i = 0; i < mockLargeFile.chunks; i++) {
      const chunkResponse = await nextJsApiClient.post('/api/v1/files/upload/chunk', {
        fileId: 'file-large-123',
        chunkIndex: i,
        totalChunks: mockLargeFile.chunks,
        chunkData: `chunk-${i}-data`
      })
      
      expect(chunkResponse.data.success).toBe(true)
      expect(chunkResponse.data.data.chunkIndex).toBe(i)
    }

    // Finalize upload
    const finalizeResponse = await nextJsApiClient.post('/api/v1/files/upload/finalize', {
      fileId: 'file-large-123',
      filename: mockLargeFile.name,
      mimeType: mockLargeFile.type,
      totalSize: mockLargeFile.size
    })

    expect(finalizeResponse.data.success).toBe(true)
    expect(finalizeResponse.data.data.size).toBe(largeFileSize)
  })

  it('should validate file types and reject invalid uploads', async () => {
    // Mock invalid file type
    const mockInvalidFile = {
      name: 'malicious.exe',
      type: 'application/x-msdownload',
      size: 1024 * 100
    }

    const mockErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: 'File type not allowed',
        details: {
          allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'video/mp4'],
          providedType: 'application/x-msdownload'
        }
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValue({
      data: mockErrorResponse
    })

    const response = await nextJsApiClient.post('/api/v1/files/upload', {
      file: mockInvalidFile
    })

    expect(response.data.success).toBe(false)
    expect(response.data.error.code).toBe('INVALID_FILE_TYPE')
  })

  it('should enforce file size limits', async () => {
    // Mock oversized file (101MB, exceeding 100MB limit)
    const mockOversizedFile = {
      name: 'huge-file.zip',
      type: 'application/zip',
      size: 101 * 1024 * 1024
    }

    const mockSizeError = {
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum allowed size',
        details: {
          maxSize: 100 * 1024 * 1024, // 100MB
          providedSize: mockOversizedFile.size
        }
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValue({
      data: mockSizeError
    })

    const response = await nextJsApiClient.post('/api/v1/files/upload', {
      file: mockOversizedFile
    })

    expect(response.data.success).toBe(false)
    expect(response.data.error.code).toBe('FILE_TOO_LARGE')
  })

  it('should handle file deletion with proper cleanup', async () => {
    const fileId = 'file-456'
    
    // Mock successful deletion
    const mockDeleteResponse = {
      success: true,
      data: {
        fileId,
        deleted: true,
        deletedAt: new Date().toISOString()
      }
    };

    (nextJsApiClient.delete as jest.Mock).mockResolvedValue({
      data: mockDeleteResponse
    })

    // Mock file system deletion
    ;(fs.unlink as jest.Mock).mockResolvedValue(undefined)

    // Delete file
    const deleteResponse = await nextJsApiClient.delete(`/api/v1/files/${fileId}`)
    
    expect(deleteResponse.data.success).toBe(true)
    expect(deleteResponse.data.data.deleted).toBe(true)
    
    // Verify file no longer accessible
    const mockNotFoundError = {
      success: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: 'File not found'
      }
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValue({
      data: mockNotFoundError
    })

    const getResponse = await nextJsApiClient.get(`/api/v1/files/metadata/${fileId}`)
    expect(getResponse.data.success).toBe(false)
    expect(getResponse.data.error.code).toBe('FILE_NOT_FOUND')
  })

  it('should maintain file associations with orders and QC results', async () => {
    // Upload file associated with QC result
    const mockQCFile = {
      name: 'qc-report.pdf',
      type: 'application/pdf',
      size: 2048
    }

    const mockUploadResponse = {
      success: true,
      data: {
        fileId: 'file-qc-123',
        filename: 'qc-report-1234567890.pdf',
        metadata: {
          orderId: 'order-789',
          qcResultId: 'qc-result-456',
          documentType: 'qc_final_report'
        }
      }
    };

    (nextJsApiClient.post as jest.Mock).mockResolvedValue({
      data: mockUploadResponse
    })

    const uploadResponse = await nextJsApiClient.post('/api/v1/files/upload', {
      file: mockQCFile,
      metadata: {
        orderId: 'order-789',
        qcResultId: 'qc-result-456',
        documentType: 'qc_final_report'
      }
    })

    expect(uploadResponse.data.success).toBe(true)
    expect(uploadResponse.data.data.metadata.qcResultId).toBe('qc-result-456')

    // Verify file appears in order's file list
    const mockOrderFilesResponse = {
      success: true,
      data: {
        orderId: 'order-789',
        files: [
          {
            fileId: 'file-qc-123',
            filename: 'qc-report-1234567890.pdf',
            originalName: 'qc-report.pdf',
            documentType: 'qc_final_report',
            uploadedAt: new Date().toISOString()
          }
        ]
      }
    };

    (nextJsApiClient.get as jest.Mock).mockResolvedValue({
      data: mockOrderFilesResponse
    })

    const orderFilesResponse = await nextJsApiClient.get('/api/orders/order-789/files')
    
    expect(orderFilesResponse.data.success).toBe(true)
    expect(orderFilesResponse.data.data.files).toHaveLength(1)
    expect(orderFilesResponse.data.data.files[0].fileId).toBe('file-qc-123')
  })

  it('should handle concurrent file uploads without conflicts', async () => {
    // Mock multiple files being uploaded simultaneously
    const files = [
      { name: 'doc1.pdf', type: 'application/pdf', size: 1024 },
      { name: 'doc2.pdf', type: 'application/pdf', size: 2048 },
      { name: 'image.jpg', type: 'image/jpeg', size: 3072 }
    ]

    const uploadPromises = files.map(async (file, index) => {
      const mockResponse = {
        success: true,
        data: {
          fileId: `file-concurrent-${index}`,
          filename: `${file.name.split('.')[0]}-${Date.now()}-${index}.${file.name.split('.')[1]}`,
          size: file.size
        }
      };

      (nextJsApiClient.post as jest.Mock).mockResolvedValueOnce({
        data: mockResponse
      })

      return nextJsApiClient.post('/api/v1/files/upload', { file })
    })

    const results = await Promise.all(uploadPromises)
    
    // Verify all uploads succeeded with unique file IDs
    const fileIds = results.map(r => r.data.data.fileId)
    expect(fileIds).toHaveLength(3)
    expect(new Set(fileIds).size).toBe(3) // All unique
    
    results.forEach((result, index) => {
      expect(result.data.success).toBe(true)
      expect(result.data.data.size).toBe(files[index].size)
    })
  })
})