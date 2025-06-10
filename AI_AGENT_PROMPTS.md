# Highly Detailed Prompt Sequence Document

## Overall Introduction

This document outlines a sequence of highly detailed subtasks designed to guide an AI agent in developing and refining a complex manufacturing Enterprise Resource Planning (ERP) / Manufacturing Execution System (MES) application. The sequence is broken down into distinct phases: Schema Definition, Backend Logic Implementation, User Interface Development, and Testing. Each subtask prompt provides a specific objective, detailed steps, and expected outcomes. The AI agent will use a suite of specialized tools to interact with the codebase, including file system operations, code modification tools, and testing utilities. This structured approach aims to build out the application incrementally, ensuring that each component is well-defined, correctly implemented, and thoroughly tested. The ultimate goal is to create a robust and functional application that meets the specified requirements, starting from initial data modeling all the way to UI interactions and comprehensive testing coverage.

## Phase 1: Schema Definition and Refinement (SCH)

**Introduction for Phase 1 (Schema):**
This phase focuses on defining and iteratively refining the database schema using Prisma. Starting with an initial schema, the AI agent will analyze requirements from Product Requirement Documents (PRDs) and Checklist/Procedure (CLP) documents to identify gaps and necessary modifications. Tasks include adjusting existing models, adding new models for features like QC, Task Templating, and EOL Testing, ensuring relationships are correctly defined, and aligning fields with specified data pools. The outcome of this phase is a comprehensive and robust Prisma schema that accurately represents the application's data structure and supports all planned functionalities.

---
**Prompt SCH-001**

**Objective:** Analyze `Order.buildNumbers` and Propose Schema Enhancements.

**Context:**
The current schema has an `Order` model with a field `buildNumbers: String[]`. According to PRD 5.1, a "BuildNumber" should be unique per sink in a Purchase Order (PO), and the "OrderID" (Primary Key) is conceptualized as PO Number + Build Number. This suggests that each individual sink unit needs to be uniquely identifiable and potentially hold its own specific configurations, status, or linked records (like BOMs, QC results, tasks). The current `String[]` might be a denormalized collection, but it doesn't directly support individual sink unit tracking and relationships as strongly as a dedicated model might.

**Task:**
1.  Search the codebase (primarily in `app/api/orders/`, `lib/services/orderService.ts` or similar, and `components/order/`) for how `Order.buildNumbers` is accessed and utilized.
2.  Analyze its role in:
    *   Order creation and configuration.
    *   BOM generation.
    *   QC processes.
    *   Task management.
3.  Based on the findings and PRD 5.1 ("BuildNumber (String, unique per sink in a PO)", "OrderID (Primary Key, e.g., PO Number + Build Number)"), draft a proposal for either:
    *   Confirming the current `Order.buildNumbers: String[]` is adequate and explaining how it meets the PRD's intent.
    *   Proposing a new `SinkUnit` (or similarly named) table in `prisma/schema.prisma` that would link to `Order` and hold individual `buildNumber` strings, along with its relationships to sink-specific configurations, BOMs, QC results, and tasks.
4.  Output the analysis and the proposed schema changes (if any) or the justification for the current approach.

---
**Prompt SCH-002**

**Objective:** Implement Approved Schema Changes for `Order.buildNumbers` Granularity.

**Context:**
Based on the analysis in SCH-001, a decision was made to refine the current structure. The proposal involves clarifying that a "Sink Unit" is conceptually identified by `Order.poNumber` + `SomeConfigurationTable.buildNumber` (e.g., `SinkConfiguration.buildNumber`). `Order.buildNumbers: String[]` will be kept as a denormalized array managed by application logic. The misleading unique constraint `@@unique([poNumber, buildNumbers])` on `Order` will be removed, and proper unique constraints `@@unique([orderId, buildNumber])` will be added to the relevant configuration tables.

**Task:**
1.  Reference the approved proposal from SCH-001.
2.  Draft the specific modifications to the `prisma/schema.prisma` file. This should include:
    *   Adding `@@unique([orderId, buildNumber])` to the following models:
        *   `SinkConfiguration`
        *   `BasinConfiguration`
        *   `FaucetConfiguration`
        *   `SprayerConfiguration`
        *   `SelectedAccessory`
    *   Removing the `@@unique([poNumber, buildNumbers])` constraint from the `Order` model.
3.  Present the modified snippets of the `prisma/schema.prisma` file for these models.
4.  Briefly reiterate the justification for keeping `Order.buildNumbers: String[]` as a denormalized field to be managed at the application level.

---
**Prompt SCH-003**

**Objective:** Enhance QC-Related Prisma Models for Detailed Checklist Requirements.

**Context:**
The current QC models (`QcFormTemplate`, `QcFormTemplateItem`, `OrderQcResult`, `OrderQcItemResult`) provide a basic structure for QC checklists. However, detailed requirements from `CLP.T2.001.V01 - T2SinkProduction.txt` and PRD (Section 5.8: QC Forms/Checklists Pool; Section 4: User Stories for QC) necessitate enhancements. These include representing checklist sections, handling N/A options, identifying items specific to individual basins (repeatable items), storing applicability conditions, linking to parts/assemblies, and ensuring distinct results for repeated items. PRD question (9) also asks about handling "N/A" and digital verification of document attachments.

