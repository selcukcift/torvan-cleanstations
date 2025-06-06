# API Specification Document
## Torvan Medical CleanStation Production Workflow Digitalization

**Version:** 1.0  
**Date:** June 2, 2025  
**Document Type:** API Specification  
**Base URL:** `/api/v1`

---

## 1. API Overview

### 1.1 General Information
- **Protocol:** HTTPS
- **Authentication:** JWT Bearer tokens
- **Content Type:** `application/json`
- **Rate Limiting:** 1000 requests per hour per user
- **API Versioning:** URL path versioning (`/api/v1/`)

### 1.2 Response Format
All API responses follow this standard format:

```json
{
  "success": boolean,
  "data": any | null,
  "error": {
    "code": string,
    "message": string,
    "details": any
  } | null,
  "metadata": {
    "timestamp": string,
    "pagination": {
      "page": number,
      "limit": number,
      "total": number,
      "totalPages": number
    } | null
  }
}
```

### 1.3 Error Codes
- `AUTH_001`: Invalid authentication token
- `AUTH_002`: Insufficient permissions
- `VAL_001`: Validation error
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Internal server error

## 2. Authentication Endpoints

### 2.1 User Authentication

#### POST `/api/v1/auth/login`
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "user": {
      "id": "string",
      "username": "string",
      "fullName": "string",
      "role": "PRODUCTION_COORDINATOR | ADMIN | PROCUREMENT_SPECIALIST | QC_PERSON | ASSEMBLER | SERVICE_DEPARTMENT",
      "initials": "string"
    },
    "expiresAt": "string (ISO 8601)"
  }
}
```

#### POST `/api/v1/auth/logout`
Invalidate current session.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

#### GET `/api/v1/auth/me`
Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "username": "string",
    "fullName": "string",
    "role": "string",
    "initials": "string",
    "isActive": boolean
  }
}
```

## 3. Order Management Endpoints

### 3.1 Order Operations

#### GET `/api/v1/orders`
Retrieve paginated list of orders with filtering and sorting.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 10, max: 100)
- `status`: string (filter by order status)
- `customer`: string (filter by customer name)
- `poNumber`: string (filter by PO number)
- `sortBy`: string (createdAt, wantDate, status)
- `sortOrder`: 'asc' | 'desc' (default: desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "poNumber": "string",
      "buildNumber": "string",
      "customerName": "string",
      "projectName": "string | null",
      "salesPerson": "string",
      "wantDate": "string (ISO 8601)",
      "orderStatus": "ORDER_CREATED | PARTS_SENT | READY_FOR_PRE_QC | READY_FOR_PRODUCTION | READY_FOR_FINAL_QC | READY_FOR_SHIP | SHIPPED",
      "sinkFamily": "MDRD | ENDOSCOPE | INSTROSINK",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ],
  "metadata": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

#### POST `/api/v1/orders`
Create a new production order.

**Request Body:**
```json
{
  "customerInfo": {
    "poNumber": "string",
    "customerName": "string",
    "projectName": "string | null",
    "salesPerson": "string",
    "wantDate": "string (ISO 8601)",
    "notes": "string | null",
    "documentLanguage": "EN | FR | SP"
  },
  "sinkSelection": {
    "sinkFamily": "MDRD",
    "quantity": number,
    "buildNumbers": ["string"]
  },
  "sinkConfigurations": [
    {
      "buildNumber": "string",
      "sinkBody": {
        "sinkModel": "T2-B1 | T2-B2 | T2-B3",
        "dimensions": {
          "width": number,
          "length": number
        },
        "legsType": "HEIGHT_ADJUSTABLE | FIXED_HEIGHT",
        "legsModel": "DL27 | DL14 | LC1",
        "feetType": "LOCK_LEVELING_CASTERS | SS_ADJUSTABLE_SEISMIC_FEET",
        "pegboard": {
          "enabled": boolean,
          "color": "GREEN | BLACK | YELLOW | GREY | RED | BLUE | ORANGE | WHITE",
          "type": "PERFORATED | SOLID",
          "size": {
            "type": "SAME_AS_SINK | CUSTOM",
            "customDimensions": {
              "width": number,
              "length": number
            } | null
          }
        },
        "workflowDirection": "LEFT_TO_RIGHT | RIGHT_TO_LEFT"
      },
      "basinConfigurations": [
        {
          "basinIndex": number,
          "basinType": "E_SINK | E_SINK_DI | E_DRAIN",
          "basinSize": {
            "type": "STANDARD | CUSTOM",
            "dimensions": {
              "width": number,
              "length": number,
              "depth": number
            }
          },
          "addons": ["P_TRAP_DISINFECTION_DRAIN_UNIT", "BASIN_LIGHT"]
        }
      ],
      "faucetConfigurations": [
        {
          "faucetType": "WRIST_BLADE_SWING_SPOUT | PRE_RINSE_OVERHEAD_SPRAY | GOOSENECK_TREATED_WATER",
          "quantity": number,
          "placement": "CENTER | BETWEEN_BASINS"
        }
      ],
      "sprayerConfigurations": [
        {
          "enabled": boolean,
          "sprayerType": "DI_WATER_GUN_KIT_TURRET | DI_WATER_GUN_KIT_ROSETTE | AIR_GUN_KIT_TURRET | AIR_GUN_KIT_ROSETTE",
          "quantity": number,
          "location": "LEFT_SIDE | RIGHT_SIDE"
        }
      ]
    }
  ],
  "accessories": [
    {
      "assemblyId": "string",
      "quantity": number
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "string",
    "poNumber": "string",
    "status": "ORDER_CREATED",
    "bomGenerated": boolean,
    "createdAt": "string (ISO 8601)"
  }
}
```

