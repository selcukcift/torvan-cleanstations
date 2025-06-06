# Legacy JavaScript Files Analysis

## Overview
This document analyzes the legacy JavaScript files (app.js, sink-config.js, accessories.js, bom-generator.js) and index.html to determine if any client-side logic within them is still essential for the Next.js application's functionality.

## Analysis Summary

### 1. index.html
**Original Purpose**: Static HTML structure for the legacy sink configurator application with basic page layout and script imports.

**Current Status**: **Fully Superseded**
- The entire HTML structure has been replaced by React components and Next.js pages
- All UI elements are now handled by React components with proper state management
- No specific functions or logic from this file are still needed

**Recommendation**: **Safe to remove**

### 2. app.js
**Original Purpose**: Main application controller handling:
- Global state management (orderData object)
- Step navigation and progress tracking
- Form validation and data persistence
- UI initialization and event handlers

**Current Status**: **Fully Superseded**
- State management replaced by Zustand stores (orderCreateStore.ts, authStore.ts)
- Navigation handled by React Router and component state
- Form validation implemented with react-hook-form and Zod schemas
- Event handlers integrated into React components

**Unmigrated Features**: None identified

**Recommendation**: **Safe to remove**

### 3. sink-config.js
**Original Purpose**: Step 3 sink configuration logic including:
- Sink and faucet selection UI
- Material and configuration validation
- Auto-selection logic for compatible components
- Dynamic pricing calculations

**Current Status**: **Mostly Superseded**
- UI and selection logic replaced by ConfigurationStep.tsx
- Validation rules implemented in React component
- Material compatibility checks preserved in new implementation

**Unmigrated Features**:
- Auto-selection of DI faucet when DI basin is selected (lines 45-49 in sink-config.js)
  ```javascript
  if (selectedSink === 'E_SINK_DI' && !selectedFaucet) {
    document.getElementById('GOOSENECK_DI').checked = true;
    selectedFaucet = 'GOOSENECK_DI';
  }
  ```

**Recommendation**: **Safe to remove after** implementing the DI auto-selection feature in ConfigurationStep.tsx

### 4. accessories.js
**Original Purpose**: Step 4 accessories selection handling:
- Dynamic accessory options display
- Quantity management
- Price calculations
- Accessory validation

**Current Status**: **Fully Superseded**
- All functionality replaced and enhanced in AccessoriesStep.tsx
- Backend service (accessoriesService.js) provides data and business logic
- Improved UI with better categorization and search

**Unmigrated Features**: None identified

**Recommendation**: **Safe to remove**

### 5. bom-generator.js
**Original Purpose**: BOM (Bill of Materials) generation and display:
- Generate hierarchical BOM structure
- Display BOM with component tree
- CSV export functionality
- Navigation to edit configuration

**Current Status**: **Partially Superseded**
- BOM generation logic successfully moved to backend (bomService.js)
- File explicitly states: "Removed: generateBOM, ... These are now handled by the backend bomService.js"

**Unmigrated Features**:
- BOM display UI with nested component tree visualization
- CSV export functionality
- Edit configuration navigation from BOM review

**Recommendation**: **Safe to remove after** implementing BOM display and CSV export in ReviewStep.tsx

## Conclusion

### Immediate Actions (Can Remove Now):
1. **index.html** - Completely replaced by Next.js pages
2. **app.js** - All functionality migrated to React/Zustand
3. **accessories.js** - Fully replaced by React components

### Conditional Actions (Remove After Feature Implementation):
1. **sink-config.js** - Add DI auto-selection to ConfigurationStep.tsx first
2. **bom-generator.js** - Implement BOM display and CSV export in ReviewStep.tsx first

### Migration Gaps to Address:
1. **ConfigurationStep.tsx**: Add auto-selection of GOOSENECK_DI faucet when E_SINK_DI basin is selected
2. **ReviewStep.tsx**: 
   - Add BOM display with hierarchical component tree
   - Implement CSV export functionality
   - Add "Edit Configuration" navigation option

### Verification Steps:
1. Search codebase for any remaining references to these files
2. Test all order creation workflows after removal
3. Ensure no build or runtime errors occur
4. Verify all functionality is preserved in the React implementation