**Task:**
1.  Review the existing `QcFormTemplate`, `QcFormTemplateItem`, `OrderQcResult`, and `OrderQcItemResult` models in `prisma/schema.prisma`.
2.  Compare these models against the requirements derived from `CLP.T2.001.V01 - T2SinkProduction.txt` and PRD Section 5.8 (QC Forms/Checklists Pool) and PRD Section 4 (User Stories for QC). Specifically consider:
    *   Representing sections from the checklist.
    *   Handling N/A options for checklist items.
    *   Identifying items that are specific to individual basins (and need to be repeated per basin).
    *   Storing conditions for when a checklist item is applicable (e.g., "if there is a Pegboard").
    *   Linking checklist items to specific part numbers or assembly actions if possible/needed.
    *   Ensuring `OrderQcItemResult` can store distinct results for items that are repeated (e.g., per basin).
3.  Propose specific field additions or modifications to these Prisma models. For each proposed change, provide:
    *   The field definition (name, type, attributes like `?` for optional, `[]` for array, `@default`).
    *   A clear justification explaining what aspect of the checklist/PRD it addresses.
4.  Draft the modified snippets of the `prisma/schema.prisma` file for these models.
5.  Address the PRD question (9): "How should 'N/A' options in the checklist be handled in the digital form (e.g., a separate checkbox, or implied if a feature isn't present)?" Propose a specific handling method in the schema/system.
6.  Address the PRD question (9): "For checklist items like 'Attach the final approved drawing and paperwork,' how will this be verified digitally? Link to an uploaded document?" Propose a specific handling method.

---
**Prompt SCH-004**

**Objective:** Design Prisma Schema for Task Templates and Task-Checklist Linking.

**Context:**
PRD UC 5.2 requires "auto-generated, tailored sequence of assembly tasks" that "incorporate detailed checks and steps from Section 2 & 3 of CLP.T2.001.V01". PRD 5.5 (Task Lists Pool) specifies task attributes: "TaskSequence, Description, WorkInstructionID (fk), RequiredToolIDs (Array of fk), RequiredPartIDs (Array of fk with quantities), ProductionChecklistItemID (fk to specific item in a digitized CLP.T2.001.V01 checklist, optional))."
This implies a need for:
1.  A way to define task *templates*.
2.  A way for these templates (or the tasks generated from them) to link to specific checklist items (`QcFormTemplateItem`).
3.  A structure to store required tools and parts for tasks (potentially at the template level).

**Task:**
1.  **Review Existing Task-Related Models:**
    *   Examine `Task`, `WorkInstruction`, and `WorkInstructionStep` in `prisma/schema.prisma`.
    *   Analyze how tasks are currently created and managed (if at all based on existing API routes or services).
2.  **Analyze PRD Requirements for Task Generation:**
    *   PRD UC 5.2: "access an auto-generated, tailored sequence of assembly tasks...incorporate detailed checks and steps from Section 2 & 3 of CLP.T2.001.V01".
    *   PRD 5.5 (Task Lists Pool): "Tasks (Array of Objects: TaskSequence, Description, WorkInstructionID (fk), RequiredToolIDs (Array of fk), RequiredPartIDs (Array of fk with quantities), ProductionChecklistItemID (fk to specific item in a digitized CLP.T2.001.V01 checklist, optional))."
3.  **Propose Schema Design for Task Templates and Task-Checklist Linking:**
    *   Should a new `TaskTemplate` model be created? What fields would it have (e.g., `name`, `description`, `appliesToAssemblyType?`, `linkedWorkInstructionId?`)?
    *   How would `TaskTemplate` store a sequence of task steps? (e.g., a related `TaskTemplateStep` model?)
    *   How would a `Task` (an instance of a task for an order) or `TaskTemplateStep` link to a specific `QcFormTemplateItem` (for the `ProductionChecklistItemID` requirement)? Propose the relation/field.
4.  **Outline Logic for Task List Generation:**
    *   High-level description of how the system would select the correct `TaskTemplate(s)` based on an order's sink configuration.
    *   How would it instantiate `Task` records from this template for a specific order/buildNumber?
5.  **Draft Prisma Schema Snippets:**
    *   Show proposed new models (`TaskTemplate`, `TaskTemplateStep` if applicable) and any modifications to the existing `Task` model.

---
**Prompt SCH-005**

**Objective:** Design Prisma Schema for EOL (End-of-Line) Testing Procedures and Results.

**Context:**
`CLT.T2.001.V01 - T2SinkEOLTesting.txt` outlines the EOL testing procedures. PRD 5.10 specifies "Testing Forms & Results Pool (similar to QC Forms/Checklists Pool and QC Results Pool but tailored for functional tests)." This implies a need for models to store:
1.  The definition/template of a test procedure (e.g., EOL Test for E-Sink).
2.  The individual steps within that procedure, including instructions, expected outcomes, and what data to record (e.g., text, numbers, pass/fail, serial numbers, calibration data).
3.  The results of performing a test procedure on an order/buildNumber.
4.  The specific data recorded for each step during a test execution.

