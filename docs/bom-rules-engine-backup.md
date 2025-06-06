# BOM Rules Engine - Technical Backup Documentation

## Critical System State: PRESERVE AT ALL COSTS

This document captures the exact state of the BOM rules engine as of 2025-06-04. Any modifications to the BOM system should reference this as the authoritative source.

## Core Files and Their Functions

### Primary BOM Service
**File**: `/src/services/bomService.js`
**Purpose**: Core BOM generation logic with business rules

### Debug Helper Interface
**File**: `/components/debug/BOMDebugHelper.tsx`
**Purpose**: Real-time BOM preview and validation

### API Integration
**Files**: 
- `/app/api/orders/preview-bom/route.ts`
- `/app/api/orders/route.ts`
- `/app/api/orders/[orderId]/route.ts`

## BOM Generation Rules Engine

### 1. Language-Based Manual Selection
```javascript
switch (customer.language) {
    case 'FR': manualKitId = 'T2-STD-MANUAL-FR-KIT'; break;
    case 'ES': manualKitId = 'T2-STD-MANUAL-SP-KIT'; break;
    default: manualKitId = 'T2-STD-MANUAL-EN-KIT';
}
```

### 2. Sink Body Assembly Selection (Length-Based)
```javascript
if (actualLength >= 48 && actualLength <= 60) sinkBodyAssemblyId = 'T2-BODY-48-60-HA';
else if (actualLength >= 61 && actualLength <= 72) sinkBodyAssemblyId = 'T2-BODY-61-72-HA';
else if (actualLength >= 73 && actualLength <= 120) sinkBodyAssemblyId = 'T2-BODY-73-120-HA';
```

### 3. Pegboard System Logic
**Mandatory Components**:
- Overhead light kit: `T2-OHL-MDRD-KIT` (always included when pegboard selected)
- Perforated kit: `T2-ADW-PB-PERF-KIT` (when perforated type)
- Solid kit: `T2-ADW-PB-SOLID-KIT` (when solid type)

**Color Selection**: Part `708.77 T-OA-PB-COLOR` with variants:
- Green, Black, Yellow, Grey, Red, Blue, Orange, White

**Size Selection by Length**:
```javascript
function getPegboardSizeByLength(sinkLength) {
    if (sinkLength >= 34 && sinkLength <= 47) return 'T2-ADW-PB-3436';
    if (sinkLength >= 48 && sinkLength <= 59) return 'T2-ADW-PB-4836';
    if (sinkLength >= 60 && sinkLength <= 71) return 'T2-ADW-PB-6036';
    if (sinkLength >= 72 && sinkLength <= 83) return 'T2-ADW-PB-7236';
    if (sinkLength >= 84 && sinkLength <= 95) return 'T2-ADW-PB-8436';
    if (sinkLength >= 96 && sinkLength <= 107) return 'T2-ADW-PB-9636';
    if (sinkLength >= 108 && sinkLength <= 119) return 'T2-ADW-PB-10836';
    if (sinkLength >= 120 && sinkLength <= 130) return 'T2-ADW-PB-12036';
}
```

### 4. Basin Configuration Rules

**Basin Type Mapping**:
```javascript
switch (basinTypeValue) {
    case 'E_SINK': kitAssemblyId = 'T2-BSN-ESK-KIT'; break;
    case 'E_SINK_DI': kitAssemblyId = 'T2-BSN-ESK-DI-KIT'; break;
    case 'E_DRAIN': kitAssemblyId = 'T2-BSN-EDR-KIT'; break;
}
```

**Basin Size Mapping**:
```javascript
const sizeMappings = {
    '20X20X8': 'T2-ADW-BASIN20X20X8',
    '24X20X8': 'T2-ADW-BASIN24X20X8',
    '24X20X10': 'T2-ADW-BASIN24X20X10',
    '30X20X8': 'T2-ADW-BASIN30X20X8',
    '30X20X10': 'T2-ADW-BASIN30X20X10'
};
```

**Custom Basin Logic**:
```javascript
if (basin.basinSizePartNumber === 'CUSTOM' && basin.customWidth && basin.customLength && basin.customDepth) {
    const customDimensions = `${basin.customWidth}X${basin.customLength}X${basin.customDepth}`;
    basinData.basinSizePartNumber = `720.215.001`;
    basinData.customPartNumber = `T2-ADW-BASIN-${customDimensions}`;
    basinData.customDimensions = customDimensions;
}
```

**Basin Add-ons**:
- P-Trap: `T2-OA-MS-1026` (706.65)
- Basin Light E-Drain: `T2-OA-BASIN-LIGHT-EDR-KIT` (706.67)
- Basin Light E-Sink: `T2-OA-BASIN-LIGHT-ESK-KIT` (706.68)

### 5. Control Box Auto-Selection Logic
```javascript
function determineControlBox(basins) {
    const eSinks = basins.filter(b => 
        b.basinTypeId === 'T2-BSN-ESK-KIT' || 
        b.basinTypeId === 'T2-BSN-ESK-DI-KIT'
    ).length;
    const eDrains = basins.filter(b => 
        b.basinTypeId === 'T2-BSN-EDR-KIT'
    ).length;

    if (eDrains === 1 && eSinks === 0) return 'T2-CTRL-EDR1';
    if (eDrains === 0 && eSinks === 1) return 'T2-CTRL-ESK1';
    if (eDrains === 1 && eSinks === 1) return 'T2-CTRL-EDR1-ESK1';
    if (eDrains === 2 && eSinks === 0) return 'T2-CTRL-EDR2';
    if (eDrains === 0 && eSinks === 2) return 'T2-CTRL-ESK2';
    if (eDrains === 3 && eSinks === 0) return 'T2-CTRL-EDR3';
    if (eDrains === 0 && eSinks === 3) return 'T2-CTRL-ESK3';
    if (eDrains === 1 && eSinks === 2) return 'T2-CTRL-EDR1-ESK2';
    if (eDrains === 2 && eSinks === 1) return 'T2-CTRL-EDR2-ESK1';
}
```

