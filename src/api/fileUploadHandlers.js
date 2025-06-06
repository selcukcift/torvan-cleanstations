// DEPRECATED (2025-06-01): This handler is now replaced by Next.js API Routes in app/api/upload/*.ts as per 'Coding Prompt Chains for Torvan Medical Workflow App Expansion (v5 - Hybrid Backend)'.
// This file will be removed in a future version. Do not add new logic here.
// See: resources/Coding Prompt Chains for Torvan Medical Workflow App Expansion (v4 - Next.js, Node.js, Prisma, PostgreSQL).md
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { sendJSONResponse } = require('../lib/requestUtils');

const prisma = new PrismaClient();

// Directory for storing uploaded files
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'po_documents');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Upload PO document for an order
 * POST /api/orders/:orderId/upload-document
 * Protected: PRODUCTION_COORDINATOR, ADMIN
 */
async function uploadPODocument(req, res, orderId) {
  try {
    // Check if order exists and user has access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        createdBy: {
          select: { id: true, role: true }
        }
      }
    });

    if (!order) {
      return sendJSONResponse(res, 404, { 
        error: 'Order not found' 
      });
    }

    // Check permissions - only creator or admin can upload documents
    if (req.user.role !== 'ADMIN' && order.createdBy.id !== req.user.userId) {
      return sendJSONResponse(res, 403, { 
        error: 'You can only upload documents to orders you created' 
      });
    }

    // Parse multipart form data
    const formData = await parseMultipartForm(req);
    
    if (!formData.file) {
      return sendJSONResponse(res, 400, { 
        error: 'No file provided' 
      });
    }

    const { file, docType = 'PO_DOCUMENT' } = formData;

    // Validate file type (allow common document formats)
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(file.originalName).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return sendJSONResponse(res, 400, { 
        error: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` 
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${orderId}_${timestamp}_${sanitizedOriginalName}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Create document record in database
    const document = await prisma.associatedDocument.create({
      data: {
        orderId,
        docName: file.originalName,
        docURL: `/uploads/po_documents/${filename}`,
        uploadedBy: req.user.userId,
        docType
      }
    });

    // Create history log
    await prisma.orderHistoryLog.create({
      data: {
        orderId,
        userId: req.user.userId,
        action: 'DOCUMENT_UPLOADED',
        notes: `Uploaded document: ${file.originalName}`
      }
    });

    sendJSONResponse(res, 201, {
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        docName: document.docName,
        docType: document.docType,
        timestamp: document.timestamp
      }
    });

  } catch (error) {
    console.error('Upload document error:', error);
    sendJSONResponse(res, 500, { 
      error: 'Internal server error while uploading document'
    });
  }
}

/**
 * Get documents for an order
 * GET /api/orders/:orderId/documents
 * Protected: All authenticated users (with role-based access)
 */
async function getOrderDocuments(req, res, orderId) {
  try {
    // Check if order exists and user has access
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return sendJSONResponse(res, 404, { 
        error: 'Order not found' 
      });
    }

    // Role-based access control (reuse from orders handler)
    const hasAccess = checkOrderAccess(order, req.user);
    if (!hasAccess) {
      return sendJSONResponse(res, 403, { 
        error: 'Access denied to this order' 
      });
    }

    // Fetch documents
    const documents = await prisma.associatedDocument.findMany({
      where: { orderId },
      orderBy: { timestamp: 'desc' }
    });

    sendJSONResponse(res, 200, { documents });

  } catch (error) {
    console.error('Get documents error:', error);
    sendJSONResponse(res, 500, { 
      error: 'Internal server error while fetching documents'
    });
  }
}

/**
 * Download a document
 * GET /api/documents/:documentId/download
 * Protected: All authenticated users (with role-based access)
 */
async function downloadDocument(req, res, documentId) {
  try {
    // Fetch document with order info
    const document = await prisma.associatedDocument.findUnique({
      where: { id: documentId },
      include: {
        order: true
      }
    });

    if (!document) {
      return sendJSONResponse(res, 404, { 
        error: 'Document not found' 
      });
    }

    // Check access to the order
    const hasAccess = checkOrderAccess(document.order, req.user);
    if (!hasAccess) {
      return sendJSONResponse(res, 403, { 
        error: 'Access denied to this document' 
      });
    }

    // Construct file path
    const filePath = path.join(process.cwd(), document.docURL);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return sendJSONResponse(res, 404, { 
        error: 'File not found on server' 
      });
    }

    // Set headers for file download
    const fileExtension = path.extname(document.docName);
    const contentType = getContentType(fileExtension);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.docName}"`);

    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download document error:', error);
    sendJSONResponse(res, 500, { 
      error: 'Internal server error while downloading document'
    });
  }
}