**Task:**
1.  **Review EOL Testing Requirements:**
    *   Re-examine `CLT.T2.001.V01 - T2SinkEOLTesting.txt` for structure, data types to be recorded (text, numbers, pass/fail, SNs), procedural steps, and calibration data.
    *   Refer to PRD 5.10: "Testing Forms & Results Pool (similar to QC Forms/Checklists Pool and QC Results Pool but tailored for functional tests)."
2.  **Decision: Extend QC Models vs. New Test Models:**
    *   Briefly justify the decision to either heavily modify `QcFormTemplate` or create new, dedicated models like `TestProcedureTemplate` and `OrderTestResult`.
3.  **Propose Schema Design for EOL Testing:**
    *   If new models are chosen, define:
        *   `TestProcedureTemplate`: For storing the definition of a test procedure (e.g., EOL Test for E-Sink).
        *   `TestProcedureStepTemplate`: For individual steps within a `TestProcedureTemplate`. This should include instructional text, expected outcomes, and specifications for what data to record (e.g., type of input, units).
        *   `OrderTestResult`: To store the overall result of performing a test procedure on an order/buildNumber.
        *   `OrderTestStepResult`: To store the data recorded for each step of the test procedure, including measurements, pass/fail status, notes, and potentially links to calibration data if a step is a calibration.
    *   Specify fields for these models, paying attention to data types needed for measurements, text inputs, selections, etc.
    *   Consider how to link these to `Order` and potentially a specific `buildNumber`.
    *   Consider how to handle basin-specific repetitions if tests are repeated per basin.
4.  **Draft Prisma Schema Snippets:**
    *   Show the proposed new models and any necessary modifications or relations to existing models.

---
**Prompt SCH-006**

**Objective:** Review PRD Section 5 (Data Model / Database Pools) and Reconcile with Current Prisma Schema.

**Context:**
Previous schema tasks (SCH-001 to SCH-005) addressed specific features. This task is a broader reconciliation effort. The PRD's "Section 5: Data Model / Database Pools" likely lists many fields for various entities (Orders, Inventory, Parts, Assemblies, QC, Tasks, etc.). We need to ensure these are captured in the Prisma schema or that discrepancies are consciously acknowledged. Some fields might have been missed or their representation needs refinement.

**Task:**
1.  **Thoroughly Review PRD Section 5 (Data Model / Database Pools):**
    *   Go through each "Pool" (e.g., Orders Pool, Inventory Pool) and its listed fields.
2.  **Compare with Current Prisma Schema:**
    *   For each field in the PRD's data model, check if a corresponding field exists in the Prisma schema.
    *   Pay attention to field names, types, and optionality.
3.  **Identify Discrepancies/Missing Fields:**
    *   List any fields from the PRD that are not present in the Prisma schema or where the representation might differ significantly (e.g., PRD implies a direct field, schema uses a JSON blob or a relation that might not fully cover it).
4.  **Evaluate Necessity and Propose Changes:**
    *   For each identified discrepancy:
        *   Determine if the missing field is critical or provides significant value based on the PRD's overall goals and user stories.
        *   Consider if existing schema structures (e.g., JSON fields like `Assembly.kitComponentsJson` or `Part.customAttributes: Json?` if we were to add such a generic field) already adequately cover the PRD's intent.
        *   Propose specific additions or modifications to the Prisma schema if a field is deemed necessary and not adequately covered. Include field definitions (name, type, attributes).
5.  **Draft Prisma Schema Snippets:**
    *   Show the proposed modifications to existing models.
6.  **Specific Fields to Re-evaluate (from earlier analysis):**
    *   `Part.manufacturerInfo` (PRD 5.2)
    *   `Assembly.isKit` (PRD 5.2) - Is `kitComponentsJson: String?` on `Assembly` a sufficient proxy, or is an explicit boolean `isKit` field better for filtering/logic?
    *   `Assembly.canOrder` (PRD 5.2)
    *   `QcFormTemplateItem.isBasinSpecific` (PRD 5.8) - Current schema uses `repeatPer: String?` (e.g., "BASIN") on `QcFormTemplateItem`. Is this sufficient, or is an explicit boolean still desired for clarity or specific filtering?
    *   `QcFormTemplateItem.defaultValue`, `QcFormTemplateItem.notesPrompt` (PRD 5.8) - Are these covered by `QcFormTemplateItem.options: Json?` or should they be explicit?
    *   `OrderQcResult.jobId`, `OrderQcResult.numberOfBasins` (PRD 5.9) - These were in the physical checklist. Should they be on the digital result?

---
**Prompt SCH-007 (Internal - System Step)**

**Objective:** Consolidate All Schema Changes and Finalize `prisma/schema.prisma`.

**Context:**
All individual schema design and modification tasks (SCH-001 to SCH-006) have been completed. Each task resulted in proposed additions or modifications to the Prisma schema. This internal system step is to ensure all these changes are correctly aggregated and applied to produce a final, consolidated `prisma/schema.prisma` file.

