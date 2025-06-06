# Database Schema Design
## Torvan Medical CleanStation Production Workflow Digitalization

**Version:** 1.0  
**Date:** June 2, 2025  
**Document Type:** Database Schema Design  
**Database:** PostgreSQL 15+  
**ORM:** Prisma 5+

---

## 1. Schema Overview

### 1.1 Database Design Principles
- **Normalization:** Third Normal Form (3NF) with selective denormalization
- **Referential Integrity:** Foreign key constraints with cascade rules
- **Data Types:** Appropriate PostgreSQL data types for optimal performance
- **Indexing:** Strategic indexing for query optimization
- **Audit Trail:** Comprehensive tracking of data changes

### 1.2 Naming Conventions
- **Tables:** PascalCase (e.g., `ProductionOrder`)
- **Columns:** camelCase (e.g., `customerName`)
- **Indexes:** `idx_{table}_{column(s)}`
- **Foreign Keys:** `fk_{table}_{referenced_table}`
- **Constraints:** `chk_{table}_{constraint_name}`

### 1.3 Schema Structure
```
torvan_cleanstation/
├── Core Entities
│   ├── User Management
│   ├── Order Management
│   ├── Inventory Management
│   └── BOM Management
├── Workflow Entities
│   ├── Quality Control
│   ├── Assembly Tasks
│   ├── Work Instructions
│   └── Service Orders
└── Supporting Entities
    ├── File Management
    ├── Audit Logs
    └── System Configuration
```

## 2. Core Entity Tables

### 2.1 User Management

#### Table: `User`
```sql
CREATE TABLE "User" (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username           VARCHAR(50) UNIQUE NOT NULL,
    passwordHash       VARCHAR(255) NOT NULL,
    fullName          VARCHAR(100) NOT NULL,
    initials          VARCHAR(5) NOT NULL,
    role              UserRole NOT NULL,
    isActive          BOOLEAN DEFAULT true,
    lastLoginAt       TIMESTAMP,
    createdAt         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE UserRole AS ENUM (
    'PRODUCTION_COORDINATOR',
    'ADMIN', 
    'PROCUREMENT_SPECIALIST',
    'QC_PERSON',
    'ASSEMBLER',
    'SERVICE_DEPARTMENT'
);

-- Indexes
CREATE INDEX idx_user_username ON "User"(username);
CREATE INDEX idx_user_role ON "User"(role);
CREATE INDEX idx_user_active ON "User"(isActive);
```

#### Table: `UserSession`
```sql
CREATE TABLE "UserSession" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId          UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    token           VARCHAR(500) UNIQUE NOT NULL,
    expiresAt       TIMESTAMP NOT NULL,
    createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastUsedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_session_token ON "UserSession"(token);
CREATE INDEX idx_session_user ON "UserSession"(userId);
CREATE INDEX idx_session_expires ON "UserSession"(expiresAt);
```

### 2.2 Order Management

#### Table: `ProductionOrder`
```sql
CREATE TABLE "ProductionOrder" (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poNumber           VARCHAR(50) NOT NULL,
    buildNumber        VARCHAR(50) NOT NULL,
    customerName       VARCHAR(100) NOT NULL,
    projectName        VARCHAR(100),
    salesPerson        VARCHAR(100) NOT NULL,
    wantDate           DATE NOT NULL,
    orderLanguage      DocumentLanguage DEFAULT 'EN',
    notes              TEXT,
    
    -- Sink Configuration
    sinkFamily         SinkFamily NOT NULL,
    sinkModel          VARCHAR(20) NOT NULL,
    sinkWidth          INTEGER NOT NULL,
    sinkLength         INTEGER NOT NULL,
    legsType           LegsType NOT NULL,
    legsModel          VARCHAR(20) NOT NULL,
    feetType           FeetType NOT NULL,
    workflowDirection  WorkflowDirection NOT NULL,
    
    -- Pegboard Configuration
    hasPegboard        BOOLEAN DEFAULT false,
    pegboardColor      PegboardColor,
    pegboardType       PegboardType,
    pegboardSizeType   PegboardSizeType,
    pegboardWidth      INTEGER,
    pegboardLength     INTEGER,
    
    -- Order Status
    orderStatus        OrderStatus DEFAULT 'ORDER_CREATED',
    currentAssigneeId  UUID REFERENCES "User"(id),
    
    -- BOM Reference
    bomId              UUID,
    
    -- Timestamps
    createdAt          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT pk_production_order_build UNIQUE(poNumber, buildNumber),
    CONSTRAINT chk_sink_dimensions CHECK (sinkWidth > 0 AND sinkLength > 0),
    CONSTRAINT chk_want_date CHECK (wantDate >= CURRENT_DATE)
);

-- Enums
CREATE TYPE DocumentLanguage AS ENUM ('EN', 'FR', 'SP');
CREATE TYPE SinkFamily AS ENUM ('MDRD', 'ENDOSCOPE', 'INSTROSINK');
CREATE TYPE LegsType AS ENUM ('HEIGHT_ADJUSTABLE', 'FIXED_HEIGHT');
CREATE TYPE FeetType AS ENUM ('LOCK_LEVELING_CASTERS', 'SS_ADJUSTABLE_SEISMIC_FEET');
CREATE TYPE WorkflowDirection AS ENUM ('LEFT_TO_RIGHT', 'RIGHT_TO_LEFT');
CREATE TYPE PegboardColor AS ENUM ('GREEN', 'BLACK', 'YELLOW', 'GREY', 'RED', 'BLUE', 'ORANGE', 'WHITE');
CREATE TYPE PegboardType AS ENUM ('PERFORATED', 'SOLID');
CREATE TYPE PegboardSizeType AS ENUM ('SAME_AS_SINK', 'CUSTOM');
CREATE TYPE OrderStatus AS ENUM (
    'ORDER_CREATED',
    'PARTS_SENT', 
    'READY_FOR_PRE_QC',
    'READY_FOR_PRODUCTION',
    'TESTING_COMPLETE',
    'PACKAGING_COMPLETE',
    'READY_FOR_FINAL_QC',
    'READY_FOR_SHIP',
    'SHIPPED'
);

-- Indexes
CREATE INDEX idx_order_po_number ON "ProductionOrder"(poNumber);
CREATE INDEX idx_order_status ON "ProductionOrder"(orderStatus);
CREATE INDEX idx_order_customer ON "ProductionOrder"(customerName);
CREATE INDEX idx_order_want_date ON "ProductionOrder"(wantDate);
CREATE INDEX idx_order_assignee ON "ProductionOrder"(currentAssigneeId);
CREATE INDEX idx_order_created_at ON "ProductionOrder"(createdAt);
```

