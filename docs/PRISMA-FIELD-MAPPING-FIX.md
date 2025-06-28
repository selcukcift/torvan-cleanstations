# Prisma Field Mapping Fix

## Issue Discovered

The error message shows that Prisma expects `assemblyId` (camelCase) but we were using `AssemblyID` (PascalCase):

```
Invalid `prisma.assembly.findUnique()` invocation:
Unknown argument `AssemblyID`. Did you mean `assemblyId`?
```

## Root Cause

The Prisma schema uses **@map** decorators to map between JavaScript field names and database column names:

```prisma
model Assembly {
  assemblyId  String  @id @unique @map("AssemblyID")  // JavaScript: assemblyId, Database: AssemblyID
  // ...
}

model Part {
  partId  String  @id @unique @map("PartID")  // JavaScript: partId, Database: PartID
  // ...
}
```

## The Correct Pattern

### ✅ In Prisma Queries (JavaScript/TypeScript)
```typescript
// Use camelCase field names
await prisma.assembly.findUnique({
  where: { assemblyId: 'T2-DL27-KIT' }  // ✅ Correct
})

await prisma.part.findUnique({
  where: { partId: 'T-OA-SSSHELF-1812' }  // ✅ Correct
})
```

### ❌ What NOT to do
```typescript
// Don't use database column names in Prisma queries
await prisma.assembly.findUnique({
  where: { AssemblyID: 'T2-DL27-KIT' }  // ❌ Wrong - causes error
})
```

### ✅ When Accessing Model Properties
```typescript
const assembly = await prisma.assembly.findUnique({ where: { assemblyId: id } })
console.log(assembly.assemblyId)  // ✅ Use camelCase property
console.log(assembly.name)        // ✅ Other properties work normally
```

## Files Fixed

1. **`lib/bomService.native.ts`**
   - Changed all `AssemblyID` to `assemblyId` in queries
   - Changed all `PartID` to `partId` in queries
   - Changed all property accesses to use camelCase

2. **`scripts/test-unknown-parts-fix.js`**
   - Updated all Prisma queries to use camelCase

3. **`scripts/fix-unknown-parts-comprehensive.js`**
   - Updated upsert queries to use camelCase

## Key Learning

**Prisma uses JavaScript naming conventions (camelCase) in your code, even if the database uses different naming (PascalCase).**

The `@map()` decorator handles the translation between:
- **Your Code**: `assemblyId` (what Prisma expects)
- **Database**: `AssemblyID` (actual column name)

Always check the Prisma schema field names (left side), not the @map values!