**Task:**
1.  Internally gather all approved schema additions and modifications from tasks SCH-001 through SCH-006. This includes:
    *   Adjustments to `Order` and configuration models (`SinkConfiguration`, `BasinConfiguration`, etc.) for build number granularity.
    *   Enhancements to QC models (`QcFormTemplateItem`, `OrderQcItemResult`, `OrderQcResult`).
    *   New models for Task Templating (`TaskTemplate`, `TaskTemplateStep`, `TaskTemplateStepTool`, `TaskTemplateStepPart`) and updates to `Task` (including `TaskRequiredPart`).
    *   New models for EOL Testing (`TestProcedureTemplate`, `TestProcedureStepTemplate`, `OrderTestResult`, `OrderTestStepResult`) and new Enums (`TestStepInputType`, `TestStatus`).
    *   General field alignments and additions from PRD Section 5 review (to `Part`, `Assembly`, `InventoryItem`, and new `InventoryStatus` enum).
    *   Ensure all relations (one-to-one, one-to-many, many-to-many with implicit or explicit join tables) are correctly defined.
    *   Ensure all enums are defined.
    *   Ensure all `@@unique` and `@@index` attributes are correctly placed.
2.  Construct the complete content for the `prisma/schema.prisma` file, ensuring correct syntax, order of models, and inclusion of all enums and model definitions.
3.  Overwrite the existing `prisma/schema.prisma` file with this consolidated content.
4.  Read back a few distinctive sections from the newly written file (e.g., a new model definition, a modified existing model, a new enum) to programmatically verify the overwrite was successful and the content is as expected.
5.  Report success or any issues encountered.

---
**Prompt SCH-008 (Internal - System Step)**

**Objective:** Populate `AI_AGENT_PROMPTS.md` with all Phase 1 (Schema) Prompts.

**Context:**
This is an internal step to consolidate the prompts for the first phase of development into the `AI_AGENT_PROMPTS.md` file. This file will serve as a complete record of the subtasks assigned to the AI agent.

**Task:**
1.  Retrieve the content of all schema-related prompts (SCH-001 to SCH-006).
2.  Retrieve the "Overall Introduction" and "Phase 1: Schema Definition and Refinement (SCH)" introduction.
3.  Concatenate these introductions and prompts into a single string, maintaining Markdown formatting.
4.  Create a new file named `AI_AGENT_PROMPTS.md` at the root of the repository.
5.  Write the concatenated string content into this new file.
6.  Verify the file creation and content (e.g., by checking for the presence of the first and last prompt IDs).

---
**Schema Prompts SCH-009 through SCH-023 are placeholders for potential future schema iterations or more detailed breakouts if initial attempts are insufficient. For the current full sequence, assume SCH-001 through SCH-008 cover the necessary schema work based on the provided PRDs and CLPs.**

---
**Prompt SCH-009 (Placeholder)**
---
**Prompt SCH-010 (Placeholder)**
---
**Prompt SCH-011 (Placeholder)**
---
**Prompt SCH-012 (Placeholder)**
---
**Prompt SCH-013 (Placeholder)**
---
**Prompt SCH-014 (Placeholder)**
---
**Prompt SCH-015 (Placeholder)**
---
**Prompt SCH-016 (Placeholder)**
---
**Prompt SCH-017 (Placeholder)**
---
**Prompt SCH-018 (Placeholder)**
---
**Prompt SCH-019 (Placeholder)**
---
**Prompt SCH-020 (Placeholder)**
---
**Prompt SCH-021 (Placeholder)**
---
**Prompt SCH-022 (Placeholder)**
---
**Prompt SCH-023 (Placeholder)**

## Phase 2: Backend Logic and API Implementation (SVC)

**Introduction for Phase 2 (Backend):**
This phase focuses on implementing the backend logic and API endpoints based on the finalized Prisma schema. The AI agent will create services to handle business logic for core features like order management, QC result processing, task generation from templates, and EOL test recording. It will also build out the corresponding API routes to expose these services, ensuring proper request validation, data transformation, and response structuring. The goal is to create a functional and robust backend that can support all application features defined in the PRDs and user stories.

---
**Prompt SVC-ORD-001**

**Objective:** Analyze Impact of Schema Changes on Backend (API and Services).

**Context:**
The schema has undergone significant changes in Phase 1 (SCH-001 to SCH-007), including:
*   Build Number Granularity (`Order`, `SinkConfiguration`, etc.)
*   QC System Enhancements (`QcFormTemplateItem`, `OrderQcItemResult`)
*   Task Templating & Management (New models like `TaskTemplate`, `TaskTemplateStep`, updated `Task`)
*   EOL Testing Framework (New models like `TestProcedureTemplate`, `OrderTestResult`)
*   Minor Field Alignments (`Part`, `Assembly`, `InventoryItem`)

These changes will impact existing and planned backend logic for API endpoints and services. This task is to identify these impacts to create a roadmap for backend updates.

