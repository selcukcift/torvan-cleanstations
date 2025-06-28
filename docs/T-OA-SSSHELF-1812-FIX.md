# Fix for T-OA-SSSHELF-1812 Unknown Assembly Issue

## Problem Identified ✅

You reported seeing:
```
Unknown Assembly: T-oa-ssshelf-1812
Part #: T-OA-SSSHELF-1812
```

## Root Cause Analysis 🔍

The issue was **NOT** that the part doesn't exist. The problem was:

1. **`T-OA-SSSHELF-1812` exists as a PART, not an Assembly** ✅
2. **The BOM service was trying to look it up as an Assembly** ❌
3. **Database field name mismatch in Prisma queries** ❌

### What We Found:

```sql
-- ✅ This EXISTS in Part table:
T-OA-SSSHELF-1812 → "STAINLESS STEEL SLOT SHELF, 18"W X 12"D" (COMPONENT)

-- ❌ This does NOT exist in Assembly table:
T-OA-SSSHELF-1812 → (Not found)

-- ✅ This EXISTS in Assembly table:
ASSY-T-OA-SSSHELF-1812 → "STAINLESS STEEL SLOT SHELF, 18"W X 12"D" (SIMPLE)
```

## Technical Issues Fixed 🔧

### 1. Database Field Name Mismatches
**Problem**: Prisma queries were using camelCase field names, but database uses PascalCase:

```typescript
// ❌ WRONG (was causing failures):
where: { assemblyId: 'T-OA-SSSHELF-1812' }
where: { partId: 'T-OA-SSSHELF-1812' }

// ✅ FIXED:
where: { AssemblyID: 'T-OA-SSSHELF-1812' }
where: { PartID: 'T-OA-SSSHELF-1812' }
```

### 2. Missing Part/Assembly Type Detection
**Problem**: BOM service only looked up items as Assemblies, never as Parts.

**Solution**: Added fallback logic:
1. Try to find as Assembly first
2. If not found, try to find as Part
3. If still not found, use resource file fallback
4. Finally, create enhanced placeholder

### 3. Enhanced Fallback Chain
```typescript
// New lookup sequence in bomService.native.ts:
const assembly = await getAssemblyDetails(assemblyId)
if (!assembly) {
  // NEW: Check if it's actually a Part
  const part = await getPartDetails(assemblyId)
  if (part) {
    // Add as part component, not unknown assembly
  } else {
    // Use resource file fallback
    // Then enhanced placeholder with suggestions
  }
}
```

## Files Modified 📝

1. **`lib/bomService.native.ts`**:
   - Fixed all database field name references
   - Added `getPartDetails()` function  
   - Enhanced fallback logic for Assembly vs Part detection
   - Added Part lookup before "unknown" fallback

2. **`lib/assemblyMapper.ts`** (new):
   - Resource file fallback system
   - Generic-to-specific ID mapping
   - Enhanced placeholder creation with suggestions

3. **`scripts/fix-unknown-parts-comprehensive.js`** (new):
   - Adds missing generic assembly records
   - Comprehensive database validation

4. **`scripts/test-unknown-parts-fix.js`** (new):
   - Tests all fix components
   - Validates Part vs Assembly distinctions

## Expected Results 🎯

### Before Fix:
```
BOM Items:
❌ Unknown Assembly: T-oa-ssshelf-1812
```

### After Fix:
```
BOM Items:
✅ T-OA-SSSHELF-1812: STAINLESS STEEL SLOT SHELF, 18"W X 12"D (Part)
```

## Verification Steps 🧪

1. **Run the test script**:
   ```bash
   cd "/media/selcuk/project files/Clean-stations"
   node scripts/test-unknown-parts-fix.js
   ```

2. **Run the comprehensive fix**:
   ```bash
   node scripts/fix-unknown-parts-comprehensive.js
   ```

3. **Test in application**:
   - Navigate to an order details page
   - Go to "Bill of Materials" tab
   - Look for `T-OA-SSSHELF-1812` - should show proper name
   - Check browser console - should see ✅ logs instead of ❌ errors

## Key Insights 💡

1. **The part name and number were always correct** - they existed in the database
2. **The issue was the BOM service looking in the wrong table** (Assembly vs Part)
3. **Database field naming conventions matter** - PascalCase vs camelCase
4. **Items can be Parts OR Assemblies** - the system needs to check both

## Related Items That Work Correctly ✅

- `ASSY-T-OA-SSSHELF-1812` → Assembly version (with components)
- `T-OA-SSSHELF-1812-BOLT-ON-KIT` → Kit version (orderable assembly)
- `T-OA-SSSHELF-1812-BOLT-ON` → Bolt-on part version

Your original observation was correct - the part name and number existed. The fix ensures the BOM service finds them in the correct database table!