#### Table: `BasinConfiguration`
```sql
CREATE TABLE "BasinConfiguration" (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId              UUID NOT NULL REFERENCES "ProductionOrder"(id) ON DELETE CASCADE,
    basinIndex           INTEGER NOT NULL,
    basinType            BasinType NOT NULL,
    basinWidth           INTEGER NOT NULL,
    basinLength          INTEGER NOT NULL,
    basinDepth           INTEGER NOT NULL,
    isCustomSize         BOOLEAN DEFAULT false,
    hasPTrapDrain        BOOLEAN DEFAULT false,
    hasBasinLight        BOOLEAN DEFAULT false,
    
    -- QC Specific Fields
    drainLocation        VARCHAR(50),
    faucetLocation       VARCHAR(50),
    overflowSensorInstalled BOOLEAN DEFAULT false,
    
    createdAt            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT pk_basin_order_index UNIQUE(orderId, basinIndex),
    CONSTRAINT chk_basin_dimensions CHECK (basinWidth > 0 AND basinLength > 0 AND basinDepth > 0)
);

CREATE TYPE BasinType AS ENUM ('E_SINK', 'E_SINK_DI', 'E_DRAIN');

-- Indexes
CREATE INDEX idx_basin_order ON "BasinConfiguration"(orderId);
CREATE INDEX idx_basin_type ON "BasinConfiguration"(basinType);
```

#### Table: `FaucetConfiguration`
```sql
CREATE TABLE "FaucetConfiguration" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId         UUID NOT NULL REFERENCES "ProductionOrder"(id) ON DELETE CASCADE,
    faucetType      FaucetType NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    placement       FaucetPlacement NOT NULL,
    createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_faucet_quantity CHECK (quantity > 0 AND quantity <= 3)
);

CREATE TYPE FaucetType AS ENUM (
    'WRIST_BLADE_SWING_SPOUT',
    'PRE_RINSE_OVERHEAD_SPRAY', 
    'GOOSENECK_TREATED_WATER'
);
CREATE TYPE FaucetPlacement AS ENUM ('CENTER', 'BETWEEN_BASINS');

-- Indexes
CREATE INDEX idx_faucet_order ON "FaucetConfiguration"(orderId);
```

#### Table: `SprayerConfiguration`
```sql
CREATE TABLE "SprayerConfiguration" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId         UUID NOT NULL REFERENCES "ProductionOrder"(id) ON DELETE CASCADE,
    sprayerType     SprayerType NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    location        SprayerLocation NOT NULL,
    createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_sprayer_quantity CHECK (quantity IN (1, 2))
);

CREATE TYPE SprayerType AS ENUM (
    'DI_WATER_GUN_KIT_TURRET',
    'DI_WATER_GUN_KIT_ROSETTE',
    'AIR_GUN_KIT_TURRET', 
    'AIR_GUN_KIT_ROSETTE'
);
CREATE TYPE SprayerLocation AS ENUM ('LEFT_SIDE', 'RIGHT_SIDE');

-- Indexes
CREATE INDEX idx_sprayer_order ON "SprayerConfiguration"(orderId);
```

#### Table: `OrderAccessory`
```sql
CREATE TABLE "OrderAccessory" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId         UUID NOT NULL REFERENCES "ProductionOrder"(id) ON DELETE CASCADE,
    assemblyId      VARCHAR(50) NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_accessory_quantity CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX idx_accessory_order ON "OrderAccessory"(orderId);
CREATE INDEX idx_accessory_assembly ON "OrderAccessory"(assemblyId);
```

