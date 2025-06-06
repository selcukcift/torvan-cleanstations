# QC Template Versioning Implementation

## Overview
This document describes the implementation of a versioning system for QC templates to ensure that existing QC results are not affected when templates are modified.

## Key Features Implemented

### 1. Automatic Version Creation
- When a template that has been used in QC results is modified, a new version is automatically created
- The original template is deactivated, and the new version becomes active
- Version numbers are automatically incremented (e.g., 1.0 → 1.1)

### 2. Template Cloning
- New API endpoint: `POST /api/admin/qc-templates/[templateId]/clone`
- Allows creating a copy of an existing template with a new name and version
- Useful for creating variations of templates without affecting the original

### 3. Version History
- New API endpoint: `GET /api/admin/qc-templates/[templateId]/versions`
- Shows all versions of a template with the same name and product family
- Displays usage statistics for each version

### 4. Usage Tracking
- New API endpoint: `GET /api/admin/qc-templates/[templateId]/usage`
- Shows how many times a template has been used in QC results
- Provides recent QC results and status breakdown
- Indicates whether the template can be modified directly or will create a new version

### 5. Enhanced Template Listing
- Templates now show usage count in the listing
- Templates can be filtered by active/inactive status
- Templates are grouped by name and product family to show version relationships

## API Changes

### Modified Endpoints

#### `PUT /api/admin/qc-templates/[templateId]`
- Now checks if the template has been used before updating
- If used, creates a new version instead of modifying the existing one
- Returns a message indicating whether a new version was created

#### `GET /api/admin/qc-templates`
- Added query parameters:
  - `includeInactive`: Include inactive templates in the response
  - `productFamily`: Filter by product family
- Response now includes `templateGroups` showing version relationships

### New Endpoints

#### `POST /api/admin/qc-templates/[templateId]/clone`
Creates a clone of an existing template.

Request body:
```json
{
  "name": "New Template Name",
  "version": "1.0",
  "description": "Optional description",
  "appliesToProductFamily": "Optional product family",
  "isActive": true
}
```

#### `GET /api/admin/qc-templates/[templateId]/versions`
Returns all versions of a template with the same name and product family.

Response:
```json
{
  "templateName": "T2 Sink Quality Control",
  "productFamily": "MDRD_T2_SINK",
  "versions": [
    {
      "id": "template-id",
      "name": "T2 Sink Quality Control",
      "version": "1.2",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "_count": {
        "orderQcResults": 0,
        "items": 10
      }
    }
  ]
}
```

#### `GET /api/admin/qc-templates/[templateId]/usage`
Returns usage statistics for a template.

Response:
```json
{
  "template": {
    "id": "template-id",
    "name": "T2 Sink Quality Control",
    "version": "1.0",
    "isActive": true
  },
  "usage": {
    "total": 5,
    "recentResults": [...],
    "statusBreakdown": {
      "PASSED": 4,
      "FAILED": 1
    }
  },
  "canModify": false,
  "message": "This template has been used 5 times. Modifications will create a new version."
}
```

## UI Updates

### QCTemplateManager Component
- Added version history viewer
- Added template cloning functionality
- Shows usage count in template listing
- Displays warning when editing a used template
- New context menu options:
  - Clone Template
  - Version History

### Visual Indicators
- Templates show usage count badge
- Active/inactive status is clearly indicated
- Warning message appears when editing a used template
- Version history shows which version is current

## Database Considerations

No schema changes were required. The implementation uses the existing:
- `QcFormTemplate` model with `version` and `isActive` fields
- `OrderQcResult` model for tracking template usage
- Cascade delete protection prevents deletion of used templates

## Best Practices

1. **Always check template usage** before making modifications
2. **Use semantic versioning** (e.g., 1.0, 1.1, 2.0)
3. **Keep old versions inactive** but don't delete them
4. **Clone templates** when creating variations
5. **Document version changes** in the description field

## Testing

Created comprehensive test suite in `__tests__/api/qc-template-versioning.test.ts` covering:
- Automatic version creation when updating used templates
- Direct updates for unused templates
- Template cloning
- Version history retrieval
- Usage statistics
- Deletion protection for used templates

## Future Enhancements

1. **Version comparison**: Show differences between template versions
2. **Bulk operations**: Apply changes to multiple templates
3. **Version rollback**: Ability to reactivate old versions
4. **Change logs**: Automatic tracking of what changed between versions
5. **Template inheritance**: Create child templates that inherit from parent templates