**Task:**
1.  **List All Schema Changes:** Compile a comprehensive list of all models and fields that were added or modified in the previous five plan steps (referencing SCH-001 to SCH-007 outputs). Categorize them by the feature they relate to (Build Number Granularity, QC System, Task Templating, EOL Testing, Minor Field Alignments).
2.  **Identify Affected API Endpoints:**
    *   Review the `app/api/` directory (and `src/api/` if still relevant).
    *   For each schema change, identify which API route handlers (e.g., `POST /api/orders`, `GET /api/qc/templates/:id`, `POST /api/tasks`) are likely to be affected. Consider:
        *   Endpoints that create or update entities now having new fields.
        *   Endpoints that read entities and might need to include new relations or fields in their responses.
        *   Endpoints whose logic might change due to new relationships (e.g., task generation logic).
3.  **Identify Affected Service Logic:**
    *   Review service files (e.g., in `lib/services/`, `services/`, or similar locations).
    *   Identify functions that interact with the modified Prisma models or implement business logic related to the changed features.
4.  **Prioritize Areas for Update:**
    *   Group the findings by feature (QC, Tasks, EOL, etc.).
    *   Estimate the potential impact and complexity of updating each area.
5.  **Output the Analysis:**
    *   Provide a structured list of API endpoints and service functions mapped to the schema changes that affect them.
    *   Include a brief note on the nature of the expected update (e.g., "add new field to input validation and Prisma create call", "modify response to include new related data").
    *   This output will serve as a roadmap for subsequent subtasks that will perform the actual code modifications.
---
**Prompt SVC-ORD-002 (Placeholder for Order Service Update - Build Number Logic)**
*(This would detail updating order creation/modification services and API endpoints to correctly handle the new build number uniqueness rules per configuration item.)*
---
**Prompt SVC-QC-TPL-001 (Placeholder for QC Template Service Update - New Fields)**
*(This would detail updating QC Template management services and API endpoints to support new fields in `QcFormTemplateItem` like `repeatPer`, `applicabilityCondition` etc.)*
---
**Prompt SVC-QC-RES-001 (Placeholder for QC Result Service Update - New Fields)**
*(This would detail updating QC Result submission/retrieval services and API endpoints for new fields in `OrderQcItemResult` like `isNotApplicable`, `repetitionInstanceKey`, `attachedDocumentId`.)*
---
**Prompt SVC-TSK-TPL-001 (Placeholder for Task Template Service - New CRUD)**
*(This would detail creating new services and API endpoints for full CRUD management of `TaskTemplate` and `TaskTemplateStep`, including linking tools, parts, QC items.)*
---
**Prompt SVC-TSK-GEN-001 (Placeholder for Task Generation Service - New Logic)**
*(This would detail creating the new service and API endpoint for generating `Task` instances from `TaskTemplate`s based on order configuration.)*
---
**Prompt SVC-EOL-TPL-001 (Placeholder for EOL Test Template Service - New CRUD)**
*(This would detail creating new services and API endpoints for full CRUD management of `TestProcedureTemplate` and `TestProcedureStepTemplate`.)*
---
**Prompt SVC-EOL-RES-001 (Placeholder for EOL Test Result Service - New Logic)**
*(This would detail creating new services and API endpoints for submitting and retrieving `OrderTestResult` and `OrderTestStepResult` data, including validation and status calculation.)*
---
**Prompt SVC-PART-ASM-001 (Placeholder for Part/Assembly Service Update - New Fields)**
*(This would detail updating Part and Assembly management services/APIs for new fields like `manufacturerName`, `revision`, `isOrderable`, `customAttributes`.)*
---
**Prompt SVC-INV-001 (Placeholder for Inventory Service Update - New Fields)**
*(This would detail updating InventoryItem management services/APIs for new fields like `serialNumber`, `batchOrLotNumber`, `expirationDate`, `inventoryStatus`.)*

## Phase 3: User Interface (UI) Development (UI)

**Introduction for Phase 3 (UI):**
This phase involves developing and updating the user interface to support the new features and data structures implemented in the backend. The AI agent will identify affected UI components and pages, detail the required changes for admin areas (template management), operational interfaces (QC, Assembly Tasks, EOL Testing), and general data displays. The focus will be on creating intuitive and functional user experiences that align with the PRD user stories and allow users to effectively interact with the new system capabilities.

---
**Prompt UI-IMPACT-001**

**Objective:** Analyze UI Impact of Backend and Schema Changes.

**Context:**
Phase 1 (Schema) and Phase 2 (Backend - via SVC-ORD-001 analysis) have introduced significant changes and new features. These include new data models for Task Templates and EOL Testing, enhancements to the QC system, and updates to core entities like Orders, Parts, and Assemblies. These backend changes necessitate corresponding updates and additions to the user interface.

**Task:**
1.  **Reference Backend Changes:** Use the output from the previous analysis of API and service logic changes (SVC-ORD-001, which was based on the schema modifications from SCH-001 to SCH-007) as a guide.
2.  **Identify Affected UI Components and Pages:**
    *   Review the `app/` directory (for pages/routes) and `components/` directory.
    *   For each backend change category (Build Number Granularity, QC System, Task Templating, EOL Testing, Minor Field Alignments), identify which UI views, pages, forms, and components are likely to be affected or will need to be created.