**Control Box Dynamic Components**:
```javascript
const baseComponents = [
    { partId: 'T2-RFK-BRD-MNT', quantity: 1 },
    { partId: 'T2-CTRL-RK3-SHELL', quantity: 1 },
    { partId: 'PW-105R3-06', quantity: 1 },
    { partId: 'LRS-100-24', quantity: 1 }
];
```

### 6. Faucet Auto-Selection
```javascript
const eSinkDICount = basins.filter(b => b.basinTypeId === 'T2-BSN-ESK-DI-KIT').length;
if (eSinkDICount > 0) {
    autoFaucets.push({
        faucetTypeId: 'T2-OA-DI-GOOSENECK-FAUCET-KIT', // 706.60
        quantity: eSinkDICount,
        placement: 'AUTO_SELECTED_FOR_DI'
    });
}
```

### 7. Faucet Part Numbers
- Wrist Blade: `T2-OA-STD-FAUCET-WB-KIT` (706.58)
- Pre-Rinse: `T2-OA-PRE-RINSE-FAUCET-KIT` (706.59)
- DI Gooseneck: `T2-OA-DI-GOOSENECK-FAUCET-KIT` (706.60)

### 8. Sprayer Part Numbers
- DI Water Gun Turret: `T2-OA-WATERGUN-TURRET-KIT` (706.61)
- DI Water Gun Rosette: `T2-OA-WATERGUN-ROSETTE-KIT` (706.62)
- Air Gun Turret: `T2-OA-AIRGUN-TURRET-KIT` (706.63)
- Air Gun Rosette: `T2-OA-AIRGUN-ROSETTE-KIT` (706.64)

## BOM Debug Helper Data Flow

### Input Structure
```typescript
interface BOMPreviewData {
    customerInfo: {
        language: 'EN' | 'FR' | 'ES';
        poNumber: string;
        customerName: string;
        salesPerson: string;
        wantDate: string;
    };
    sinkSelection: {
        sinkModelId: string;
        quantity: number;
        buildNumbers: string[];
    };
    configurations: Record<string, SinkConfiguration>;
    accessories: Record<string, AccessoryItem[]>;
}
```

### Output Structure
```typescript
interface BOMResult {
    hierarchical: BOMItem[];
    flattened: BOMItem[];
    totalItems: number;
    topLevelItems: number;
}
```

## Critical Validation Rules

### Basin Configuration Completeness
```javascript
function isConfigurationComplete(config) {
    if (!config.basins || config.basins.length === 0) return false;
    const allBasinsHaveTypes = config.basins.every(basin => 
        basin.basinTypeId || basin.basinType
    );
    if (!allBasinsHaveTypes) return false;
    
    const expectedBasinCount = getSinkModel(config.sinkModelId)?.basinCount || 1;
    if (config.basins.length < expectedBasinCount) return false;
    
    return true;
}
```

## Assembly Processing Rules

### Recursive Assembly Expansion
- Uses `processedAssemblies` Set to prevent infinite loops
- Maintains hierarchical structure: parent -> child -> grandchild
- Preserves quantity multiplication through hierarchy levels
- Handles both parts and sub-assemblies

### Part Number Generation
- Standard parts: Use existing `partId`
- Custom basins: `720.215.001` + `T2-ADW-BASIN-{W}X{L}X{D}`
- Custom pegboards: `720.215.002` + `T2-ADW-PB-{W}X{L}`

## Database Integration Points

### Required Tables
- `Assembly` (assemblyId, name, type, components)
- `Part` (partId, name, type)
- `AssemblyComponent` (assemblyId, childPartId, childAssemblyId, quantity)

### Key Assembly IDs
**System**: T2-STD-MANUAL-EN-KIT, T2-STD-MANUAL-FR-KIT, T2-STD-MANUAL-SP-KIT
**Bodies**: T2-BODY-48-60-HA, T2-BODY-61-72-HA, T2-BODY-73-120-HA
**Legs**: T2-DL27-KIT, T2-DL14-KIT, T2-LC1-KIT, T2-DL27-FH-KIT, T2-DL14-FH-KIT
**Feet**: T2-LEVELING-CASTOR-475, T2-SEISMIC-FEET

## Error Handling Patterns

### Missing Components
```javascript
if (!assembly) {
    bomList.push({
        id: assemblyId,
        name: `Unknown Assembly: ${assemblyId}`,
        quantity: quantity,
        category: category || 'UNKNOWN',
        type: 'UNKNOWN',
        isPlaceholder: true
    });
}
```

### Validation Failures
- API returns 400 with Zod validation errors
- BOM service logs warnings for missing mappings
- Debug helper shows incomplete configuration states

## Performance Optimizations

### Caching Strategy
- Uses Set-based loop prevention
- Minimal database queries through includes
- Hierarchical structure preserves parent-child relationships

### Memory Management
- Processes assemblies in controlled recursion
- Clears processed sets after expansion
- Uses efficient array operations for flattening

---

**CRITICAL NOTE**: This rules engine represents months of refinement based on real-world manufacturing requirements. Any changes should be thoroughly tested and validated against existing orders before deployment.

**Last Updated**: 2025-06-04
**System Version**: Production-ready state
**Status**: PRESERVE AND PROTECT