#### Table: `OrderStatusHistory`
```sql
CREATE TABLE "OrderStatusHistory" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId         UUID NOT NULL REFERENCES "ProductionOrder"(id) ON DELETE CASCADE,
    userId          UUID NOT NULL REFERENCES "User"(id),
    action          VARCHAR(100) NOT NULL,
    oldStatus       OrderStatus,
    newStatus       OrderStatus NOT NULL,
    notes           TEXT,
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_history_order ON "OrderStatusHistory"(orderId);
CREATE INDEX idx_history_timestamp ON "OrderStatusHistory"(timestamp);
CREATE INDEX idx_history_user ON "OrderStatusHistory"(userId);
```

### 2.3 Inventory Management

#### Table: `Part`
```sql
CREATE TABLE "Part" (
    id                      VARCHAR(50) PRIMARY KEY,
    name                   VARCHAR(200) NOT NULL,
    manufacturerPartNumber VARCHAR(100),
    manufacturerInfo       VARCHAR(200),
    type                   PartType NOT NULL,
    status                 EntityStatus DEFAULT 'ACTIVE',
    photoUrl               VARCHAR(500),
    technicalDrawingUrl    VARCHAR(500),
    description            TEXT,
    createdAt              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE PartType AS ENUM ('COMPONENT', 'MATERIAL');
CREATE TYPE EntityStatus AS ENUM ('ACTIVE', 'INACTIVE');

-- Indexes
CREATE INDEX idx_part_name ON "Part"(name);
CREATE INDEX idx_part_status ON "Part"(status);
CREATE INDEX idx_part_type ON "Part"(type);
CREATE INDEX idx_part_manufacturer ON "Part"(manufacturerPartNumber);
```

#### Table: `Assembly`
```sql
CREATE TABLE "Assembly" (
    id                   VARCHAR(50) PRIMARY KEY,
    name                VARCHAR(200) NOT NULL,
    type                AssemblyType NOT NULL,
    categoryCode        VARCHAR(20),
    subcategoryCode     VARCHAR(20),
    canOrder            BOOLEAN DEFAULT true,
    isKit               BOOLEAN DEFAULT false,
    status              EntityStatus DEFAULT 'ACTIVE',
    photoUrl            VARCHAR(500),
    technicalDrawingUrl VARCHAR(500),
    description         TEXT,
    qrData              VARCHAR(200),
    kitComponents       JSONB,
    workInstructionId   UUID,
    createdAt           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE AssemblyType AS ENUM ('SIMPLE', 'COMPLEX', 'SERVICE_PART', 'KIT');

-- Indexes
CREATE INDEX idx_assembly_name ON "Assembly"(name);
CREATE INDEX idx_assembly_type ON "Assembly"(type);
CREATE INDEX idx_assembly_status ON "Assembly"(status);
CREATE INDEX idx_assembly_category ON "Assembly"(categoryCode);
CREATE INDEX idx_assembly_subcategory ON "Assembly"(subcategoryCode);
CREATE INDEX idx_assembly_can_order ON "Assembly"(canOrder);
```

#### Table: `AssemblyComponent`
```sql
CREATE TABLE "AssemblyComponent" (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parentAssemblyId  VARCHAR(50) NOT NULL REFERENCES "Assembly"(id) ON DELETE CASCADE,
    childType         ComponentType NOT NULL,
    childId           VARCHAR(50) NOT NULL,
    quantity          INTEGER NOT NULL DEFAULT 1,
    notes             TEXT,
    sequenceOrder     INTEGER,
    createdAt         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_component_quantity CHECK (quantity > 0)
);

CREATE TYPE ComponentType AS ENUM ('PART', 'ASSEMBLY');

-- Indexes
CREATE INDEX idx_component_parent ON "AssemblyComponent"(parentAssemblyId);
CREATE INDEX idx_component_child ON "AssemblyComponent"(childId);
CREATE INDEX idx_component_sequence ON "AssemblyComponent"(sequenceOrder);
```

#### Table: `Category`
```sql
CREATE TABLE "Category" (
    id              VARCHAR(20) PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    description    TEXT,
    parentId       VARCHAR(20) REFERENCES "Category"(id),
    level          INTEGER NOT NULL DEFAULT 0,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_category_parent ON "Category"(parentId);
CREATE INDEX idx_category_level ON "Category"(level);
```

### 2.4 BOM Management

#### Table: `BillOfMaterials`
```sql
CREATE TABLE "BillOfMaterials" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId         UUID NOT NULL REFERENCES "ProductionOrder"(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL DEFAULT 1,
    generatedAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generatedBy     UUID NOT NULL REFERENCES "User"(id),
    status          BOMStatus DEFAULT 'DRAFT',
    notes           TEXT,
    
    CONSTRAINT uk_bom_order_version UNIQUE(orderId, version)
);

CREATE TYPE BOMStatus AS ENUM ('DRAFT', 'APPROVED', 'SUPERSEDED');

-- Indexes
CREATE INDEX idx_bom_order ON "BillOfMaterials"(orderId);
CREATE INDEX idx_bom_status ON "BillOfMaterials"(status);
CREATE INDEX idx_bom_generated_at ON "BillOfMaterials"(generatedAt);

-- Update ProductionOrder to reference BOM
ALTER TABLE "ProductionOrder" 
ADD CONSTRAINT fk_order_bom 
FOREIGN KEY (bomId) REFERENCES "BillOfMaterials"(id);
```