3.  **Detail Required UI Changes:**
    *   **Admin Area:**
        *   New interfaces for CRUD operations on `TaskTemplate` and `TestProcedureTemplate`.
        *   Updates to QC template management to include new fields like `repeatPer`, `applicabilityCondition`.
    *   **Order Management:**
        *   Review and potentially update order creation/editing forms regarding `buildNumber` input and display, ensuring consistency with backend logic.
    *   **QC Interface (for QC Person):**
        *   Adapt QC forms to handle `repeatPer` (e.g., rendering items multiple times for basins).
        *   Implement logic for `applicabilityCondition` (conditionally showing/hiding items).
        *   Allow marking items as `isNotApplicable`.
        *   Integrate file upload for `attachedDocumentId` on `OrderQcItemResult`.
        *   Display `externalJobId` on `OrderQcResult`.
    *   **Assembly Interface (for Assembler):**
        *   Display dynamically generated tasks (from `TaskTemplate` logic).
        *   Show `Task.buildNumber` if tasks are per unit.
        *   Display linked `qcFormTemplateItemId` or its information.
        *   Show `Task.requiredParts`.
    *   **EOL Testing Interface:**
        *   New interface for performing EOL tests based on `TestProcedureTemplate`.
        *   Input fields for various `TestStepInputType`s (text, numeric, pass/fail, file upload).
        *   Handling for `repeatPerInstance` and `instanceKey`.
    *   **General UI (Parts, Assemblies, Inventory):**
        *   Display new fields like `Part.manufacturerName`, `Assembly.isOrderable`, `InventoryItem.serialNumber`, etc., in relevant views and forms.
4.  **Prioritize UI Development Areas:**
    *   Group findings by feature.
    *   Estimate complexity and align with backend priorities.
5.  **Output the Analysis:**
    *   Provide a structured list of UI pages/components mapped to the backend changes that affect them.
    *   Note the nature of the expected UI update (e.g., "new admin page for Task Templates", "modify QC form to support item repetition").
    *   This output will guide subsequent UI development subtasks.
---
**Prompt UI-ADM-TSK-TPL-001 (Placeholder for Admin UI - Task Template CRUD)**
*(Details for creating the UI for TaskTemplate and TaskTemplateStep management: forms, tables, linking tools/parts/QC items.)*
---
**Prompt UI-ADM-EOL-TPL-001 (Placeholder for Admin UI - EOL Test Template CRUD)**
*(Details for creating the UI for TestProcedureTemplate and TestProcedureStepTemplate management: forms, step definitions, input type handling.)*
---
**Prompt UI-ADM-QC-TPL-001 (Placeholder for Admin UI - QC Template Enhancements)**
*(Details for updating the QC Template UI to support `repeatPer`, `applicabilityCondition`, `defaultValue`, `notesPrompt` etc. on `QcFormTemplateItem`.)*
---
**Prompt UI-ORD-001 (Placeholder for Order Form UI - Build Number Adjustments)**
*(Details for ensuring order creation/editing UIs correctly handle build number input/display per new backend logic.)*
---
**Prompt UI-QC-FORM-001 (Placeholder for QC Form UI - Enhancements)**
*(Details for updating the QC performance interface to handle `repeatPer` item rendering, `applicabilityCondition` logic, N/A marking, and file uploads.)*
---
**Prompt UI-ASM-TASK-001 (Placeholder for Assembly Task UI - Templated Tasks)**
*(Details for updating the assembly task display to show tasks generated from templates, including linked QC info, required parts, and build numbers.)*
---
**Prompt UI-EOL-TEST-001 (Placeholder for EOL Testing UI - Perform Test)**
*(Details for creating the new UI for performing EOL tests: rendering steps, handling various input types, repetitions, and result submission.)*
---
**Prompt UI-GEN-001 (Placeholder for General UI - Part Fields Update)**
*(Details for updating any UIs that display Part information to include `manufacturerName`, `revision`, `unitOfMeasure`, `customAttributes`.)*
---
**Prompt UI-GEN-002 (Placeholder for General UI - Assembly Fields Update)**
*(Details for updating any UIs that display Assembly information to include `isOrderable`, `revision`, `customAttributes`.)*
---
**Prompt UI-GEN-003 (Placeholder for General UI - InventoryItem Fields Update)**
*(Details for updating any UIs that display InventoryItem information to include `serialNumber`, `batchOrLotNumber`, `expirationDate`, `inventoryStatus`.)*

## Phase 4: Testing and Validation (TEST)

**Introduction for Phase 4 (Tests):**
This phase is dedicated to ensuring the quality and correctness of the implemented features through comprehensive testing. The AI agent will identify areas requiring new unit and integration tests, update existing tests affected by schema and backend changes, and outline key test scenarios for the major new functionalities like Task Templating, EOL Testing, and enhanced QC capabilities. The goal is to achieve robust test coverage that validates data integrity, business logic, API functionality, and simulates user interactions where appropriate.

---
**Prompt TEST-IMPACT-001**

**Objective:** Analyze Testing Impact and Define Test Plan Outline.

