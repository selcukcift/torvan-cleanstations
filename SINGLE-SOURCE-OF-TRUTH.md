# Single Source of Truth - Order Management

## Overview

The **Single Source of Truth** system automatically generates a comprehensive JSON file for every order containing all configuration details, complete BOM hierarchy, and module-specific data. This JSON serves as the master reference for all downstream workflow modules.

## Features

### 🚀 Automatic Generation
- **Triggers**: Automatically generated when new orders are created
- **Location**: Saved to `orders/single-source-of-truth/order-{orderId}-source-of-truth.json`
- **Non-blocking**: Order creation continues even if JSON generation fails

### 📊 Complete Data Structure

#### Metadata
```json
{
  "metadata": {
    "orderId": "cmc63cab70001j5vkq394jsp6",
    "orderNumber": "ORD-2025-4587",
    "generatedAt": "2025-06-21T19:51:09.413Z",
    "version": "1.0.0",
    "sourceOfTruth": true,
    "lastUpdated": "2025-06-21T19:51:09.413Z",
    "status": "ORDER_CREATED"
  }
}
```

#### Complete BOM Integration
- **71 BOM items** with full hierarchy
- **Parent-child relationships** with depth levels
- **Manufacturing type** classification (Assembly Kit, Complex Assembly, etc.)
- **Procurement type** analysis (Internal Manufacture vs External Purchase)
- **Critical components** identification with priority levels

#### Module-Specific Data

**Manufacturing Data**
- Assembly sequence with estimated times
- Required skills and workstations
- Quality checkpoints
- Special requirements

**Quality Control Data**
- Inspection points by assembly stage
- Test procedures and compliance standards
- Critical-to-quality components

**Procurement Data**
- Internal manufacture vs external purchase breakdown
- Lead time analysis by component type
- Vendor categories and critical path

**Shipping Data**
- Estimated weight and dimensions
- Special handling requirements
- Packaging specifications

#### Workflow State Tracking
```json
{
  "workflowState": {
    "currentStage": "ORDER_CREATED",
    "nextSteps": ["BOM_REVIEW", "PROCUREMENT_PLANNING"],
    "completedSteps": ["ORDER_CONFIGURATION", "BOM_GENERATION"],
    "milestones": {
      "orderCreated": "2025-06-21T19:51:09.413Z",
      "procurementStarted": null,
      "manufacturingStarted": null
    }
  }
}
```

## API Endpoints

### Get Single Source of Truth
```http
GET /api/orders/{orderId}/source-of-truth
```
**Authentication**: Required  
**Returns**: Complete single source of truth JSON

### Update Workflow State
```http
PATCH /api/orders/{orderId}/source-of-truth
Content-Type: application/json

{
  "stage": "PROCUREMENT_STARTED",
  "additionalData": {
    "procurement": {
      "startedBy": "John Doe",
      "estimatedCompletion": "2025-07-15"
    }
  }
}
```
**Authentication**: Required (ADMIN, PRODUCTION_COORDINATOR, QC_PERSON, PROCUREMENT_SPECIALIST)  
**Valid Stages**:
- `ORDER_CREATED`
- `BOM_REVIEW`
- `PROCUREMENT_PLANNING`
- `PROCUREMENT_STARTED`
- `MANUFACTURING_SCHEDULING`
- `MANUFACTURING_STARTED`
- `QUALITY_CONTROL_STARTED`
- `SHIPPING_STARTED`
- `ORDER_COMPLETED`

### Regenerate Single Source of Truth
```http
POST /api/orders/{orderId}/regenerate-source-of-truth
```
**Authentication**: Required (ADMIN, PRODUCTION_COORDINATOR only)  
**Use Case**: When BOM service data has been updated or configuration changed

## Implementation Details

### Integration Points

**Order Creation** (`app/api/orders/route.ts`)
```typescript
// Added after order creation
try {
  const singleSourceOfTruthPath = await generateOrderSingleSourceOfTruth(order.id)
  console.log('✅ Single source of truth generated:', singleSourceOfTruthPath)
} catch (error) {
  console.error('⚠️ Warning: JSON generation failed:', error)
  // Order creation continues regardless
}
```

**Core Service** (`lib/orderSingleSourceOfTruth.ts`)
- `generateOrderSingleSourceOfTruth()`: Main generation function
- `updateOrderWorkflowState()`: Update workflow milestones
- `getOrderSingleSourceOfTruth()`: Retrieve JSON data

### Data Flow

1. **Order Created** → Database records saved
2. **Configuration Extracted** → From all order tables
3. **BOM Generated** → Via existing BOM service API
4. **Enhanced Analysis** → Manufacturing, procurement, QC data
5. **JSON Saved** → File system for reference
6. **API Access** → Available via REST endpoints

### File Structure
```
orders/
└── single-source-of-truth/
    ├── order-{orderId1}-source-of-truth.json
    ├── order-{orderId2}-source-of-truth.json
    └── ...
```

## Module Consumption

### Manufacturing Module
```javascript
const orderData = await fetch(`/api/orders/${orderId}/source-of-truth`)
const { manufacturingData } = orderData.data

// Use assembly sequence
manufacturingData.assemblySequence.forEach(step => {
  console.log(`Step ${step.step}: ${step.description}`)
  console.log(`Time: ${step.estimatedTime}`)
  console.log(`Skills: ${step.requiredSkills.join(', ')}`)
})
```

### Quality Control Module
```javascript
const { qualityControlData } = orderData.data

// Use inspection points
qualityControlData.inspectionPoints.forEach(point => {
  console.log(`Stage: ${point.stage}`)
  console.log(`Checkpoints: ${point.checkpoints.join(', ')}`)
})
```

### Procurement Module
```javascript
const { procurementData } = orderData.data

// Internal manufacturing items
const internalParts = procurementData.internalManufacture
const externalParts = procurementData.externalPurchase
const leadTimes = procurementData.leadTimeAnalysis
```

## Benefits

### 🎯 Single Source of Truth
- All order data in one place
- No data synchronization issues
- Consistent information across modules

### 🔄 Dynamic Updates
- Workflow state tracking
- Milestone progression
- Additional data injection

### 📈 Enhanced Analysis
- Manufacturing breakdown by type
- Critical component identification
- Parent-child relationship mapping

### 🛡️ Reliability
- Non-blocking generation
- Error handling and logging
- Fallback mechanisms

### 🚀 Performance
- Pre-generated data
- No real-time BOM calculations
- Cached JSON access

## Monitoring

### Success Indicators
- ✅ JSON file exists for each order
- ✅ BOM items count matches expected
- ✅ Workflow milestones updated correctly

### Error Scenarios
- ❌ Order not found in database
- ❌ BOM service API failure
- ❌ File system write permissions
- ❌ Invalid workflow stage updates

### Logging
```
🏗️ Generating single source of truth JSON for order: {orderId}
✅ Single source of truth generated successfully: {filePath}
📊 BOM items: {count}
⚠️ Warning: Failed to generate single source of truth JSON: {error}
```

## Future Enhancements

### Phase 2
- Real-time updates via WebSocket
- Version history tracking
- JSON schema validation
- Automated testing integration

### Phase 3
- Machine learning insights
- Predictive lead times
- Automated quality predictions
- Cost optimization analysis

---

**Note**: This system preserves the excellent BOM service implementation while providing comprehensive data access for all downstream workflow modules. The JSON structure is designed to be the definitive reference that all other application components can rely on.