#### GET `/api/v1/orders/{orderId}`
Retrieve detailed order information.

**Path Parameters:**
- `orderId`: string

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "poNumber": "string",
    "buildNumber": "string",
    "customerInfo": {
      "customerName": "string",
      "projectName": "string | null",
      "salesPerson": "string",
      "wantDate": "string (ISO 8601)",
      "notes": "string | null",
      "documentLanguage": "EN | FR | SP"
    },
    "sinkConfiguration": {
      // Full configuration object
    },
    "orderStatus": "string",
    "currentAssignee": {
      "id": "string",
      "fullName": "string",
      "role": "string"
    } | null,
    "generatedBOM": {
      "bomId": "string",
      "items": [
        {
          "itemId": "string",
          "type": "PART | ASSEMBLY",
          "name": "string",
          "partNumber": "string",
          "quantity": number,
          "level": number,
          "parentId": "string | null"
        }
      ]
    },
    "documents": [
      {
        "id": "string",
        "fileName": "string",
        "fileUrl": "string",
        "uploadedBy": "string",
        "uploadedAt": "string (ISO 8601)"
      }
    ],
    "historyLog": [
      {
        "timestamp": "string (ISO 8601)",
        "userId": "string",
        "userFullName": "string",
        "action": "string",
        "oldStatus": "string | null",
        "newStatus": "string",
        "notes": "string | null"
      }
    ],
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)"
  }
}
```

#### PUT `/api/v1/orders/{orderId}/status`
Update order status.

**Path Parameters:**
- `orderId`: string

**Request Body:**
```json
{
  "status": "ORDER_CREATED | PARTS_SENT | READY_FOR_PRE_QC | READY_FOR_PRODUCTION | READY_FOR_FINAL_QC | READY_FOR_SHIP | SHIPPED",
  "notes": "string | null",
  "assigneeId": "string | null"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "string",
    "oldStatus": "string",
    "newStatus": "string",
    "updatedAt": "string (ISO 8601)"
  }
}
```

## 4. BOM Management Endpoints

### 4.1 BOM Operations

#### GET `/api/v1/orders/{orderId}/bom`
Retrieve BOM for specific order.

**Path Parameters:**
- `orderId`: string

**Response:**
```json
{
  "success": true,
  "data": {
    "bomId": "string",
    "orderId": "string",
    "generatedAt": "string (ISO 8601)",
    "items": [
      {
        "id": "string",
        "type": "PART | ASSEMBLY | SUB_ASSEMBLY",
        "itemId": "string",
        "name": "string",
        "partNumber": "string",
        "manufacturerPartNumber": "string | null",
        "quantity": number,
        "level": number,
        "parentId": "string | null",
        "children": ["string"],
        "notes": "string | null"
      }
    ]
  }
}
```

#### POST `/api/v1/orders/{orderId}/bom/regenerate`
Regenerate BOM for specific order.

**Path Parameters:**
- `orderId`: string

**Response:**
```json
{
  "success": true,
  "data": {
    "bomId": "string",
    "regeneratedAt": "string (ISO 8601)",
    "changes": [
      {
        "type": "ADDED | REMOVED | MODIFIED",
        "itemId": "string",
        "description": "string"
      }
    ]
  }
}
```

#### GET `/api/v1/orders/{orderId}/bom/export`
Export BOM in various formats.

**Path Parameters:**
- `orderId`: string

**Query Parameters:**
- `format`: 'csv' | 'pdf'

**Response:**
- For CSV: `text/csv` content type with file download
- For PDF: `application/pdf` content type with file download

## 5. Inventory Management Endpoints

### 5.1 Parts Management

#### GET `/api/v1/inventory/parts`
Retrieve paginated list of parts.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `search`: string (search in name or part number)
- `status`: 'ACTIVE' | 'INACTIVE'
- `category`: string

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "manufacturerPartNumber": "string | null",
      "manufacturerInfo": "string | null",
      "type": "COMPONENT | MATERIAL",
      "status": "ACTIVE | INACTIVE",
      "photoUrl": "string | null",
      "technicalDrawingUrl": "string | null",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)"
    }
  ],
  "metadata": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25
    }
  }
}
```