**Context:**
Phases 1, 2, and 3 involved significant schema changes, new backend logic/APIs, and corresponding UI development plans. This task is to analyze these changes to define a testing strategy, identifying areas for new tests and updates to existing ones.

**Task:**
1.  **Reference Backend and UI Changes:** Use the outputs from the previous analysis steps (Step 6 for backend/SVC-ORD-001, Step 7 for UI/UI-IMPACT-001) as a guide.
2.  **Identify Areas Requiring New Tests:**
    *   **Unit Tests (Services/Logic):**
        *   New service for `TaskTemplate` management.
        *   New service/logic for task generation from `TaskTemplate`s.
        *   New service for `TestProcedureTemplate` management.
        *   New service for EOL test result recording/processing.
        *   Logic related to `applicabilityCondition` and `repeatPer` in QC form handling.
    *   **Integration Tests (API Endpoints):**
        *   New CRUD endpoints for `TaskTemplate`.
        *   New Task generation endpoint.
        *   New CRUD endpoints for `TestProcedureTemplate`.
        *   New endpoints for EOL test result submission/retrieval.
3.  **Identify Areas Requiring Updates to Existing Tests:**
    *   **Unit Tests:** Any service functions whose signatures or logic changed due to schema updates (e.g., order service handling new `buildNumber` constraints, QC service handling new QC item fields, existing task service handling new `Task` fields).
    *   **Integration Tests:**
        *   Order API tests (`POST /api/orders`, `PATCH /api/orders/[orderId]`) due to `buildNumber` changes.
        *   QC Template API tests (`app/api/admin/qc-templates/...`) due to new `QcFormTemplateItem` fields.
        *   QC Result submission/retrieval API tests due to new `OrderQcItemResult` fields.
        *   Existing Task API tests due to new `Task` fields.
        *   Parts, Assemblies, Inventory API tests due to new fields in their respective models.
4.  **Outline Key Test Scenarios for New Features:**
    *   **Task Templating:** Create, read, update, delete templates and steps. Link tools, parts, QC items.
    *   **Task Generation:** Given an order configuration, verify correct template selection and instantiation of tasks with all linked data.
    *   **EOL Testing:** Create, read, update, delete test procedure templates. Submit test results with various data types, including repeated steps and file uploads. Verify correct status calculation.
    *   **QC Enhancements:** Test forms with `repeatPer` items, `applicabilityCondition` logic, N/A marking, and document linking.
5.  **Output the Analysis:**
    *   Provide a structured list of new tests to be written (unit and integration).
    *   Provide a list of existing tests that need updates.
    *   Briefly describe key scenarios to cover for the major new features.
    *   This will guide the subsequent test implementation subtasks.
---
**Prompt TEST-SVC-TSK-TPL-001 (Placeholder for Unit Tests - Task Template Service)**
*(Details for writing unit tests for `TaskTemplateService` CRUD operations and logic.)*
---
**Prompt TEST-SVC-TSK-GEN-001 (Placeholder for Unit Tests - Task Generation Service)**
*(Details for writing unit tests for the task generation logic, mocking dependencies, testing template selection and task instantiation.)*
---
**Prompt TEST-SVC-EOL-TPL-001 (Placeholder for Unit Tests - EOL Test Template Service)**
*(Details for writing unit tests for `TestProcedureTemplateService` CRUD operations.)*
---
**Prompt TEST-SVC-EOL-RES-001 (Placeholder for Unit Tests - EOL Test Result Service)**
*(Details for writing unit tests for EOL test result submission logic, validation, status calculation.)*
---
**Prompt TEST-INT-TSK-TPL-001 (Placeholder for Integration Tests - Task Template APIs)**
*(Details for writing integration tests for the Task Template CRUD API endpoints.)*
---
**Prompt TEST-INT-TSK-GEN-001 (Placeholder for Integration Tests - Task Generation API)**
*(Details for writing integration tests for the task generation API endpoint, verifying responses with different order inputs.)*
---
**Prompt TEST-INT-EOL-TPL-001 (Placeholder for Integration Tests - EOL Test Template APIs)**
*(Details for writing integration tests for the EOL Test Procedure Template CRUD API endpoints.)*
---
**Prompt TEST-INT-EOL-RES-001 (Placeholder for Integration Tests - EOL Test Result APIs)**
*(Details for writing integration tests for EOL test result submission and retrieval APIs.)*
---
**Prompt TEST-INT-UPD-001 (Placeholder for Integration Tests - Updates to Existing APIs)**
*(Details for updating integration tests for Orders, QC, existing Tasks, Parts, Assemblies, Inventory APIs to reflect schema changes and new field validations/responses.)*

---
**Prompt DOC-PLAN-001**

**Objective:** Create a Comprehensive Documentation Plan.

**Context:**
Following extensive schema modifications, backend service development, UI changes, and testing planning (Phases 1-4, represented by SCH, SVC, UI, and TEST series of prompts), a comprehensive documentation plan is needed to ensure all aspects of the system are well-documented for various audiences (developers, admins, users).

**Task:**
1.  **Consolidate Information on Changes:**
    *   Review all previous plan steps and subtask reports to gather a comprehensive list of all schema changes, new API endpoints, new service logic, and UI changes.
