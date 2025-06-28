# Fix for Unknown Parts in Bill of Materials

## Problem Summary

The Bill of Materials (BOM) section in order details was showing "Unknown" parts due to:

1. **Generic assembly IDs** used in order configurations that don't exist in the Assembly table
2. **Missing database records** for commonly referenced assembly types
3. **Inadequate fallback logic** in the BOM service when assemblies aren't found

## Root Cause Analysis

### Missing Assembly Records
These generic IDs were referenced in `SinkConfiguration` but missing from the `Assembly` table:

- `HEIGHT-ADJUSTABLE` (legs) - Used in 2 orders
- `PERFORATED` (pegboard) - Used in 2 orders  
- `STANDARD-PEGBOARD` (pegboard) - Used in 1 order

### Available Correct Mappings
The `resources/assemblies.json` file contains the proper assembly definitions:

- `HEIGHT-ADJUSTABLE` → `T2-DL27-KIT`, `T2-LC1-KIT`, `ASSY-T2-DL14-KIT`
- `PERFORATED` → `T2-ADW-PB-PERF-KIT` (and size-specific variants)
- `STANDARD-PEGBOARD` → `T2-ADW-PB-SOLID-KIT` (and size-specific variants)

## Solution Implemented

### 1. Database Fix Script
**File**: `scripts/fix-unknown-parts-comprehensive.js`

- Adds missing assembly records to prevent database lookup failures
- Creates assembly ID mapping reference file
- Verifies which orders are affected
- Provides comprehensive logging and verification

**To run**:
```bash
cd /media/selcuk/project\ files/Clean-stations
node scripts/fix-unknown-parts-comprehensive.js
```

### 2. Enhanced Assembly Mapper
**File**: `lib/assemblyMapper.ts`

- Provides fallback lookup using resource files
- Maps generic IDs to specific assembly IDs
- Creates informative placeholders with resolution suggestions
- Loads assembly definitions from `resources/assemblies.json`

### 3. Updated BOM Service
**File**: `lib/bomService.native.ts`

Enhanced the fallback logic in two key functions:
- `addControlBoxToBOM()` - Control box assembly lookup
- `addItemToBOMRecursive()` - General assembly lookup

**New Fallback Chain**:
1. Try database lookup (existing)
2. Try resource file lookup (new)
3. Try generic-to-specific ID mapping (new)
4. Create enhanced placeholder with suggestions (enhanced)

### 4. Supporting Files
- `scripts/fix-missing-assemblies.sql` - SQL-only version of the fix
- `resources/assembly-id-mappings.json` - Created by the fix script
- `docs/UNKNOWN-PARTS-FIX.md` - This documentation

## Verification Steps

After running the fix script:

1. **Check Database**:
   ```sql
   SELECT "AssemblyID", "name", "type" 
   FROM "Assembly" 
   WHERE "AssemblyID" IN ('HEIGHT-ADJUSTABLE', 'PERFORATED', 'STANDARD-PEGBOARD');
   ```

2. **Test BOM Generation**:
   - Navigate to any order details page
   - Go to "Bill of Materials" tab
   - Verify no "Unknown" parts appear
   - Check browser console for resolution suggestions

3. **Check Affected Orders**:
   The script will identify which orders use generic assembly IDs and may need attention.

## Expected Results

### Before Fix
```
BOM Items:
- Unknown Assembly: HEIGHT-ADJUSTABLE (1x)
- Unknown Assembly: PERFORATED (1x)  
- T2-DL27-KIT: Height Adjustable... (1x)
```

### After Fix
```
BOM Items:
- HEIGHT-ADJUSTABLE: Height Adjustable Leg Kit (Generic Reference) (1x)
- PERFORATED: Perforated Pegboard Kit (Generic Reference) (1x)
- T2-DL27-KIT: Height Adjustable... (1x)
```

Or with enhanced fallback:
```
BOM Items:
- T2-DL27-KIT: HEIGHT ADJUSTABLE ELECTROMECHANICAL COLUMN KIT (DL27) (1x)
- T2-ADW-PB-PERF-KIT: PERFORATED PEGBOARD OF CUSTOM DIMENSIONS KIT (1x)
```

## Future Improvements

1. **Update Order Configuration Logic**:
   - Modify the order creation process to use specific assembly IDs
   - Add assembly selection dropdowns with proper mappings

2. **Enhanced Validation**:
   - Add validation in order creation to prevent generic IDs
   - Create migration script to update existing orders

3. **Resource File Integration**:
   - Consider creating a service that syncs resource files with database
   - Add automated tests for assembly ID mappings

## Technical Notes

- The fix maintains backward compatibility with existing orders
- Generic assembly records are marked as `isOrderable: false`
- Enhanced fallback provides helpful resolution suggestions in console logs
- Resource file lookups are cached for performance

## Testing

Test the fix by:
1. Running the fix script
2. Starting the development server: `npm run dev`
3. Navigating to order details pages
4. Checking BOM sections for unknown parts
5. Monitoring console logs for resolution messages

The unknown parts issue should be completely resolved after implementing this fix.