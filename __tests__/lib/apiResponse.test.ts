/**
 * API Response Utilities Unit Tests
 * Tests the standardized API response format implementation
 */

import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createInternalErrorResponse,
  createBusinessRuleViolationResponse,
  createAPIResponse,
  handleAPIError,
  getRequestId,
  isSuccessResponse,
  isErrorResponse,
  getHTTPStatusForError,
  API_ERROR_CODES,
  HTTP_STATUS_CODES
} from '@/lib/apiResponse'
import { jest } from '@jest/globals'

describe('API Response Utilities', () => {
  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Mock Response constructor for Node environment
    global.Response = jest.fn().mockImplementation((body, init) => ({
      status: init?.status || 200,
      headers: {
        get: jest.fn().mockImplementation((name) => init?.headers?.[name] || null),
        ...init?.headers
      },
      body
    })) as any
    
    // Mock crypto for tests
    global.crypto = {
      randomUUID: jest.fn().mockReturnValue('test-uuid-123')
    } as any
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })
  describe('createSuccessResponse', () => {
    it('should create a success response with data', () => {
      const data = { id: '1', name: 'Test Item' }
      const response = createSuccessResponse(data)

      expect(response.success).toBe(true)
      expect(response.data).toEqual(data)
      expect(response.error).toBeNull()
      expect(response.metadata.timestamp).toBeDefined()
      expect(response.metadata.version).toBe('v1')
    })

    it('should include pagination when provided', () => {
      const data = [{ id: '1' }, { id: '2' }]
      const pagination = { page: 1, limit: 10, total: 25 }
      const response = createSuccessResponse(data, pagination)

      expect(response.metadata.pagination).toBeDefined()
      expect(response.metadata.pagination?.page).toBe(1)
      expect(response.metadata.pagination?.totalPages).toBe(3)
      expect(response.metadata.pagination?.hasNext).toBe(true)
      expect(response.metadata.pagination?.hasPrevious).toBe(false)
    })

    it('should include request ID when provided', () => {
      const requestId = 'req-123'
      const response = createSuccessResponse({}, undefined, requestId)

      expect(response.metadata.requestId).toBe(requestId)
    })
  })

  describe('createErrorResponse', () => {
    it('should create an error response', () => {
      const error = {
        code: 'TEST_ERROR',
        message: 'Test error message'
      }
      const response = createErrorResponse(error)

      expect(response.success).toBe(false)
      expect(response.data).toBeNull()
      expect(response.error).toEqual(error)
      expect(response.metadata.timestamp).toBeDefined()
      expect(response.metadata.version).toBe('v1')
    })

    it('should include request ID when provided', () => {
      const error = { code: 'TEST', message: 'Test' }
      const requestId = 'req-456'
      const response = createErrorResponse(error, requestId)

      expect(response.metadata.requestId).toBe(requestId)
    })
  })

  describe('createValidationErrorResponse', () => {
    it('should create a validation error response', () => {
      const validationErrors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'age', message: 'Age must be a positive number' }
      ]
      const response = createValidationErrorResponse(validationErrors)

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(API_ERROR_CODES.VALIDATION_ERROR)
      expect(response.error?.message).toBe('Validation failed')
      expect(response.error?.details.fields).toEqual(validationErrors)
    })
  })

  describe('createNotFoundResponse', () => {
    it('should create a not found response', () => {
      const response = createNotFoundResponse('User', 'user-123')

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(API_ERROR_CODES.NOT_FOUND)
      expect(response.error?.message).toBe('User not found (user-123)')
      expect(response.error?.details.resource).toBe('User')
      expect(response.error?.details.identifier).toBe('user-123')
    })

    it('should create a not found response without identifier', () => {
      const response = createNotFoundResponse('Order')

      expect(response.error?.message).toBe('Order not found')
      expect(response.error?.details.identifier).toBeUndefined()
    })
  })

  describe('createUnauthorizedResponse', () => {
    it('should create an unauthorized response with default message', () => {
      const response = createUnauthorizedResponse()

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(API_ERROR_CODES.UNAUTHORIZED)
      expect(response.error?.message).toBe('Authentication required')
    })

    it('should create an unauthorized response with custom message', () => {
      const customMessage = 'Token expired'
      const response = createUnauthorizedResponse(customMessage)

      expect(response.error?.message).toBe(customMessage)
    })
  })

  describe('createForbiddenResponse', () => {
    it('should create a forbidden response', () => {
      const response = createForbiddenResponse()

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(API_ERROR_CODES.FORBIDDEN)
      expect(response.error?.message).toBe('Insufficient permissions')
    })
  })

  describe('createInternalErrorResponse', () => {
    it('should create an internal error response', () => {
      const response = createInternalErrorResponse()

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(API_ERROR_CODES.INTERNAL_ERROR)
      expect(response.error?.message).toBe('Internal server error')
    })

    it('should include error details when provided', () => {
      const details = { stack: 'Error stack trace' }
      const response = createInternalErrorResponse('Custom error', details)

      expect(response.error?.message).toBe('Custom error')
      expect(response.error?.details).toEqual(details)
    })
  })

  describe('createBusinessRuleViolationResponse', () => {
    it('should create a business rule violation response', () => {
      const rule = 'INVENTORY_INSUFFICIENT'
      const message = 'Not enough items in inventory'
      const response = createBusinessRuleViolationResponse(rule, message)

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(API_ERROR_CODES.BUSINESS_RULE_VIOLATION)
      expect(response.error?.message).toBe(message)
      expect(response.error?.details.rule).toBe(rule)
    })
  })

  describe('createAPIResponse', () => {
    it('should create a Next.js Response with correct headers', () => {
      const standardResponse = createSuccessResponse({ test: 'data' })
      const response = createAPIResponse(standardResponse, 200)

      expect(response).toBeDefined()
      expect(response.status).toBe(200)
    })

    it('should include additional headers when provided', () => {
      const standardResponse = createSuccessResponse({ test: 'data' })
      const additionalHeaders = { 'X-Custom-Header': 'custom-value' }
      const response = createAPIResponse(standardResponse, 200, additionalHeaders)

      expect(response.headers.get('X-Custom-Header')).toBe('custom-value')
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('X-API-Version')).toBe('v1')
    })
  })

  describe('handleAPIError', () => {
    it('should handle standard Error objects', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const error = new Error('Test error message')
      const response = handleAPIError(error)

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe(API_ERROR_CODES.INTERNAL_ERROR)
      expect(response.error?.message).toBe('Test error message')
      
      process.env.NODE_ENV = originalEnv
    })

    it('should handle validation errors', () => {
      const error = new Error('Validation failed')
      error.name = 'ValidationError'
      const response = handleAPIError(error)

      expect(response.error?.code).toBe(API_ERROR_CODES.VALIDATION_ERROR)
    })

    it('should handle unauthorized errors', () => {
      const error = new Error('UNAUTHORIZED: Token missing')
      const response = handleAPIError(error)

      expect(response.error?.code).toBe(API_ERROR_CODES.UNAUTHORIZED)
    })

    it('should handle forbidden errors', () => {
      const error = new Error('FORBIDDEN: Insufficient permissions')
      const response = handleAPIError(error)

      expect(response.error?.code).toBe(API_ERROR_CODES.FORBIDDEN)
    })

    it('should handle not found errors', () => {
      const error = new Error('NOT_FOUND: Resource does not exist')
      const response = handleAPIError(error)

      expect(response.error?.code).toBe(API_ERROR_CODES.NOT_FOUND)
    })

    it('should handle unknown errors', () => {
      const response = handleAPIError('Unknown error')

      expect(response.error?.code).toBe(API_ERROR_CODES.INTERNAL_ERROR)
      expect(response.error?.message).toBe('Unknown error occurred')
    })

    it('should include error details in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('Development error')
      error.stack = 'Error stack trace'
      const response = handleAPIError(error)

      expect(response.error?.message).toBe('Development error')
      expect(response.error?.details).toBe('Error stack trace')

      process.env.NODE_ENV = originalEnv
    })

    it('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const error = new Error('Production error')
      const response = handleAPIError(error)

      expect(response.error?.message).toBe('Internal server error')
      expect(response.error?.details).toBeNull()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('getRequestId', () => {
    it('should extract request ID from x-request-id header', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockImplementation((header) => {
            if (header === 'x-request-id') return 'req-123'
            return null
          })
        }
      } as any

      const requestId = getRequestId(mockRequest)
      expect(requestId).toBe('req-123')
    })

    it('should extract request ID from x-correlation-id header', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockImplementation((header) => {
            if (header === 'x-correlation-id') return 'corr-456'
            return null
          })
        }
      } as any

      const requestId = getRequestId(mockRequest)
      expect(requestId).toBe('corr-456')
    })

    it('should generate UUID when no header is present', () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(null)
        }
      } as any

      const requestId = getRequestId(mockRequest)
      expect(requestId).toBeDefined()
      expect(typeof requestId).toBe('string')
      expect(requestId.length).toBeGreaterThan(0)
    })
  })

  describe('Type Guards', () => {
    describe('isSuccessResponse', () => {
      it('should return true for success response', () => {
        const response = createSuccessResponse({ test: 'data' })
        expect(isSuccessResponse(response)).toBe(true)
      })

      it('should return false for error response', () => {
        const response = createErrorResponse({ code: 'TEST', message: 'Test' })
        expect(isSuccessResponse(response)).toBe(false)
      })
    })

    describe('isErrorResponse', () => {
      it('should return true for error response', () => {
        const response = createErrorResponse({ code: 'TEST', message: 'Test' })
        expect(isErrorResponse(response)).toBe(true)
      })

      it('should return false for success response', () => {
        const response = createSuccessResponse({ test: 'data' })
        expect(isErrorResponse(response)).toBe(false)
      })
    })
  })

  describe('HTTP Status Code Mapping', () => {
    describe('getHTTPStatusForError', () => {
      it('should return correct status codes for known error codes', () => {
        expect(getHTTPStatusForError(API_ERROR_CODES.UNAUTHORIZED)).toBe(401)
        expect(getHTTPStatusForError(API_ERROR_CODES.FORBIDDEN)).toBe(403)
        expect(getHTTPStatusForError(API_ERROR_CODES.NOT_FOUND)).toBe(404)
        expect(getHTTPStatusForError(API_ERROR_CODES.VALIDATION_ERROR)).toBe(400)
        expect(getHTTPStatusForError(API_ERROR_CODES.BUSINESS_RULE_VIOLATION)).toBe(422)
        expect(getHTTPStatusForError(API_ERROR_CODES.RATE_LIMIT_EXCEEDED)).toBe(429)
        expect(getHTTPStatusForError(API_ERROR_CODES.INTERNAL_ERROR)).toBe(500)
      })

      it('should return 500 for unknown error codes', () => {
        expect(getHTTPStatusForError('UNKNOWN_ERROR')).toBe(500)
      })
    })

    it('should have all API error codes mapped to HTTP status codes', () => {
      const mappedCodes = Object.keys(HTTP_STATUS_CODES)
      const apiErrorCodes = Object.values(API_ERROR_CODES)

      // Check that all important error codes have HTTP status mappings
      const importantCodes = [
        API_ERROR_CODES.UNAUTHORIZED,
        API_ERROR_CODES.FORBIDDEN,
        API_ERROR_CODES.NOT_FOUND,
        API_ERROR_CODES.VALIDATION_ERROR,
        API_ERROR_CODES.INTERNAL_ERROR
      ]

      importantCodes.forEach(code => {
        expect(mappedCodes).toContain(code)
      })
    })
  })

  describe('Error Code Constants', () => {
    it('should have all expected error codes defined', () => {
      expect(API_ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED')
      expect(API_ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN')
      expect(API_ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND')
      expect(API_ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(API_ERROR_CODES.BUSINESS_RULE_VIOLATION).toBe('BUSINESS_RULE_VIOLATION')
      expect(API_ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
      expect(API_ERROR_CODES.BOM_GENERATION_ERROR).toBe('BOM_GENERATION_ERROR')
    })

    it('should have file operation error codes', () => {
      expect(API_ERROR_CODES.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE')
      expect(API_ERROR_CODES.INVALID_FILE_TYPE).toBe('INVALID_FILE_TYPE')
      expect(API_ERROR_CODES.FILE_UPLOAD_ERROR).toBe('FILE_UPLOAD_ERROR')
    })

    it('should have database error codes', () => {
      expect(API_ERROR_CODES.DATABASE_ERROR).toBe('DATABASE_ERROR')
      expect(API_ERROR_CODES.CONSTRAINT_VIOLATION).toBe('CONSTRAINT_VIOLATION')
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle order creation success response', () => {
      const orderData = {
        id: 'order-123',
        poNumber: 'PO-2024-001',
        customerName: 'Test Customer',
        status: 'ORDER_CREATED',
        totalItems: 5
      }

      const response = createSuccessResponse(orderData, undefined, 'req-order-123')

      expect(response.success).toBe(true)
      expect(response.data.id).toBe('order-123')
      expect(response.metadata.requestId).toBe('req-order-123')
    })

    it('should handle task creation validation error', () => {
      const validationErrors = [
        { field: 'title', message: 'Title is required' },
        { field: 'orderId', message: 'Invalid order ID format' }
      ]

      const response = createValidationErrorResponse(validationErrors, 'req-task-456')

      expect(response.success).toBe(false)
      expect(response.error?.details.fields).toHaveLength(2)
      expect(response.metadata.requestId).toBe('req-task-456')
    })

    it('should handle resource not found with proper context', () => {
      const response = createNotFoundResponse('WorkInstruction', 'wi-789', 'req-wi-search')

      expect(response.error?.message).toBe('WorkInstruction not found (wi-789)')
      expect(response.error?.details.resource).toBe('WorkInstruction')
      expect(response.error?.details.identifier).toBe('wi-789')
      expect(response.metadata.requestId).toBe('req-wi-search')
    })

    it('should handle business rule violation for task dependencies', () => {
      const response = createBusinessRuleViolationResponse(
        'CIRCULAR_DEPENDENCY',
        'Task cannot depend on itself or create circular dependencies',
        'req-dep-check'
      )

      expect(response.error?.code).toBe(API_ERROR_CODES.BUSINESS_RULE_VIOLATION)
      expect(response.error?.details.rule).toBe('CIRCULAR_DEPENDENCY')
      expect(response.metadata.requestId).toBe('req-dep-check')
    })
  })
})