2.  **Identify Key Areas for Documentation:**
    *   **Schema Documentation:** New models (`TaskTemplate`, `TaskTemplateStep`, `TestProcedureTemplate`, etc.) and significant changes to existing models (e.g., new fields on `QcFormTemplateItem`, `Task`, `OrderQcItemResult`).
    *   **API Documentation:**
        *   New CRUD endpoints for `TaskTemplate`.
        *   New Task generation endpoint.
        *   New CRUD endpoints for `TestProcedureTemplate`.
        *   New endpoints for EOL test result submission/retrieval.
        *   Updates to existing APIs (Orders, QC, Tasks, Parts, etc.) to reflect new request/response fields.
    *   **Service Logic Documentation:**
        *   Task generation algorithm (how templates are selected and tasks instantiated).
        *   EOL test overall status calculation logic.
        *   Logic for handling `repeatPer` and `applicabilityCondition` in QC forms.
    *   **UI Flow Documentation (High-Level):**
        *   Admin flows for managing new templates (Task & EOL Test).
        *   User flow for performing EOL tests.
        *   User flow for interacting with enhanced QC forms.
    *   **Code Comments:** Identify areas in the code (especially new complex services) that would benefit from detailed comments.
3.  **Determine Documentation Format and Location:**
    *   Where will this documentation live? (e.g., `docs/` folder in the repo, Swagger/OpenAPI specs, README files, wiki).
    *   What format will be used? (e.g., Markdown, JSDoc for code comments).
4.  **Outline Specific Documentation Tasks:**
    *   Create a checklist of specific documents or sections to be written or updated. For example:
        *   "Update `docs/prisma-schema.md` with details of new EOL testing models."
        *   "Create `docs/api/task-templates.md` describing CRUD operations."
        *   "Add comments to `TaskGenerationService.ts` explaining the template selection logic."
5.  **Output the Documentation Plan:**
    *   Provide the structured list of documentation tasks, including what needs to be documented, where, and potentially who might be responsible if this were a team environment (though for this exercise, it's about identifying the tasks).
---
**Prompt FINALIZE-SCHEMA-001**

**Objective:** Update the `prisma/schema.prisma` file with the full consolidated schema including all designed changes.

**Context:**
All schema design, backend impact analysis, UI impact analysis, and testing impact analysis phases have been conceptually completed through a series of prompts (SCH-001 to SCH-023, SVC-001, UI-001, TEST-001, DOC-PLAN-001). This prompt represents the culmination of all schema-related decisions made throughout those steps. The AI agent has internally tracked all individual schema modifications.

**Task:**
1.  Define the complete, consolidated string content for the `prisma/schema.prisma` file. This content should reflect all schema modifications discussed and designed (from SCH-001 to SCH-023, covering Part, Assembly, Order, Configuration Models, QC System, Task Templating, EOL Testing, Inventory System, and all new Enums).
2.  Write this complete string content to the `prisma/schema.prisma` file, overwriting its previous content.
3.  Verify that the file has been written successfully. For example, by reading a small, unique portion of the new content back.

(AI Agent Note: I will internally reconstruct the full schema string based on the prompts SCH-001 through SCH-023 and the base schema I read previously. The subtask will then focus on the file writing operation.)
---
**Prompt FINALIZE-PROMPTS-DOC-001**

**Objective:** Create a new file named `AI_AGENT_PROMPTS.md` at the root of the repository and populate it with the complete "Highly Detailed Prompt Sequence Document" content.

**Context:**
All phases and their introductory prompts and specific sub-task prompts have been defined (SCH-001 to SCH-023, SVC-ORD-001 to SVC-INV-001, UI-IMPACT-001 to UI-GEN-003, TEST-IMPACT-001 to TEST-INT-UPD-001, and the finalization/documentation prompts like DOC-PLAN-001, FINALIZE-SCHEMA-001, and this one). This task is to consolidate all of this into a single, comprehensive Markdown document.

**Task:**
1.  Define the complete string content for `AI_AGENT_PROMPTS.md`. This content should be the concatenation of:
    *   The overall Introduction for the document.
    *   The Introduction for Phase 1 (Schema).
    *   All Schema prompts (SCH-001 to SCH-023).
    *   The Introduction for Phase 2 (Backend).
    *   All Backend prompts (SVC-ORD-001 through SVC-INV-001).
    *   The Introduction for Phase 3 (UI).
    *   All UI prompts (UI-ADM-TSK-TPL-001 through UI-GEN-003).
    *   The Introduction for Phase 4 (Tests).
    *   All Test prompts (TEST-SVC-TSK-TPL-001 through TEST-INT-UPD-001).
    *   (Ensure Markdown formatting, especially for code blocks and structure, is preserved).
2.  Create a new file named `AI_AGENT_PROMPTS.md` in the repository's root directory.
3.  Write the assembled string content into this new file.
4.  Verify that the file has been created and contains the expected content (e.g., by checking for the presence of the first and last prompt IDs).

(AI Agent Note: I will internally reconstruct the full document string based on all previously generated prompt content. The subtask will then focus on the file writing operation.)