#### Table: `BOMItem`
```sql
CREATE TABLE "BOMItem" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bomId           UUID NOT NULL REFERENCES "BillOfMaterials"(id) ON DELETE CASCADE,
    itemType        ComponentType NOT NULL,
    itemId          VARCHAR(50) NOT NULL,
    parentItemId    UUID REFERENCES "BOMItem"(id),
    quantity        DECIMAL(10,3) NOT NULL,
    level           INTEGER NOT NULL DEFAULT 0,
    sequenceOrder   INTEGER,
    notes           TEXT,
    isCustomPart    BOOLEAN DEFAULT false,
    customPartSpec  JSONB,
    
    CONSTRAINT chk_bom_quantity CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX idx_bom_item_bom ON "BOMItem"(bomId);
CREATE INDEX idx_bom_item_parent ON "BOMItem"(parentItemId);
CREATE INDEX idx_bom_item_level ON "BOMItem"(level);
CREATE INDEX idx_bom_item_sequence ON "BOMItem"(sequenceOrder);
CREATE INDEX idx_bom_item_type_id ON "BOMItem"(itemType, itemId);
```

## 3. Workflow Entity Tables

### 3.1 Quality Control

#### Table: `QCFormTemplate`
```sql
CREATE TABLE "QCFormTemplate" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formName        VARCHAR(100) NOT NULL,
    formType        QCFormType NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    description     TEXT,
    isActive        BOOLEAN DEFAULT true,
    createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_qc_template_name_version UNIQUE(formName, version)
);

CREATE TYPE QCFormType AS ENUM ('PRE_QC', 'FINAL_QC', 'IN_PROCESS');

-- Indexes
CREATE INDEX idx_qc_template_type ON "QCFormTemplate"(formType);
CREATE INDEX idx_qc_template_active ON "QCFormTemplate"(isActive);
```

#### Table: `QCChecklistItem`
```sql
CREATE TABLE "QCChecklistItem" (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    templateId          UUID NOT NULL REFERENCES "QCFormTemplate"(id) ON DELETE CASCADE,
    section            VARCHAR(100) NOT NULL,
    itemDescription    TEXT NOT NULL,
    checkType          QCCheckType NOT NULL,
    isBasinSpecific    BOOLEAN DEFAULT false,
    isRequired         BOOLEAN DEFAULT true,
    defaultValue       VARCHAR(100),
    notesPrompt        BOOLEAN DEFAULT false,
    sequenceOrder      INTEGER NOT NULL,
    
    CONSTRAINT uk_qc_item_template_sequence UNIQUE(templateId, sequenceOrder)
);

CREATE TYPE QCCheckType AS ENUM ('BOOLEAN', 'TEXT', 'MEASUREMENT', 'N_A_OPTION', 'MULTI_CHOICE');

-- Indexes
CREATE INDEX idx_qc_item_template ON "QCChecklistItem"(templateId);
CREATE INDEX idx_qc_item_section ON "QCChecklistItem"(section);
CREATE INDEX idx_qc_item_sequence ON "QCChecklistItem"(sequenceOrder);
```

#### Table: `QCResult`
```sql
CREATE TABLE "QCResult" (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId            UUID NOT NULL REFERENCES "ProductionOrder"(id) ON DELETE CASCADE,
    buildNumber        VARCHAR(50) NOT NULL,
    templateId         UUID NOT NULL REFERENCES "QCFormTemplate"(id),
    qcTypePerformed    QCFormType NOT NULL,
    performedBy        UUID NOT NULL REFERENCES "User"(id),
    jobId              VARCHAR(50),
    numberOfBasins     INTEGER,
    overallStatus      QCResultStatus NOT NULL,
    digitalSignature   VARCHAR(200) NOT NULL,
    timestamp          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes              TEXT
);

CREATE TYPE QCResultStatus AS ENUM ('PASS', 'FAIL', 'INCOMPLETE');

-- Indexes
CREATE INDEX idx_qc_result_order ON "QCResult"(orderId);
CREATE INDEX idx_qc_result_template ON "QCResult"(templateId);
CREATE INDEX idx_qc_result_performer ON "QCResult"(performedBy);
CREATE INDEX idx_qc_result_status ON "QCResult"(overallStatus);
CREATE INDEX idx_qc_result_timestamp ON "QCResult"(timestamp);
```

#### Table: `QCItemResult`
```sql
CREATE TABLE "QCItemResult" (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qcResultId         UUID NOT NULL REFERENCES "QCResult"(id) ON DELETE CASCADE,
    checklistItemId    UUID NOT NULL REFERENCES "QCChecklistItem"(id),
    resultValue        TEXT,
    isNA               BOOLEAN DEFAULT false,
    notes              TEXT,
    basinIndex         INTEGER,
    
    CONSTRAINT uk_qc_item_result UNIQUE(qcResultId, checklistItemId, basinIndex)
);

-- Indexes
CREATE INDEX idx_qc_item_result_qc ON "QCItemResult"(qcResultId);
CREATE INDEX idx_qc_item_result_item ON "QCItemResult"(checklistItemId);
```

