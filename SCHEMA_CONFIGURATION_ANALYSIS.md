# Prisma Schema vs Configuration Implementation Analysis

## Executive Summary

After comparing the Prisma schema with the configuration data being collected and used throughout the codebase, I've identified several significant misalignments between what the UI collects, what the BOM service expects, and what can actually be stored in the database.

## Key Misalignments Found

### 1. Missing Configuration Storage Models

The schema is missing several key models needed to properly store sink configuration details:

#### A. SinkConfiguration Model
**Missing Fields in Database:**
- `sinkModelId` - References which sink model (T2-B1, T2-B2, T2-B3)
- `width` & `length` - Sink dimensions
- `legsTypeId` - Leg assembly ID
- `feetTypeId` - Feet assembly ID
- `pegboard` - Boolean for pegboard inclusion
- `pegboardTypeId` - Type of pegboard (PERFORATED/SOLID)
- `pegboardColorId` - Pegboard color selection
- `pegboardSizePartNumber` - Auto or custom pegboard size
- `workflowDirection` - LEFT_TO_RIGHT or RIGHT_TO_LEFT
- `hasDrawersAndCompartments` - Boolean for drawer inclusion
- `drawersAndCompartments` - Array of drawer/compartment IDs
- `controlBoxId` - Auto-selected control box assembly

**Current Storage:** These fields are only stored in the order creation Zustand store temporarily and partially mapped to existing models.

#### B. PegboardConfiguration Model
**Missing Table:** No dedicated table for pegboard configuration details
- Link to order/build
- Pegboard type (perforated/solid)
- Size (standard or custom dimensions)
- Color selection
- Custom part number generation

#### C. DrawerConfiguration Model
**Missing Table:** No storage for drawer/compartment selections
- Link to order/build  
- Selected drawer/compartment assemblies
- Quantities and placement

### 2. Incomplete Order Configuration Storage

#### Current Order Model Issues:
The Order model stores basic info but lacks comprehensive configuration details:

**Missing Links:**
- No direct relationship to sink configuration details
- No storage for pegboard selections
- No storage for drawer/compartment choices
- No storage for workflow direction
- No storage for control box selection

#### Current Basin/Faucet/Sprayer Models:
These models exist but have limitations:
- `BasinConfiguration` - Missing custom dimension storage
- `FaucetConfiguration` - Missing new array-based structure support
- `SprayerConfiguration` - Missing location/placement details

### 3. BOM Generation Data Gaps

#### Missing BOM Metadata Storage:
The BOM service generates complex hierarchical structures but the database cannot fully represent:

**BomItem Model Limitations:**
- No `partNumber` field (BOM service generates part numbers)
- No `level` field for hierarchy depth
- No `hasChildren` boolean
- No `isPart` distinguisher
- No `isCustom` flag for generated parts
- Missing `category` granularity for BOM organization

#### Custom Part Generation:
The BOM service generates custom parts (pegboards, basins) but these aren't properly stored:
- Custom pegboard parts: `720.215.002 T2-ADW-PB-[width]x[length]`
- Custom basin parts: `720.215.001 T2-ADW-BASIN-[width]x[length]x[depth]`

### 4. Configuration Validation Gaps

#### Missing Validation Models:
No database constraints for:
- Valid sink model + basin count combinations
- Control box auto-selection rules
- Pegboard size validation against sink dimensions
- Faucet placement restrictions

## Specific Field Mapping Issues

### Order Creation Store → Database Mapping:

| Store Field | Current DB Storage | Status | Missing Elements |
|-------------|-------------------|---------|------------------|
| `sinkModelId` | ❌ Not stored | Missing | Need SinkConfiguration table |
| `width`/`length` | ❌ Not stored | Missing | Need SinkConfiguration table |
| `legsTypeId` | ❌ Not stored | Missing | Need SinkConfiguration table |
| `feetTypeId` | ❌ Not stored | Missing | Need SinkConfiguration table |
| `pegboard` | ❌ Not stored | Missing | Need PegboardConfiguration table |
| `pegboardTypeId` | ❌ Not stored | Missing | Need PegboardConfiguration table |
| `pegboardColorId` | ❌ Not stored | Missing | Need PegboardConfiguration table |
| `workflowDirection` | ❌ Not stored | Missing | Need SinkConfiguration table |
| `drawersAndCompartments` | ❌ Not stored | Missing | Need DrawerConfiguration table |
| `controlBoxId` | ❌ Not stored | Missing | Need SinkConfiguration table |
| `basins` array | ✅ Partial | Limited | Missing custom dimensions |
| `faucets` array | ✅ Partial | Limited | Missing new structure |
| `sprayers` array | ✅ Partial | Limited | Missing location details |

### BOM Service → Database Mapping:

| BOM Field | Current DB Storage | Status | Issues |
|-----------|-------------------|---------|---------|
| `partNumber` | ❌ Not stored | Missing | Critical for manufacturing |
| `level` (hierarchy) | ❌ Not stored | Missing | BOM structure lost |
| `hasChildren` | ❌ Not stored | Missing | Tree navigation |
| `isCustom` | ✅ Stored as `isCustom` | ✅ Works | - |
| `category` | ✅ Stored | ✅ Works | Limited granularity |
| Custom parts | ❌ Lost | Critical | Auto-generated parts not saved |

## Impact Assessment

### High Impact Issues:
1. **Complete Configuration Loss**: Core sink configuration (dimensions, pegboard, etc.) is not persisted
2. **BOM Manufacturing Data**: Missing part numbers and hierarchy critical for production
3. **Custom Parts Generation**: Auto-generated custom parts are lost after order creation
4. **Audit Trail**: No way to track configuration changes or validate orders

### Medium Impact Issues:
1. **Limited Order Editing**: Cannot reconstruct configuration for order modifications
2. **Reporting Gaps**: Cannot analyze configurations or generate insights
3. **Integration Issues**: External systems cannot access full configuration data

### Low Impact Issues:
1. **UI Consistency**: Some configuration fields not validated against database constraints
2. **Performance**: Repeated BOM generation instead of caching results

## Recommendations

### 1. Add Missing Configuration Models (Critical)

```prisma
model SinkConfiguration {
  id                    String   @id @default(cuid())
  buildNumber           String
  sinkModelId           String
  width                 Int?
  length                Int?
  legsTypeId            String?
  feetTypeId            String?
  pegboard              Boolean  @default(false)
  pegboardTypeId        String?
  pegboardColorId       String?
  pegboardSizePartNumber String?
  workflowDirection     WorkflowDirection @default(LEFT_TO_RIGHT)
  controlBoxId          String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  orderId               String
  order                 Order    @relation(fields: [orderId], references: [id])
  pegboardConfig        PegboardConfiguration?
  drawerConfigs         DrawerConfiguration[]
  
  @@unique([orderId, buildNumber])
}

model PegboardConfiguration {
  id                    String   @id @default(cuid())
  sinkConfigId          String   @unique
  pegboardType          PegboardType
  standardSizeId        String?
  customWidth           Int?
  customLength          Int?
  colorId               String?
  autoGenerated         Boolean  @default(false)
  customPartNumber      String?
  
  sinkConfig            SinkConfiguration @relation(fields: [sinkConfigId], references: [id])
}

model DrawerConfiguration {
  id                    String   @id @default(cuid())
  sinkConfigId          String
  drawerAssemblyId      String
  quantity              Int      @default(1)
  placement             String?
  
  sinkConfig            SinkConfiguration @relation(fields: [sinkConfigId], references: [id])
}

enum WorkflowDirection {
  LEFT_TO_RIGHT
  RIGHT_TO_LEFT
}

enum PegboardType {
  PERFORATED
  SOLID
}
```

### 2. Enhance BOM Models (Critical)

```prisma
model BomItem {
  id                 String    @id @default(cuid())
  partIdOrAssemblyId String
  partNumber         String?   // Add part number field
  name               String
  quantity           Int
  itemType           String
  category           String?
  level              Int       @default(0)  // Add hierarchy level
  hasChildren        Boolean   @default(false)  // Add children indicator
  isPart             Boolean   @default(false)  // Distinguish parts from assemblies
  isCustom           Boolean   @default(false)
  customPartData     Json?     // Store custom part generation data
  parentId           String?
  bomId              String
  bom                Bom       @relation(fields: [bomId], references: [id])
  parent             BomItem?  @relation("ParentChildBomItem", fields: [parentId], references: [id])
  children           BomItem[] @relation("ParentChildBomItem")
  
  @@index([bomId, level])
  @@index([parentId])
}
```

### 3. Update Order API (High Priority)

Modify the order creation API to:
- Store complete sink configurations in new models
- Preserve BOM hierarchy and part numbers
- Handle custom part generation and storage
- Maintain configuration audit trail

### 4. Migration Strategy (Recommended)

1. **Phase 1**: Add new configuration models
2. **Phase 2**: Update order creation API to use new models
3. **Phase 3**: Enhance BOM models and storage
4. **Phase 4**: Update existing orders (if needed)
5. **Phase 5**: Add configuration editing capabilities

## Conclusion

The current schema-configuration misalignment represents a significant gap that prevents proper storage and retrieval of critical order configuration data. The missing models for sink configuration, pegboard details, and drawer selections mean that most configuration information is lost after order creation. This impacts manufacturing, order editing, reporting, and system integration capabilities.

Implementing the recommended schema changes would provide complete configuration persistence, proper BOM hierarchy storage, and full audit trail capabilities essential for a production system.