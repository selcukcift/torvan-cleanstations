# Faucet Placement Logic Fix Summary

## Overview
This document summarizes the investigation and fixes applied to the faucet placement logic in the CleanStation application.

## Issues Found

### 1. Invalid Placement Values in Seed Scripts
Several seed scripts were using invalid faucet placement values:
- `'Center'` → Should be `'BASIN_1'`, `'BASIN_2'`, etc.
- `'Between Basins'` → Should be `'BETWEEN_1_2'`, `'BETWEEN_2_3'`, etc.
- `'Left and Right'` → Should be multiple faucet configurations

**Fixed Files:**
- `scripts/create-mock-order.js`
- `scripts/createTestOrdersForQC.js`
- `scripts/fix-order-d14774586.js`

### 2. Invalid Default Values in API
The order creation API was using `'Center'` as a default value for faucet placement.

**Fixed File:**
- `app/api/orders/route.ts` (lines 366 and 377)

## Business Rules Validated

### Valid Faucet Placement Options

1. **E-Drain Basins**
   - Can ONLY have faucets placed between basins
   - Valid values: `BETWEEN_1_2`, `BETWEEN_2_3`
   - Cannot use: `BASIN_1`, `BASIN_2`, etc.

2. **E-Sink Basins**
   - Can have faucets at center OR between basins
   - Valid values: `BASIN_1`, `BASIN_2`, `BASIN_3`, `BETWEEN_1_2`, `BETWEEN_2_3`

3. **Mixed Configurations**
   - Each basin follows its own rules
   - E-Drain basins in mixed configs still cannot have center placement

## Valid Placement Values

### Center of Basin
- Format: `BASIN_{number}`
- Examples: `BASIN_1`, `BASIN_2`, `BASIN_3`
- Only valid for non-E-Drain basins

### Between Basins
- Format: `BETWEEN_{first}_{second}`
- Examples: `BETWEEN_1_2`, `BETWEEN_2_3`
- Valid for all basin types when multiple basins exist

## Scripts Created

1. **`scripts/check-faucet-placements-env.js`**
   - Checks database for invalid faucet placement values
   - Provides suggestions for fixing invalid values

2. **`scripts/fix-faucet-placement-seeds.js`**
   - Automatically fixes invalid placement values in seed scripts
   - Creates backups before modifying files

3. **`scripts/test-faucet-placement-logic.js`**
   - Validates the business rules for faucet placement
   - Tests various basin configurations

## Current Status

✅ All seed scripts have been updated with valid placement values
✅ API default values have been corrected
✅ No invalid configurations found in the current database
✅ Business rules have been documented and validated

## Recommendations

1. **Add Validation in API**: Implement server-side validation to reject invalid placement values based on basin type
2. **Update UI Logic**: The ConfigurationStep component already implements correct logic - ensure it's consistently used
3. **Database Migration**: If production data has invalid values, create a migration script to fix them
4. **Documentation**: Add these business rules to the main project documentation

## Notes for Developers

When creating faucet configurations:
- Always check the basin type first
- For E-Drain basins, only use `BETWEEN_X_Y` format
- For E-Sink basins, both `BASIN_X` and `BETWEEN_X_Y` are valid
- Never use string literals like 'Center' or 'Between Basins'