### 3.2 Assembly Tasks & Work Instructions

#### Table: `WorkInstruction`
```sql
CREATE TABLE "WorkInstruction" (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                  VARCHAR(200) NOT NULL,
    description            TEXT,
    associatedAssemblyId   VARCHAR(50) REFERENCES "Assembly"(id),
    isGeneric              BOOLEAN DEFAULT false,
    version                INTEGER NOT NULL DEFAULT 1,
    isActive               BOOLEAN DEFAULT true,
    createdAt              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update Assembly to reference WorkInstruction
ALTER TABLE "Assembly" 
ADD CONSTRAINT fk_assembly_work_instruction 
FOREIGN KEY (workInstructionId) REFERENCES "WorkInstruction"(id);

-- Indexes
CREATE INDEX idx_work_instruction_assembly ON "WorkInstruction"(associatedAssemblyId);
CREATE INDEX idx_work_instruction_active ON "WorkInstruction"(isActive);
```

#### Table: `WorkInstructionStep`
```sql
CREATE TABLE "WorkInstructionStep" (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workInstructionId   UUID NOT NULL REFERENCES "WorkInstruction"(id) ON DELETE CASCADE,
    stepNumber         INTEGER NOT NULL,
    description        TEXT NOT NULL,
    visualUrl          VARCHAR(500),
    safetyNotes        TEXT,
    estimatedTime      INTEGER, -- in minutes
    
    CONSTRAINT uk_step_instruction_number UNIQUE(workInstructionId, stepNumber),
    CONSTRAINT chk_step_number CHECK (stepNumber > 0)
);

-- Indexes
CREATE INDEX idx_step_instruction ON "WorkInstructionStep"(workInstructionId);
CREATE INDEX idx_step_number ON "WorkInstructionStep"(stepNumber);
```

#### Table: `Tool`
```sql
CREATE TABLE "Tool" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100) NOT NULL,
    description    TEXT,
    imageUrl       VARCHAR(500),
    category       VARCHAR(50),
    isActive       BOOLEAN DEFAULT true,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tool_name ON "Tool"(name);
CREATE INDEX idx_tool_category ON "Tool"(category);
CREATE INDEX idx_tool_active ON "Tool"(isActive);
```

#### Table: `TaskList`
```sql
CREATE TABLE "TaskList" (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId            UUID NOT NULL REFERENCES "ProductionOrder"(id) ON DELETE CASCADE,
    assemblyType       VARCHAR(50) NOT NULL,
    generatedAt        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    isActive           BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_task_list_order ON "TaskList"(orderId);
CREATE INDEX idx_task_list_assembly_type ON "TaskList"(assemblyType);
```

#### Table: `Task`
```sql
CREATE TABLE "Task" (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taskListId                 UUID NOT NULL REFERENCES "TaskList"(id) ON DELETE CASCADE,
    sequenceOrder              INTEGER NOT NULL,
    description                TEXT NOT NULL,
    workInstructionId          UUID REFERENCES "WorkInstruction"(id),
    productionChecklistItemId  UUID REFERENCES "QCChecklistItem"(id),
    estimatedTime              INTEGER, -- in minutes
    isCompleted                BOOLEAN DEFAULT false,
    completedAt                TIMESTAMP,
    completedBy                UUID REFERENCES "User"(id),
    notes                      TEXT,
    
    CONSTRAINT uk_task_sequence UNIQUE(taskListId, sequenceOrder),
    CONSTRAINT chk_task_sequence CHECK (sequenceOrder > 0)
);

-- Indexes
CREATE INDEX idx_task_list ON "Task"(taskListId);
CREATE INDEX idx_task_sequence ON "Task"(sequenceOrder);
CREATE INDEX idx_task_completed ON "Task"(isCompleted);
CREATE INDEX idx_task_work_instruction ON "Task"(workInstructionId);
```

#### Table: `TaskTool`
```sql
CREATE TABLE "TaskTool" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taskId      UUID NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
    toolId      UUID NOT NULL REFERENCES "Tool"(id),
    isRequired  BOOLEAN DEFAULT true,
    
    CONSTRAINT uk_task_tool UNIQUE(taskId, toolId)
);

-- Indexes
CREATE INDEX idx_task_tool_task ON "TaskTool"(taskId);
CREATE INDEX idx_task_tool_tool ON "TaskTool"(toolId);
```

#### Table: `TaskPart`
```sql
CREATE TABLE "TaskPart" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taskId      UUID NOT NULL REFERENCES "Task"(id) ON DELETE CASCADE,
    partType    ComponentType NOT NULL,
    partId      VARCHAR(50) NOT NULL,
    quantity    DECIMAL(10,3) NOT NULL,
    
    CONSTRAINT uk_task_part UNIQUE(taskId, partType, partId),
    CONSTRAINT chk_task_part_quantity CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX idx_task_part_task ON "TaskPart"(taskId);
CREATE INDEX idx_task_part_part ON "TaskPart"(partType, partId);
```

### 3.3 Testing & Packaging