#### POST `/api/v1/inventory/parts`
Create new part (Admin only).

**Request Body:**
```json
{
  "name": "string",
  "manufacturerPartNumber": "string | null",
  "manufacturerInfo": "string | null",
  "type": "COMPONENT | MATERIAL",
  "status": "ACTIVE | INACTIVE",
  "photoUrl": "string | null",
  "technicalDrawingUrl": "string | null"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "createdAt": "string (ISO 8601)"
  }
}
```

#### GET `/api/v1/inventory/parts/{partId}`
Retrieve specific part details.

#### PUT `/api/v1/inventory/parts/{partId}`
Update part information (Admin only).

#### DELETE `/api/v1/inventory/parts/{partId}`
Delete part (Admin only).

### 5.2 Assemblies Management

#### GET `/api/v1/inventory/assemblies`
Retrieve paginated list of assemblies.

**Query Parameters:**
- `page`: number
- `limit`: number
- `search`: string
- `type`: 'SIMPLE' | 'COMPLEX' | 'SERVICE_PART' | 'KIT'
- `category`: string

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "type": "SIMPLE | COMPLEX | SERVICE_PART | KIT",
      "categoryCode": "string",
      "subcategoryCode": "string",
      "canOrder": boolean,
      "isKit": boolean,
      "status": "ACTIVE | INACTIVE",
      "photoUrl": "string | null",
      "technicalDrawingUrl": "string | null",
      "qrData": "string | null",
      "componentCount": number,
      "createdAt": "string (ISO 8601)"
    }
  ]
}
```

#### GET `/api/v1/inventory/assemblies/{assemblyId}`
Retrieve assembly details with components.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "type": "string",
    "categoryCode": "string",
    "subcategoryCode": "string",
    "components": [
      {
        "id": "string",
        "type": "PART | ASSEMBLY",
        "itemId": "string",
        "name": "string",
        "quantity": number,
        "notes": "string | null"
      }
    ],
    "workInstruction": {
      "id": "string",
      "title": "string",
      "steps": [
        {
          "stepNumber": number,
          "description": "string",
          "visualUrl": "string | null",
          "safetyNotes": "string | null"
        }
      ]
    } | null,
    "kitComponents": {
      // Kit-specific component details
    } | null
  }
}
```

## 6. Quality Control Endpoints

### 6.1 QC Templates

#### GET `/api/v1/qc/templates`
Retrieve QC checklist templates.