/**
 * Simple multipart form parser for file uploads
 * This is a basic implementation - in production, consider using a library like 'formidable'
 */
async function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    let body = Buffer.alloc(0);
    
    req.on('data', chunk => {
      body = Buffer.concat([body, chunk]);
    });
    
    req.on('end', () => {
      try {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('multipart/form-data')) {
          return reject(new Error('Invalid content type'));
        }

        // Extract boundary
        const boundary = contentType.split('boundary=')[1];
        if (!boundary) {
          return reject(new Error('No boundary found'));
        }

        // Split by boundary
        const parts = body.toString('binary').split(`--${boundary}`);
        const formData = {};

        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            const lines = part.split('\r\n');
            const contentDisposition = lines.find(line => line.includes('Content-Disposition'));
            
            if (contentDisposition && contentDisposition.includes('filename=')) {
              // File field
              const nameMatch = contentDisposition.match(/name="([^"]+)"/);
              const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
              
              if (nameMatch && filenameMatch) {
                const fieldName = nameMatch[1];
                const filename = filenameMatch[1];
                
                // Find content start (after double CRLF)
                const contentStart = part.indexOf('\r\n\r\n') + 4;
                const contentEnd = part.lastIndexOf('\r\n');
                
                if (contentStart < contentEnd) {
                  const fileContent = part.slice(contentStart, contentEnd);
                  const buffer = Buffer.from(fileContent, 'binary');
                  
                  formData[fieldName] = {
                    originalName: filename,
                    buffer: buffer,
                    size: buffer.length
                  };
                }
              }
            } else if (contentDisposition) {
              // Text field
              const nameMatch = contentDisposition.match(/name="([^"]+)"/);
              if (nameMatch) {
                const fieldName = nameMatch[1];
                const contentStart = part.indexOf('\r\n\r\n') + 4;
                const contentEnd = part.lastIndexOf('\r\n');
                
                if (contentStart < contentEnd) {
                  formData[fieldName] = part.slice(contentStart, contentEnd);
                }
              }
            }
          }
        }

        resolve(formData);
      } catch (error) {
        reject(error);
      }
    });
    
    req.on('error', reject);
  });
}

/**
 * Get content type based on file extension
 */
function getContentType(extension) {
  const types = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
  };
  
  return types[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Helper function to check order access (imported from ordersHandlers)
 */
function checkOrderAccess(order, user) {
  switch (user.role) {
    case 'ADMIN':
    case 'PRODUCTION_COORDINATOR':
      return true;
    case 'PROCUREMENT_SPECIALIST':
      return ['ORDER_CREATED', 'PARTS_SENT_WAITING_ARRIVAL'].includes(order.orderStatus);
    case 'QC_PERSON':
      return ['READY_FOR_PRE_QC', 'READY_FOR_FINAL_QC'].includes(order.orderStatus);
    case 'ASSEMBLER':
      return ['READY_FOR_PRODUCTION', 'TESTING_COMPLETE', 'PACKAGING_COMPLETE'].includes(order.orderStatus);
    default:
      return order.createdById === user.userId;
  }
}

module.exports = {
  uploadPODocument,
  getOrderDocuments,
  downloadDocument
};