#### Table: `TestingForm`
```sql
CREATE TABLE "TestingForm" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId         UUID NOT NULL REFERENCES "ProductionOrder"(id) ON DELETE CASCADE,
    performedBy     UUID NOT NULL REFERENCES "User"(id),
    overallStatus   TestingStatus NOT NULL,
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT
);

CREATE TYPE TestingStatus AS ENUM ('PASS', 'FAIL', 'INCOMPLETE');

-- Indexes
CREATE INDEX idx_testing_order ON "TestingForm"(orderId);
CREATE INDEX idx_testing_performer ON "TestingForm"(performedBy);
CREATE INDEX idx_testing_status ON "TestingForm"(overallStatus);
```

#### Table: `TestResult`
```sql
CREATE TABLE "TestResult" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    testingFormId   UUID NOT NULL REFERENCES "TestingForm"(id) ON DELETE CASCADE,
    testName        VARCHAR(100) NOT NULL,
    testType        TestType NOT NULL,
    result          TestResultStatus NOT NULL,
    measurements    TEXT,
    notes           TEXT,
    sequenceOrder   INTEGER
);

CREATE TYPE TestType AS ENUM ('FUNCTIONAL', 'SAFETY', 'PERFORMANCE', 'VISUAL');
CREATE TYPE TestResultStatus AS ENUM ('PASS', 'FAIL', 'N_A');

-- Indexes
CREATE INDEX idx_test_result_form ON "TestResult"(testingFormId);
CREATE INDEX idx_test_result_type ON "TestResult"(testType);
CREATE INDEX idx_test_result_status ON "TestResult"(result);
```

#### Table: `PackagingChecklist`
```sql
CREATE TABLE "PackagingChecklist" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId         UUID NOT NULL REFERENCES "ProductionOrder"(id) ON DELETE CASCADE,
    performedBy     UUID NOT NULL REFERENCES "User"(id),
    isCompleted     BOOLEAN DEFAULT false,
    completedAt     TIMESTAMP,
    notes           TEXT
);

-- Indexes
CREATE INDEX idx_packaging_order ON "PackagingChecklist"(orderId);
CREATE INDEX idx_packaging_performer ON "PackagingChecklist"(performedBy);
```

#### Table: `PackagingItem`
```sql
CREATE TABLE "PackagingItem" (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    packagingChecklistId UUID NOT NULL REFERENCES "PackagingChecklist"(id) ON DELETE CASCADE,
    itemType           ComponentType NOT NULL,
    itemId             VARCHAR(50) NOT NULL,
    requiredQuantity   INTEGER NOT NULL,
    packedQuantity     INTEGER DEFAULT 0,
    isComplete         BOOLEAN DEFAULT false,
    notes              TEXT,
    
    CONSTRAINT chk_packaging_quantities CHECK (
        packedQuantity >= 0 AND 
        packedQuantity <= requiredQuantity
    )
);

-- Indexes
CREATE INDEX idx_packaging_item_checklist ON "PackagingItem"(packagingChecklistId);
CREATE INDEX idx_packaging_item_complete ON "PackagingItem"(isComplete);
```

### 3.4 Service Orders

#### Table: `ServiceOrder`
```sql
CREATE TABLE "ServiceOrder" (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requestedBy         UUID NOT NULL REFERENCES "User"(id),
    status              ServiceOrderStatus DEFAULT 'PENDING',
    requestTimestamp    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processedBy         UUID REFERENCES "User"(id),
    processedTimestamp  TIMESTAMP,
    notes               TEXT,
    internalNotes       TEXT
);

CREATE TYPE ServiceOrderStatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- Indexes
CREATE INDEX idx_service_order_requester ON "ServiceOrder"(requestedBy);
CREATE INDEX idx_service_order_status ON "ServiceOrder"(status);
CREATE INDEX idx_service_order_timestamp ON "ServiceOrder"(requestTimestamp);
```

#### Table: `ServiceOrderItem`
```sql
CREATE TABLE "ServiceOrderItem" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serviceOrderId  UUID NOT NULL REFERENCES "ServiceOrder"(id) ON DELETE CASCADE,
    partType        ComponentType NOT NULL,
    partId          VARCHAR(50) NOT NULL,
    quantity        INTEGER NOT NULL,
    
    CONSTRAINT chk_service_item_quantity CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX idx_service_item_order ON "ServiceOrderItem"(serviceOrderId);
CREATE INDEX idx_service_item_part ON "ServiceOrderItem"(partType, partId);
```

## 4. Supporting Entity Tables

### 4.1 File Management

#### Table: `Document`
```sql
CREATE TABLE "Document" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fileName        VARCHAR(255) NOT NULL,
    originalName    VARCHAR(255) NOT NULL,
    fileUrl         VARCHAR(500) NOT NULL,
    contentType     VARCHAR(100) NOT NULL,
    fileSize        BIGINT NOT NULL,
    uploadedBy      UUID NOT NULL REFERENCES "User"(id),
    uploadedAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    isActive        BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_document_uploader ON "Document"(uploadedBy);
CREATE INDEX idx_document_uploaded_at ON "Document"(uploadedAt);
CREATE INDEX idx_document_active ON "Document"(isActive);
```

