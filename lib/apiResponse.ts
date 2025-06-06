/**
 * Standardized API Response Utilities
 * Provides consistent response format across all API endpoints
 */

export interface StandardAPIResponse<T = any> {
  success: boolean
  data: T | null
  error: {
    code: string
    message: string
    details?: any
  } | null
  metadata: {
    timestamp: string
    version: string
    requestId?: string
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrevious: boolean
    }
  }
}

export interface PaginationOptions {
  page?: number
  limit?: number
  total?: number
}

export interface APIError {
  code: string
  message: string
  details?: any
}

/**
 * Standard API Error Codes
 */
export const API_ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  
  // Business Logic
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  WORKFLOW_ERROR: 'WORKFLOW_ERROR',
  BOM_GENERATION_ERROR: 'BOM_GENERATION_ERROR',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // File Operations
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION'
} as const

/**
 * Creates a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  pagination?: PaginationOptions,
  requestId?: string
): StandardAPIResponse<T> {
  const metadata: StandardAPIResponse<T>['metadata'] = {
    timestamp: new Date().toISOString(),
    version: 'v1',
    requestId
  }

  if (pagination && pagination.total !== undefined) {
    const page = pagination.page || 1
    const limit = pagination.limit || 10
    const total = pagination.total
    const totalPages = Math.ceil(total / limit)

    metadata.pagination = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    }
  }

  return {
    success: true,
    data,
    error: null,
    metadata
  }
}

/**
 * Creates an error API response
 */
export function createErrorResponse(
  error: APIError,
  requestId?: string
): StandardAPIResponse<null> {
  return {
    success: false,
    data: null,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      requestId
    }
  }
}

/**
 * Creates a validation error response
 */
export function createValidationErrorResponse(
  validationErrors: Array<{ field: string; message: string }>,
  requestId?: string
): StandardAPIResponse<null> {
  return createErrorResponse(
    {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      details: {
        fields: validationErrors
      }
    },
    requestId
  )
}

/**
 * Creates a not found error response
 */
export function createNotFoundResponse(
  resource: string,
  identifier?: string,
  requestId?: string
): StandardAPIResponse<null> {
  return createErrorResponse(
    {
      code: API_ERROR_CODES.NOT_FOUND,
      message: `${resource} not found${identifier ? ` (${identifier})` : ''}`,
      details: { resource, identifier }
    },
    requestId
  )
}

/**
 * Creates an unauthorized error response
 */
export function createUnauthorizedResponse(
  message: string = 'Authentication required',
  requestId?: string
): StandardAPIResponse<null> {
  return createErrorResponse(
    {
      code: API_ERROR_CODES.UNAUTHORIZED,
      message,
      details: null
    },
    requestId
  )
}

/**
 * Creates a forbidden error response
 */
export function createForbiddenResponse(
  message: string = 'Insufficient permissions',
  requestId?: string
): StandardAPIResponse<null> {
  return createErrorResponse(
    {
      code: API_ERROR_CODES.FORBIDDEN,
      message,
      details: null
    },
    requestId
  )
}

/**
 * Creates an internal server error response
 */
export function createInternalErrorResponse(
  message: string = 'Internal server error',
  details?: any,
  requestId?: string
): StandardAPIResponse<null> {
  return createErrorResponse(
    {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      message,
      details
    },
    requestId
  )
}

/**
 * Creates a business rule violation error response
 */
export function createBusinessRuleViolationResponse(
  rule: string,
  message: string,
  requestId?: string
): StandardAPIResponse<null> {
  return createErrorResponse(
    {
      code: API_ERROR_CODES.BUSINESS_RULE_VIOLATION,
      message,
      details: { rule }
    },
    requestId
  )
}

/**
 * Helper to extract request ID from headers
 */
export function getRequestId(request: Request): string {
  return (
    request.headers.get('x-request-id') ||
    request.headers.get('x-correlation-id') ||
    crypto.randomUUID()
  )
}

/**
 * Helper to create Next.js Response with standard headers
 */
export function createAPIResponse<T>(
  response: StandardAPIResponse<T>,
  status: number = 200,
  additionalHeaders?: Record<string, string>
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Version': 'v1',
    'X-Request-ID': response.metadata.requestId || crypto.randomUUID(),
    ...additionalHeaders
  }

  return new Response(JSON.stringify(response), {
    status,
    headers
  })
}

/**
 * Middleware helper to handle common API errors
 */
export function handleAPIError(
  error: unknown,
  requestId?: string
): StandardAPIResponse<null> {
  console.error('API Error:', error)

  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return createErrorResponse(
        {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: error.message,
          details: null
        },
        requestId
      )
    }

    if (error.message.includes('UNAUTHORIZED')) {
      return createUnauthorizedResponse(error.message, requestId)
    }

    if (error.message.includes('FORBIDDEN')) {
      return createForbiddenResponse(error.message, requestId)
    }

    if (error.message.includes('NOT_FOUND')) {
      return createErrorResponse(
        {
          code: API_ERROR_CODES.NOT_FOUND,
          message: error.message,
          details: null
        },
        requestId
      )
    }

    // Default to internal error
    return createInternalErrorResponse(
      process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      process.env.NODE_ENV === 'development' ? error.stack : null,
      requestId
    )
  }

  return createInternalErrorResponse('Unknown error occurred', null, requestId)
}

/**
 * Type guards for API responses
 */
export function isSuccessResponse<T>(
  response: StandardAPIResponse<T>
): response is StandardAPIResponse<T> & { success: true; data: T } {
  return response.success && response.data !== null
}

export function isErrorResponse<T>(
  response: StandardAPIResponse<T>
): response is StandardAPIResponse<T> & { success: false; error: APIError } {
  return !response.success && response.error !== null
}

/**
 * HTTP Status Code mappings for common API errors
 */
export const HTTP_STATUS_CODES = {
  [API_ERROR_CODES.UNAUTHORIZED]: 401,
  [API_ERROR_CODES.FORBIDDEN]: 403,
  [API_ERROR_CODES.NOT_FOUND]: 404,
  [API_ERROR_CODES.VALIDATION_ERROR]: 400,
  [API_ERROR_CODES.INVALID_INPUT]: 400,
  [API_ERROR_CODES.MISSING_REQUIRED_FIELD]: 400,
  [API_ERROR_CODES.RESOURCE_CONFLICT]: 409,
  [API_ERROR_CODES.BUSINESS_RULE_VIOLATION]: 422,
  [API_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [API_ERROR_CODES.INTERNAL_ERROR]: 500,
  [API_ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [API_ERROR_CODES.FILE_TOO_LARGE]: 413,
  [API_ERROR_CODES.INVALID_FILE_TYPE]: 415
} as const

/**
 * Get appropriate HTTP status code for error code
 */
export function getHTTPStatusForError(errorCode: string): number {
  return HTTP_STATUS_CODES[errorCode as keyof typeof HTTP_STATUS_CODES] || 500
}