**Query Parameters:**
- `type`: 'PRE_QC' | 'FINAL_QC' | 'IN_PROCESS'

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "formName": "string",
      "formType": "PRE_QC | FINAL_QC | IN_PROCESS",
      "version": number,
      "checklistItems": [
        {
          "id": "string",
          "section": "string",
          "itemDescription": "string",
          "checkType": "BOOLEAN | TEXT | MEASUREMENT | N_A_OPTION",
          "isBasinSpecific": boolean,
          "defaultValue": "any | null",
          "notesPrompt": boolean
        }
      ]
    }
  ]
}
```

#### GET `/api/v1/qc/templates/{templateId}`
Retrieve specific QC template.

### 6.2 QC Results

#### POST `/api/v1/qc/results`
Submit QC results.

**Request Body:**
```json
{
  "orderId": "string",
  "buildNumber": "string",
  "qcFormTemplateId": "string",
  "qcTypePerformed": "PRE_QC | FINAL_QC | IN_PROCESS",
  "jobId": "string | null",
  "numberOfBasins": number,
  "itemResults": [
    {
      "checklistItemId": "string",
      "resultValue": "any",
      "isNA": boolean,
      "notes": "string | null"
    }
  ],
  "overallStatus": "PASS | FAIL | INCOMPLETE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qcResultId": "string",
    "submittedAt": "string (ISO 8601)",
    "digitalSignature": "string"
  }
}
```

#### GET `/api/v1/qc/results/{orderId}`
Retrieve QC results for order.

## 7. Assembly & Tasks Endpoints

### 7.1 Task Management

#### GET `/api/v1/assembly/tasks/{orderId}`
Retrieve task list for order assembly.

**Response:**
```json
{
  "success": true,
  "data": {
    "taskListId": "string",
    "orderId": "string",
    "assemblyType": "string",
    "tasks": [
      {
        "id": "string",
        "sequence": number,
        "description": "string",
        "workInstruction": {
          "id": "string",
          "title": "string",
          "steps": [
            {
              "stepNumber": number,
              "description": "string",
              "visualUrl": "string | null",
              "safetyNotes": "string | null"
            }
          ]
        } | null,
        "requiredTools": [
          {
            "id": "string",
            "name": "string",
            "description": "string",
            "imageUrl": "string | null"
          }
        ],
        "requiredParts": [
          {
            "partId": "string",
            "name": "string",
            "quantity": number
          }
        ],
        "productionChecklistItemId": "string | null",
        "completed": boolean,
        "completedAt": "string (ISO 8601) | null",
        "completedBy": "string | null"
      }
    ]
  }
}
```

#### PUT `/api/v1/assembly/tasks/{taskId}/complete`
Mark task as completed.

**Request Body:**
```json
{
  "notes": "string | null"
}
```

#### POST `/api/v1/assembly/testing/{orderId}`
Submit testing results.

**Request Body:**
```json
{
  "testResults": [
    {
      "testName": "string",
      "result": "PASS | FAIL",
      "measurements": "string | null",
      "notes": "string | null"
    }
  ]
}
```

## 8. Service Department Endpoints

### 8.1 Service Orders

#### GET `/api/v1/service/parts`
Browse service parts for ordering.

**Query Parameters:**
- `search`: string
- `category`: string
- `page`: number
- `limit`: number

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "type": "SERVICE_PART | KIT",
      "photoUrl": "string | null",
      "description": "string | null"
    }
  ]
}
```

#### POST `/api/v1/service/orders`
Submit service part order request.

**Request Body:**
```json
{
  "items": [
    {
      "partId": "string",
      "quantity": number
    }
  ],
  "notes": "string | null"
}
```

#### GET `/api/v1/service/orders`
Retrieve service order requests.

## 9. File Management Endpoints

### 9.1 Document Upload

#### POST `/api/v1/files/upload`
Upload file and associate with order.

**Request:** `multipart/form-data`
- `file`: File
- `orderId`: string
- `documentType`: string

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "string",
    "fileName": "string",
    "fileUrl": "string",
    "uploadedAt": "string (ISO 8601)"
  }
}
```

### 9.2 QR Code Generation

#### GET `/api/v1/qr/generate/{assemblyId}`
Generate QR code for assembly.

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCodeUrl": "string",
    "qrData": "string"
  }
}
```

## 10. User Management Endpoints (Admin Only)

### 10.1 User Operations

#### GET `/api/v1/admin/users`
Retrieve all users.

#### POST `/api/v1/admin/users`
Create new user.

#### PUT `/api/v1/admin/users/{userId}`
Update user information.

#### DELETE `/api/v1/admin/users/{userId}`
Deactivate user.

---

## 11. Webhook Endpoints

### 11.1 Notifications

#### POST `/api/v1/webhooks/order-status-change`
Webhook for order status changes.

---

*This API specification defines all endpoints required for the Torvan Medical CleanStation Production Workflow system. All endpoints require proper authentication and authorization based on user roles.*