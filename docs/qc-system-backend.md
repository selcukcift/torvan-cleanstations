# QC Checklist System - Backend Documentation

## Overview
The QC (Quality Control) Checklist System backend provides comprehensive APIs for managing QC templates and performing quality control inspections on orders. This system is designed to be flexible, allowing different QC templates for different product families while maintaining audit trails and inspection history.

## Database Schema

### Core Models

#### QcFormTemplate
- Stores QC checklist templates
- Can be specific to a product family or generic
- Supports versioning and active/inactive states

#### QcFormTemplateItem
- Individual checklist items within a template
- Supports multiple item types (pass/fail, text, numeric, select, etc.)
- Organized by sections with display order

#### OrderQcResult
- Records QC inspection results for orders
- Links orders to QC templates
- Tracks inspector, timestamp, and overall status

#### OrderQcItemResult
- Stores individual item results within a QC inspection
- Captures values, conformance status, and notes

## API Endpoints

### Admin Template Management

#### GET /api/admin/qc-templates
- Lists all QC templates with usage statistics
- Requires ADMIN role

#### POST /api/admin/qc-templates
- Creates a new QC template with items
- Requires ADMIN role

#### GET /api/admin/qc-templates/[templateId]
- Gets specific template with all items
- Requires ADMIN, PRODUCTION_COORDINATOR, or QC_PERSON role

#### PUT /api/admin/qc-templates/[templateId]
- Updates template and items (transactional)
- Supports create/update/delete actions for items
- Requires ADMIN role

#### DELETE /api/admin/qc-templates/[templateId]
- Deletes template if not used in any QC results
- Requires ADMIN role

### Order QC Integration

#### GET /api/orders/[orderId]/qc
- Gets existing QC result for an order
- Includes template, item results, and inspector info

#### POST /api/orders/[orderId]/qc
- Creates or updates QC inspection results
- Updates order status on completion
- Creates audit log entries

#### GET /api/orders/[orderId]/qc/template
- Finds appropriate QC template for order's product family
- Falls back to generic template if no specific match

#### GET /api/orders/[orderId]/qc/history
- Lists all QC inspections for an order
- Useful for audit trails

#### GET /api/orders/[orderId]/qc/export
- Exports QC results as CSV
- Supports filtering by specific result ID

### QC Analytics

#### GET /api/qc/summary
- Provides QC statistics and trends
- Includes pass rates, inspector performance, daily trends
- Configurable time period (default 30 days)

## Data Validation

### Validation Schemas (lib/qcValidationSchemas.ts)
- Zod schemas for all API inputs
- Helper functions for result validation
- Completion percentage calculation
- Automatic status determination

### Item Types Support
- **PASS_FAIL**: Boolean conformance check
- **TEXT_INPUT**: Free text entry
- **NUMERIC_INPUT**: Number values
- **SINGLE_SELECT**: Single option from list
- **MULTI_SELECT**: Multiple options (stored as JSON)
- **DATE_INPUT**: Date values
- **CHECKBOX**: Boolean checkbox

## Security & Permissions

### Role-Based Access
- **ADMIN**: Full access to template management
- **QC_PERSON**: Can perform inspections and view results
- **ASSEMBLER**: Can perform inspections
- **PRODUCTION_COORDINATOR**: Can view results and reports

### Audit Trail
- All QC activities logged in OrderHistoryLog
- Inspector information captured with timestamps
- Order status updates tracked

## Usage Examples

### Creating a QC Template
```typescript
POST /api/admin/qc-templates
{
  "name": "T2 Sink Production Checklist",
  "version": "1.0",
  "appliesToProductFamily": "MDRD_T2_SINK",
  "items": [
    {
      "section": "Pre-Assembly",
      "checklistItem": "Verify all parts present",
      "itemType": "PASS_FAIL",
      "order": 1,
      "isRequired": true
    }
  ]
}
```

### Submitting QC Results
```typescript
POST /api/orders/[orderId]/qc
{
  "templateId": "clxx123...",
  "overallStatus": "PASSED",
  "notes": "All checks completed successfully",
  "itemResults": [
    {
      "templateItemId": "clxx456...",
      "isConformant": true,
      "notes": "No issues found"
    }
  ]
}
```

### Exporting QC Results
```
GET /api/orders/[orderId]/qc/export?format=csv
```

## Database Migration

Run the following command to create the QC tables:
```bash
npx prisma migrate dev --name add_qc_checklist_models
```

## Seeding Initial Data

Run the seed script to create initial QC templates:
```bash
node scripts/seedQcTemplates.js
```

This creates:
- T2 Sink Production Checklist (39 items)
- Generic Production Checklist (10 items)

## Next Steps

The backend is now ready for frontend integration. The next phase (Sprint 4) will focus on:
- QC template management UI for admins
- QC form filling interface for inspectors
- QC results viewing and reporting
- Integration with role-based dashboards