#### Table: `OrderDocument`
```sql
CREATE TABLE "OrderDocument" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId         UUID NOT NULL REFERENCES "ProductionOrder"(id) ON DELETE CASCADE,
    documentId      UUID NOT NULL REFERENCES "Document"(id) ON DELETE CASCADE,
    documentType    OrderDocumentType NOT NULL,
    associatedAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_order_document UNIQUE(orderId, documentId)
);

CREATE TYPE OrderDocumentType AS ENUM (
    'PO_DOCUMENT',
    'TECHNICAL_DRAWING', 
    'ORDER_CONFIRMATION',
    'QC_FORM',
    'TEST_RESULT',
    'PHOTO',
    'OTHER'
);

-- Indexes
CREATE INDEX idx_order_doc_order ON "OrderDocument"(orderId);
CREATE INDEX idx_order_doc_document ON "OrderDocument"(documentId);
CREATE INDEX idx_order_doc_type ON "OrderDocument"(documentType);
```

### 4.2 Audit & Logging

#### Table: `AuditLog`
```sql
CREATE TABLE "AuditLog" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId          UUID REFERENCES "User"(id),
    action          VARCHAR(100) NOT NULL,
    entityType      VARCHAR(50) NOT NULL,
    entityId        VARCHAR(100) NOT NULL,
    oldValues       JSONB,
    newValues       JSONB,
    ipAddress       INET,
    userAgent       TEXT,
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_user ON "AuditLog"(userId);
CREATE INDEX idx_audit_entity ON "AuditLog"(entityType, entityId);
CREATE INDEX idx_audit_timestamp ON "AuditLog"(timestamp);
CREATE INDEX idx_audit_action ON "AuditLog"(action);
```

#### Table: `SystemNotification`
```sql
CREATE TABLE "SystemNotification" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId          UUID NOT NULL REFERENCES "User"(id),
    title           VARCHAR(200) NOT NULL,
    message         TEXT NOT NULL,
    type            NotificationType NOT NULL,
    isRead          BOOLEAN DEFAULT false,
    relatedEntityType VARCHAR(50),
    relatedEntityId VARCHAR(100),
    createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    readAt          TIMESTAMP
);

CREATE TYPE NotificationType AS ENUM (
    'ORDER_STATUS_CHANGE',
    'TASK_ASSIGNMENT',
    'QC_REQUIRED',
    'SYSTEM_UPDATE',
    'ERROR',
    'INFO'
);

-- Indexes
CREATE INDEX idx_notification_user ON "SystemNotification"(userId);
CREATE INDEX idx_notification_read ON "SystemNotification"(isRead);
CREATE INDEX idx_notification_type ON "SystemNotification"(type);
CREATE INDEX idx_notification_created ON "SystemNotification"(createdAt);
```

### 4.3 System Configuration

#### Table: `SystemSetting`
```sql
CREATE TABLE "SystemSetting" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settingKey      VARCHAR(100) UNIQUE NOT NULL,
    settingValue    TEXT NOT NULL,
    description     TEXT,
    dataType        SettingDataType NOT NULL,
    isEditable      BOOLEAN DEFAULT true,
    updatedBy       UUID REFERENCES "User"(id),
    updatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE SettingDataType AS ENUM ('STRING', 'INTEGER', 'BOOLEAN', 'JSON');

-- Indexes
CREATE INDEX idx_setting_key ON "SystemSetting"(settingKey);
CREATE INDEX idx_setting_editable ON "SystemSetting"(isEditable);
```

## 5. Database Triggers & Functions

### 5.1 Audit Trigger Function
```sql
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO "AuditLog" (
            userId, action, entityType, entityId, 
            oldValues, newValues, timestamp
        ) VALUES (
            CURRENT_SETTING('app.current_user_id')::UUID,
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id::TEXT,
            row_to_json(OLD),
            row_to_json(NEW),
            CURRENT_TIMESTAMP
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO "AuditLog" (
            userId, action, entityType, entityId,
            newValues, timestamp
        ) VALUES (
            CURRENT_SETTING('app.current_user_id')::UUID,
            'INSERT',
            TG_TABLE_NAME,
            NEW.id::TEXT,
            row_to_json(NEW),
            CURRENT_TIMESTAMP
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO "AuditLog" (
            userId, action, entityType, entityId,
            oldValues, timestamp
        ) VALUES (
            CURRENT_SETTING('app.current_user_id')::UUID,
            'DELETE',
            TG_TABLE_NAME,
            OLD.id::TEXT,
            row_to_json(OLD),
            CURRENT_TIMESTAMP
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Updated Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_user_timestamp
    BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_order_timestamp
    BEFORE UPDATE ON "ProductionOrder"
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Add similar triggers for other tables with updatedAt columns
```

