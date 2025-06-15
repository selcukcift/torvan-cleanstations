# BOM Generation 500 Error Analysis

## Root Cause Identified

The AxiosError 500 when generating BOM in the order details page is caused by **missing order configuration data** in the database.

## Detailed Analysis

### 1. Error Location
- **File**: `/app/api/orders/[orderId]/generate-bom/route.ts`
- **Line**: 94-96
- **Code**:
```typescript
if (!sinkConfig) {
  throw new Error(`No sink configuration found for build number: ${buildNumber}`)
}
```

### 2. Database Investigation
Using the debug script, I found:
- **Orders exist**: 7 total orders in database
- **Problem**: Orders have `buildNumbers` but **no associated configurations**
- **Missing data**: 
  - No `sinkConfigurations`
  - No `basinConfigurations` 
  - No `faucetConfigurations`
  - No `sprayerConfigurations`
  - No `selectedAccessories`

### 3. Expected vs Actual Data Structure

**Expected (working order)**:
```javascript
{
  id: 'order-id',
  buildNumbers: ['BN-2025-001'],
  sinkConfigurations: [
    {
      buildNumber: 'BN-2025-001',
      sinkModelId: 'T2-48',
      length: 60,
      width: 30,
      legsTypeId: 'T2-DL27-KIT',
      // ... other config
    }
  ],
  basinConfigurations: [
    {
      buildNumber: 'BN-2025-001', 
      basinTypeId: 'E_SINK',
      // ... other config
    }
  ]
}
```

**Actual (broken order)**:
```javascript
{
  id: 'cmbwq6oc2005ej5s9kas2t7sw',
  buildNumbers: ['BN-2025-001'],
  sinkConfigurations: [],  // ❌ EMPTY
  basinConfigurations: [], // ❌ EMPTY
  faucetConfigurations: [],// ❌ EMPTY 
  sprayerConfigurations: [],// ❌ EMPTY
  selectedAccessories: []  // ❌ EMPTY
}
```

### 4. BOM Generation Data Flow

1. **Frontend calls**: `POST /api/orders/${orderId}/generate-bom`
2. **API fetches order** with all configurations (line 34-48)
3. **Data transformation** creates `bomRequestData` (line 76-139)
4. **Error occurs** when processing each build number (line 88-96)
5. **Missing config check** throws error for missing `sinkConfig`

### 5. Comparison with Working Flow

**Order Creation Flow** (working):
- Uses `/api/orders/preview-bom` 
- Receives complete configuration data from frontend
- Processes configurations directly without database lookup

**Order Details Flow** (failing):
- Uses `/api/orders/[orderId]/generate-bom`
- Fetches configuration data from database
- Fails because configurations were never saved to database

## Solutions

### Solution 1: Fix Order Creation (Recommended)
**Problem**: Order creation process is not saving configuration data to database.

**Action**: 
1. Review order creation API (`/app/api/orders/route.ts`)
2. Ensure configurations are properly saved when orders are created
3. Test order creation flow end-to-end

### Solution 2: Add Error Handling (Immediate Fix)
**Problem**: BOM generation crashes on missing configurations.

**Action**: Add graceful handling in generate-bom route:

```typescript
if (!sinkConfig) {
  console.warn(`No sink configuration found for build number: ${buildNumber}`)
  return NextResponse.json(
    { 
      success: false, 
      message: `Order is missing configuration data for build number: ${buildNumber}. Please edit the order to add configurations.`,
      missingConfigurations: true
    },
    { status: 400 }
  )
}
```

### Solution 3: Data Migration (If Needed)
**Problem**: Existing orders in database have missing configurations.

**Action**: 
1. Identify orders with missing configurations
2. Either delete incomplete orders or add default configurations
3. Prevent future orders from being saved without complete data

## Verification Steps

1. **Check Order Creation**: Create a new order through the UI and verify all configurations are saved
2. **Test BOM Generation**: Generate BOM for newly created order
3. **Handle Legacy Orders**: Decide how to handle existing orders with missing configurations

## Files to Review

1. `/app/api/orders/route.ts` - Order creation logic
2. `/app/api/orders/[orderId]/generate-bom/route.ts` - BOM generation (add error handling)
3. Order creation UI components - Ensure data is properly submitted
4. Database schema - Verify relationship constraints

## Test Case for Verification

Create order with:
- Customer info
- Sink selection (1 build)
- Complete sink configuration (model, dimensions, legs, feet)
- At least 1 basin configuration
- Optional accessories

Then test BOM generation on the created order.