### 5.3 Order Status Change Notification Trigger
```sql
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.orderStatus IS DISTINCT FROM NEW.orderStatus THEN
        -- Insert notification for relevant users based on new status
        INSERT INTO "SystemNotification" (
            userId, title, message, type, 
            relatedEntityType, relatedEntityId
        )
        SELECT 
            u.id,
            'Order Status Updated',
            'Order ' || NEW.poNumber || '-' || NEW.buildNumber || 
            ' status changed to ' || NEW.orderStatus,
            'ORDER_STATUS_CHANGE',
            'ProductionOrder',
            NEW.id::TEXT
        FROM "User" u
        WHERE u.role = CASE 
            WHEN NEW.orderStatus = 'READY_FOR_PRE_QC' THEN 'QC_PERSON'
            WHEN NEW.orderStatus = 'READY_FOR_PRODUCTION' THEN 'ASSEMBLER'
            WHEN NEW.orderStatus = 'READY_FOR_FINAL_QC' THEN 'QC_PERSON'
            WHEN NEW.orderStatus = 'PARTS_SENT' THEN 'PROCUREMENT_SPECIALIST'
            ELSE 'PRODUCTION_COORDINATOR'
        END
        AND u.isActive = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_notification
    AFTER UPDATE ON "ProductionOrder"
    FOR EACH ROW EXECUTE FUNCTION notify_order_status_change();
```

## 6. Indexes & Performance Optimization

### 6.1 Composite Indexes
```sql
-- Order management composite indexes
CREATE INDEX idx_order_status_date ON "ProductionOrder"(orderStatus, wantDate);
CREATE INDEX idx_order_customer_status ON "ProductionOrder"(customerName, orderStatus);
CREATE INDEX idx_order_assignee_status ON "ProductionOrder"(currentAssigneeId, orderStatus);

-- BOM performance indexes
CREATE INDEX idx_bom_item_hierarchy ON "BOMItem"(bomId, level, parentItemId);
CREATE INDEX idx_bom_item_type_parent ON "BOMItem"(itemType, itemId, parentItemId);

-- QC performance indexes
CREATE INDEX idx_qc_result_order_type ON "QCResult"(orderId, qcTypePerformed);
CREATE INDEX idx_qc_item_result_composite ON "QCItemResult"(qcResultId, checklistItemId);

-- Task management indexes
CREATE INDEX idx_task_order_completion ON "Task"(taskListId, isCompleted, sequenceOrder);

-- Audit and search indexes
CREATE INDEX idx_audit_entity_timestamp ON "AuditLog"(entityType, entityId, timestamp DESC);
CREATE INDEX idx_notification_user_unread ON "SystemNotification"(userId, isRead, createdAt DESC);
```

### 6.2 Partial Indexes
```sql
-- Index only active records
CREATE INDEX idx_user_active_username ON "User"(username) WHERE isActive = true;
CREATE INDEX idx_assembly_active_type ON "Assembly"(type) WHERE status = 'ACTIVE';
CREATE INDEX idx_part_active_name ON "Part"(name) WHERE status = 'ACTIVE';

-- Index only unread notifications
CREATE INDEX idx_notification_unread ON "SystemNotification"(userId, createdAt DESC) 
WHERE isRead = false;

-- Index only pending service orders
CREATE INDEX idx_service_order_pending ON "ServiceOrder"(requestTimestamp DESC) 
WHERE status = 'PENDING';
```

## 7. Data Integrity Constraints

### 7.1 Check Constraints
```sql
-- Order validation constraints
ALTER TABLE "ProductionOrder" 
ADD CONSTRAINT chk_order_want_date_future 
CHECK (wantDate >= CURRENT_DATE);

-- Basin configuration constraints
ALTER TABLE "BasinConfiguration"
ADD CONSTRAINT chk_basin_index_positive 
CHECK (basinIndex > 0);

-- Quantity constraints
ALTER TABLE "BOMItem"
ADD CONSTRAINT chk_bom_quantity_positive 
CHECK (quantity > 0);

ALTER TABLE "TaskPart"
ADD CONSTRAINT chk_task_part_quantity_positive 
CHECK (quantity > 0);
```

### 7.2 Domain Constraints
```sql
-- Email validation for notifications
ALTER TABLE "SystemNotification"
ADD CONSTRAINT chk_notification_entity_consistency
CHECK (
    (relatedEntityType IS NULL AND relatedEntityId IS NULL) OR
    (relatedEntityType IS NOT NULL AND relatedEntityId IS NOT NULL)
);

-- Pegboard configuration consistency
ALTER TABLE "ProductionOrder"
ADD CONSTRAINT chk_pegboard_configuration
CHECK (
    (hasPegboard = false) OR
    (hasPegboard = true AND pegboardColor IS NOT NULL AND pegboardType IS NOT NULL)
);
```

## 8. Database Maintenance

### 8.1 Cleanup Procedures
```sql
-- Clean up old audit logs (keep 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM "AuditLog" 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Clean up read notifications (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM "SystemNotification" 
    WHERE isRead = true 
    AND readAt < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

### 8.2 Backup Considerations
- **Point-in-time Recovery:** Enable WAL archiving
- **Daily Backups:** Automated daily full backups
- **Transaction Log Backups:** Continuous transaction log backup
- **Cross-region Replication:** For disaster recovery

---

*This database schema design provides a robust foundation for the Torvan Medical CleanStation Production Workflow system, ensuring data integrity, performance, and scalability while supporting all required business processes.*