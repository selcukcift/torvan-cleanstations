# Implementation Plan & AI Coding Agent Prompt Guide: Torvan Medical CleanStation Workflow Enhancements

## 1. Introduction

This document outlines a phased implementation plan and provides detailed prompts for an AI coding agent to implement the key recommendations identified in the lifecycle workflow analysis of the Torvan Medical CleanStation Production Workflow Digitalization application. The goal is to enhance traceability, data integrity, user experience, and overall system robustness.

The AI agent should refer to the existing PRD, Technical Specification, Database Schema, and API Specification documents in conjunction with these prompts.

## 2. Phased Implementation Strategy

It's recommended to implement the enhancements in logical phases to manage complexity and allow for iterative testing.

### Phase 1: Core Data Model & Logic Enhancements

Focus on foundational changes to data structures and core business logic.

1.  **Solidify Digital Signature Mechanism for QC Records:** (Recommendation 5 from Analysis)
2.  **Enhance Outsourced Parts Identification:** (Recommendation 7)
3.  **Implement Component Serial/Batch Number Tracking:** (Recommendation 1)
4.  **Develop Robust Custom Part Number Generation Service:** (Recommendation 2)

### Phase 2: Workflow Adjustments & Error Handling

Implement changes related to how the system handles exceptions and deviations in the workflow.

5.  **Define and Implement Rework Loops for QC/Test Failures:** (Recommendation 3)
6.  **(Related to Rec. 3) Implement Handling for Parts Shortages during Assembly.**

### Phase 3: UX & Notifications

Focus on user interface improvements and communication.

7.  **Streamline Identical Sink Configuration (Copy Feature):** (Recommendation 4)
8.  **Create and Implement a Detailed Notification Matrix:** (Recommendation 6)

## 3. Detailed AI Agent Prompts

Below are detailed prompts for each key recommendation. The AI coding agent should use these to guide the implementation.

---

### Prompt 1: Solidify Digital Signature Mechanism for QC Records

*   **Recommendation Title:** Solidify Digital Signature Mechanism for QC Records
*   **Goal:** To implement a clear and consistent method for recording digital signatures on Quality Control (QC) results, ensuring traceability and verifiability of approvals.
*   **Context/Background:** The analysis recommended defining the `digitalSignature` field in the `QCResult` table to be a composite string for better auditability, as per PRD Question 9 and PRD section 5.9.
*   **Relevant Files & Data Models:**
    *   `prisma/schema.prisma`: `QCResult` table, `User` table.
    *   API route for submitting QC results (e.g., `src/app/api/qc/results/route.ts` as suggested in `code_structure_documentation.md`).
    *   Relevant QC components where signatures are captured/displayed (e.g., `src/components/qc/qc-form.tsx`).
*   **Detailed Implementation Steps:**
    1.  **Backend (API Route for QC Submission):**
        *   When a QC result is submitted and approved, the backend should construct the `digitalSignature` string.
        *   The string should be formatted as: `"User: [User.fullName] ([User.initials]) - ID: [User.id] - Timestamp: [ServerTimestampISO8601]"`.
        *   `[User.fullName]`, `[User.initials]`, and `[User.id]` should be fetched from the authenticated user's session or database record.
        *   `[ServerTimestampISO8601]` should be the current server time in ISO 8601 format when the signature is generated.
        *   Store this generated string in the `digitalSignature` field of the `QCResult` record being created/updated in the database.
    2.  **Database (`prisma/schema.prisma`):**
        *   Ensure the `digitalSignature` field in the `QCResult` table is a `String` type, capable of holding the composite signature.
        *   Ensure the `User` table has `fullName` and `initials` fields as specified.
    3.  **Frontend (QC Components):**
        *   When displaying a completed QC record, the `digitalSignature` field should be shown clearly.
        *   The UI for capturing the QC approval (e.g., a checkbox or button) should imply that this action will generate the defined digital signature. No actual signature input (like drawing) is required from the user.
*   **Key Considerations:**
    *   The server must generate the timestamp to ensure its accuracy and prevent client-side manipulation.
    *   Ensure the user information is fetched securely from the authenticated session.
*   **Acceptance Criteria:**
    *   When a QC form is approved, the `QCResult` record in the database contains a `digitalSignature` field populated with the correctly formatted composite string.
    *   The signature includes the full name, initials, user ID of the approver, and a server-generated ISO 8601 timestamp.
    *   The signature is visible when viewing the details of a completed QC record.

---

### Prompt 2: Enhance Outsourced Parts Identification

*   **Recommendation Title:** Enhance Outsourced Parts Identification
*   **Goal:** To improve the system's ability to identify and flag parts or assemblies that require outsourcing, streamlining the procurement process.
*   **Context/Background:** The analysis suggested adding a data-driven flag for components typically outsourced, allowing the system to pre-flag them on BOMs for the Procurement Specialist's review, with a manual override option. (Ref: PRD Question 9, UC 3.2)
*   **Relevant Files & Data Models:**
    *   `prisma/schema.prisma`: `Part` table, `Assembly` table.
    *   BOM generation logic (e.g., `src/lib/bom/generator.ts` or related services).
    *   API routes for fetching BOMs (e.g., `src/app/api/orders/[orderId]/bom/route.ts`).
    *   Frontend components for displaying BOMs (e.g., `src/components/orders/bom/bom-viewer.tsx`).
    *   Admin interface for managing Parts/Assemblies (e.g., `src/components/inventory/part-detail.tsx`, `src/components/inventory/assembly-detail.tsx`).
*   **Detailed Implementation Steps:**
    1.  **Database (`prisma/schema.prisma`):**
        *   Add a new optional boolean field `isOutsourced` to both the `Part` and `Assembly` tables. Default to `false`.
    2.  **Admin Interface:**
        *   Modify the Part and Assembly management forms in the admin section to allow an Admin to set/unset the `isOutsourced` flag for any part or assembly.
    3.  **Backend (BOM Generation & API):**
        *   When generating a BOM (`BOMItem` records), if a `Part` or `Assembly` included in the BOM has its `isOutsourced` flag set to `true`, this information should be carried over or indicated for that `BOMItem`. This might involve adding a non-persistent field to the `BOMItem` type used in the API response or a specific flag in the `notes` or a new dedicated field if persisted `BOMItem` needs it (consider if this state can change per-order).
        *   Alternatively, when the frontend requests a BOM, the API can enrich the `BOMItem` data by looking up the `isOutsourced` status of the corresponding `Part` or `Assembly`.
    4.  **Frontend (BOM Viewer):**
        *   In the BOM display interface used by Procurement Specialists (and other relevant roles), visually distinguish or flag items that are marked as `isOutsourced`. This could be an icon, a badge, or a separate column.
        *   Provide a mechanism for the Procurement Specialist to manually override this flag *for that specific order's BOM view*. This override might not change the master `isOutsourced` flag on the Part/Assembly but could be stored as an order-specific BOM note or a separate field in an order-specific BOM item representation if needed. (For simplicity, a note might suffice initially).
*   **Key Considerations:**
    *   Decide if the "outsourced" status on a BOM item is a snapshot at the time of BOM generation or always reflects the current master status of the part/assembly. The recommendation leans towards the master status being the primary indicator.
    *   The manual override by procurement should be clearly distinguishable from the system-suggested flag.
*   **Acceptance Criteria:**
    *   Admins can mark parts and assemblies as `isOutsourced`.
    *   When a BOM is generated and displayed, items that are master-marked as `isOutsourced` are visually flagged.
    *   Procurement Specialists can view this flag and have a way to acknowledge or make order-specific notes regarding the outsourcing status of an item on a BOM.

---

### Prompt 3: Implement Component Serial/Batch Number Tracking

*   **Recommendation Title:** Implement Component Serial/Batch Number Tracking
*   **Goal:** To allow tracking of specific serial numbers or batch numbers for critical components within a production order, enhancing traceability.
*   **Context/Background:** The analysis identified a gap in linking specific component instances to QC and assembly steps. This is crucial for detailed traceability.
*   **Relevant Files & Data Models:**
    *   `prisma/schema.prisma`: `BOMItem` table (or a new related table if `BOMItem` is a generic template).
    *   API routes related to BOM display and updates, and potentially assembly task updates (e.g., `src/app/api/orders/[orderId]/bom/route.ts`, `src/app/api/assembly/tasks/[taskId]/complete/route.ts`).
    *   Frontend components for assembly task guidance and QC data entry (e.g., `src/components/assembly/task-card.tsx`, `src/components/qc/qc-item.tsx`).
*   **Detailed Implementation Steps:**
    1.  **Database (`prisma/schema.prisma`):**
        *   The PRD's `BOMItem` table is linked to a `BillOfMaterials` which is order-specific. This is good.
        *   Add optional fields to the `BOMItem` table:
            *   `serialNumber: String?`
            *   `batchNumber: String?`
        *   These fields will store the instance-specific identifiers for components within that particular order's BOM.
    2.  **Backend (API):**
        *   Modify API endpoints that allow updating information related to an order's BOM items or task completion. For example, when an assembler completes a task involving a critical part, the API should allow for `serialNumber` or `batchNumber` to be submitted and saved to the respective `BOMItem`.
        *   Ensure API endpoints that return BOM details also include these new fields.
    3.  **Frontend (UI):**
        *   **Assembly Interface:** For tasks involving designated critical components, provide input fields for Assemblers to enter/scan serial or batch numbers. This might be part of the task completion step.
        *   **QC Interface:** During Pre-QC (for incoming serialized parts) or in-process QC, allow QC personnel to view/verify/input serial or batch numbers.
        *   **Display:** Show recorded serial/batch numbers when viewing BOM details or assembly/QC history for an order.
    4.  **Configuration (Admin):**
        *   Consider an admin feature to designate which parts/assemblies are "critical" and require serial/batch number tracking. This would drive the UI to prompt for this information. This could be a new boolean field `requiresSerialNumberTracking` on the `Part` / `Assembly` master tables.
*   **Key Considerations:**
    *   Not all parts will need serial/batch tracking. The system should only prompt for this information for designated components.
    *   Consider using barcode scanning capabilities in the UI for easier data entry.
*   **Acceptance Criteria:**
    *   Admins can designate specific parts/assemblies as requiring serial/batch number tracking.
    *   For orders containing these designated components, Assemblers/QC personnel are prompted to enter serial/batch numbers at appropriate workflow stages.
    *   Entered serial/batch numbers are saved with the order-specific `BOMItem` record.
    *   Recorded serial/batch numbers are visible in BOM views and relevant audit trails/history.

---

### Prompt 4: Develop Robust Custom Part Number Generation Service

*   **Recommendation Title:** Develop Robust Custom Part Number Generation Service
*   **Goal:** To create a reliable and consistent system for generating unique custom part numbers for configurable items like pegboards and basins, ensuring data integrity.
*   **Context/Background:** The PRD (UC 1.1, Step 3) mentions system generation of custom part numbers (e.g., `T2-ADW-PB-[width]x[length]`). The analysis highlighted the need for robust logic and uniqueness.
*   **Relevant Files & Data Models:**
    *   A new service/module (e.g., `src/lib/customParts/generator.ts`).
    *   `prisma/schema.prisma`: `BOMItem` table. Potentially a new table to track generated custom part numbers if global uniqueness across orders is complex.
    *   Order creation logic (where configuration leads to custom parts).
    *   BOM generation logic (`src/lib/bom/generator.ts`).
    *   Admin interface for managing rules/prefixes if any (UC 7.5).
*   **Detailed Implementation Steps:**
    1.  **Define Generation Rules & Uniqueness Strategy:**
        *   For each type of custom part (pegboard, basin), define the exact format and how parameters (width, length, depth) are incorporated.
        *   Determine the strategy for ensuring uniqueness:
            *   Are they unique *within an order*?
            *   Are they unique *globally*? (More complex, might need a central registry/counter).
            *   The `BOMItem.customPartSpec` can store the configuration that generated it. The generated number itself could be stored in `BOMItem.itemId` if it's treated as the primary ID for that instance, or a new field `BOMItem.customGeneratedPartNumber`.
    2.  **Create Custom Part Generation Service (`src/lib/customParts/generator.ts`):**
        *   This service will take configuration parameters (e.g., type, dimensions) as input.
        *   It will implement the defined rules to construct the part number string.
        *   It must include logic to ensure uniqueness based on the chosen strategy (e.g., check against existing numbers, use a sequence).
    3.  **Integration with Order Creation/BOM Generation:**
        *   During order configuration (UC 1.1, Step 3), when custom dimensions are entered, this service should be invoked to generate the custom part number.
        *   This generated number should be stored with the `BOMItem` when the BOM is created. The `isCustomPart` flag should be true, and `customPartSpec` should store the dimensions.
    4.  **Admin Interface (UC 7.5):**
        *   If any part of the generation logic is configurable (e.g., prefixes, starting sequences), provide an admin interface to manage these settings.
    5.  **Validation:**
        *   Ensure that any generated part number conforms to expected formats and doesn't conflict with existing standard part numbers.
*   **Key Considerations:**
    *   Scalability of the uniqueness mechanism.
    *   Error handling if a unique number cannot be generated (e.g., namespace exhaustion, though unlikely for this specific format).
*   **Acceptance Criteria:**
    *   When a user configures a sink with custom pegboard or basin dimensions, a unique custom part number is generated according to the defined format.
    *   This custom part number is accurately reflected in the generated BOM for the order.
    *   The system prevents duplicate custom part numbers according to the defined uniqueness strategy.
    *   Admins can manage any configurable aspects of the generation rules.

---

### Prompt 5: Define and Implement Rework Loops for QC/Test Failures

*   **Recommendation Title:** Define and Implement Rework Loops for QC/Test Failures
*   **Goal:** To establish clear system statuses and user workflows for handling orders that fail Quality Control (QC) checks or assembly tests, ensuring issues are addressed and re-verified.
*   **Context/Background:** The analysis pointed out the need for defined rework loops beyond simply "flagging issues," as per PRD Question 9.
*   **Relevant Files & Data Models:**
    *   `prisma/schema.prisma`: `ProductionOrder` table (specifically `OrderStatus` enum), `Task` table (for potential rework tasks).
    *   API routes for updating order status and managing tasks.
    *   Frontend components for QC personnel, Assemblers, and Production Coordinators (dashboards, order detail views).
    *   Notification service (`src/lib/email/notifications.ts` or similar).
*   **Detailed Implementation Steps:**
    1.  **Define New Order Statuses (`prisma/schema.prisma`):**
        *   Add to `OrderStatus` enum:
            *   `PRE_QC_REJECTED`
            *   `FINAL_QC_REJECTED`
            *   `ASSEMBLY_REWORK_PRE_QC` (or a more general `ASSEMBLY_REWORK`)
            *   `ASSEMBLY_REWORK_FINAL_QC`
    2.  **Implement Workflow Logic:**
        *   **QC Failure:**
            *   If a QC Person rejects a Pre-QC or Final QC:
                *   They set the order status to `PRE_QC_REJECTED` or `FINAL_QC_REJECTED`.
                *   They must provide detailed notes in `QCResult.notes` explaining the failure.
                *   The system notifies the Production Coordinator and the relevant Assembler(s) or assembly supervisor.
            *   The Production Coordinator or a designated role then assesses the failure.
                *   If it requires assembly rework, they change the status to `ASSEMBLY_REWORK_PRE_QC` or `ASSEMBLY_REWORK_FINAL_QC` and may assign specific rework tasks or add notes for the assembler.
        *   **Assembly Rework:**
            *   Orders with `ASSEMBLY_REWORK_*` status appear in the Assembler's queue, clearly marked for rework, with access to QC failure notes.
            *   Assemblers perform corrections and mark rework tasks as complete.
        *   **Re-entry to QC:**
            *   Once rework is done, the Assembler (or Coordinator) sets the status back to `READY_FOR_PRE_QC` or `READY_FOR_FINAL_QC`.
            *   The order re-enters the QC queue. The QC Person can see previous failure notes and re-inspect.
    3.  **Frontend (UI):**
        *   Dashboards and order lists should display these new statuses with appropriate visual cues.
        *   QC forms must clearly allow rejection and note-taking.
        *   Assembler interfaces should highlight rework orders and provide access to QC failure details.
    4.  **Notifications:**
        *   Implement notifications for: QC rejection, assignment of rework status, and readiness for re-inspection.
*   **Key Considerations:**
    *   Ensure clear accountability for each step in the rework loop.
    *   Maintain a history of QC failures and rework attempts (`OrderStatusHistory`, `QCResult` records).
*   **Acceptance Criteria:**
    *   QC personnel can reject an order at Pre-QC or Final QC, setting it to a "REJECTED" status.
    *   Rejected orders trigger notifications to relevant personnel.
    *   A mechanism exists to transition a rejected order to an "ASSEMBLY_REWORK" status, making it available to Assemblers with clear instructions.
    *   After rework, the order can be resubmitted for QC.
    *   The system tracks the history of failures and rework.

---

### Prompt 6: Implement Handling for Parts Shortages during Assembly

*   **Recommendation Title:** Implement Handling for Parts Shortages during Assembly
*   **Goal:** To provide a workflow for Assemblers to report parts shortages or issues found during the assembly process, pausing the order and notifying relevant personnel.
*   **Context/Background:** The analysis identified a gap in handling situations where parts are unavailable or damaged during assembly.
*   **Relevant Files & Data Models:**
    *   `prisma/schema.prisma`: `ProductionOrder` table (`OrderStatus` enum), potentially a new table/fields for tracking part issues if detailed logging per part is needed.
    *   API routes for updating order status.
    *   Frontend components for Assembler's task interface.
    *   Notification service.
*   **Detailed Implementation Steps:**
    1.  **Define New Order Status (`prisma/schema.prisma`):**
        *   Add to `OrderStatus` enum: `ASSEMBLY_ON_HOLD_PARTS_ISSUE`.
    2.  **Implement Workflow Logic & UI (Assembler Interface):**
        *   In the Assembler's task view, provide a button/action like "Report Part Issue" or "Flag Part Shortage."
        *   When an Assembler triggers this:
            *   A dialog should appear prompting for details:
                *   Which part(s) are affected (ideally selectable from the current task's parts list or BOM).
                *   Quantity needed/at issue.
                *   Brief description of the issue (shortage, damaged, incorrect).
            *   Upon submission, the order status changes to `ASSEMBLY_ON_HOLD_PARTS_ISSUE`.
            *   The system logs the reported part issue details (could be in `OrderStatusHistory.notes` or a dedicated table if more structure is needed).
    3.  **Notifications:**
        *   Notify the Procurement Specialist and Production Coordinator immediately with the order details and the reported part issue.
    4.  **Resolution Workflow:**
        *   The Procurement Specialist or Production Coordinator investigates the part issue.
        *   Once the part is available or the issue is resolved, they change the order status back to `READY_FOR_PRODUCTION` (or the previous assembly status).
        *   The order (and its tasks) become active again for the Assembler.
        *   Notify the Assembler that the part issue is resolved and they can resume work.
    5.  **Frontend (UI for Coordinators/Procurement):**
        *   Dashboards for Production Coordinators and Procurement Specialists should highlight orders that are `ASSEMBLY_ON_HOLD_PARTS_ISSUE`.
        *   They should be able to view the details of the reported part issue.
*   **Key Considerations:**
    *   Clarity on who is responsible for resolving the part issue and changing the status back.
    *   How to track multiple part issues for a single order if they occur at different times.
*   **Acceptance Criteria:**
    *   Assemblers can report a part shortage/issue from their task interface, providing details.
    *   Reporting a part issue puts the order into an `ASSEMBLY_ON_HOLD_PARTS_ISSUE` status.
    *   Procurement and Production Coordinators are notified of the issue and can view details.
    *   Authorized users can resolve the hold status, returning the order to an active assembly state and notifying the assembler.

---

### Prompt 7: Streamline Identical Sink Configuration (Copy Feature)

*   **Recommendation Title:** Streamline Identical Sink Configuration (Copy Feature)
*   **Goal:** To reduce repetitive data entry for Production Coordinators when creating orders with multiple identically configured sinks.
*   **Context/Background:** The analysis suggested a "copy configuration" feature to improve efficiency in the 5-step order creation wizard (UC 1.1, Step 3).
*   **Relevant Files & Data Models:**
    *   Frontend components for the order creation wizard, specifically Step 3 (Sink Configuration) (e.g., `src/components/orders/creation/sink-configuration-step.tsx`).
    *   State management for the order wizard (e.g., Zustand store or React context).
    *   The data structure representing a single sink's configuration within the wizard's overall order data.
*   **Detailed Implementation Steps:**
    1.  **UI Enhancement (Sink Configuration Step - UC 1.1, Step 3):**
        *   This step is repeated for each "Unique Build Number."
        *   After the first sink (build number) is configured, for subsequent sinks:
            *   Display a "Copy Configuration From:" dropdown or selection mechanism.
            *   This dropdown should list the "Unique Build Numbers" already configured within the *current* PO/wizard session.
        *   If the Production Coordinator selects a build number from this dropdown:
            *   The form for the current sink's configuration should be pre-filled with all the values (Sink Model, Dimensions, Legs, Feet, Pegboard, Basins, Faucets, Sprayers) from the selected source build number.
        *   The Production Coordinator can then either accept the copied configuration as-is or make minor modifications if needed.
    2.  **State Management:**
        *   Ensure the wizard's state management can handle:
            *   Storing the configuration for each build number individually.
            *   Accessing the configuration of an already-configured build number to use as a source for copying.
            *   Updating the current build number's configuration with the copied (and potentially modified) data.
*   **Key Considerations:**
    *   The copy should be a deep copy, so modifications to the new configuration don't affect the source.
    *   Ensure the UI clearly indicates that data has been copied and can still be edited.
*   **Acceptance Criteria:**
    *   In the order creation wizard, when configuring the second or subsequent sink for an order, the Production Coordinator sees an option to "Copy Configuration From..." previously configured sinks in the same order.
    *   Selecting a source sink pre-fills all relevant configuration fields for the current sink.
    *   The copied configuration can be further edited before proceeding.
    *   The final order submitted to the backend correctly reflects the distinct (even if initially copied) configurations for each build number.

---

### Prompt 8: Create and Implement a Detailed Notification Matrix

*   **Recommendation Title:** Create and Implement a Detailed Notification Matrix
*   **Goal:** To ensure timely and relevant notifications are sent to appropriate users based on specific system events, improving workflow communication and responsiveness.
*   **Context/Background:** The analysis highlighted the need for a comprehensive list of notification triggers, content, and recipients (PRD Question 9, UC 8.4). The `SystemNotification` table and general notification service exist.
*   **Relevant Files & Data Models:**
    *   Notification service (e.g., `src/lib/email/notifications.ts` or a more general `src/lib/notifications/service.ts`).
    *   `prisma/schema.prisma`: `SystemNotification` table, `User` table (for roles).
    *   All backend modules/API routes where notification-triggering events occur (e.g., order status updates, QC submissions, task assignments, service order creation).
    *   Frontend components for displaying notifications (e.g., `src/components/shared/notification-center.tsx`).
*   **Detailed Implementation Steps:**
    1.  **Define the Notification Matrix (Collaboration with Project Owner/Users may be needed for full list):**
        *   Create a comprehensive list (e.g., in a spreadsheet or internal document, then translate to code). For each notification:
            *   **Event Trigger:** (e.g., `OrderStatusChange: ORDER_CREATED -> PARTS_SENT`, `QCResult: FINAL_QC -> FAIL`, `NewTaskAssignment`, `ServiceOrder: PENDING`)
            *   **Recipient Role(s):** (e.g., `PROCUREMENT_SPECIALIST`, `PRODUCTION_COORDINATOR`, `ASSEMBLER`)
            *   **Message Content Template:** (e.g., "Order [PO#]-[Build#] status updated to [NewStatus].", "Action required: Final QC for Order [PO#]-[Build#] failed. Reason: [FailureNotes].", "You have been assigned a new task: '[TaskName]' for Order [PO#]-[Build#].")
            *   **Notification Type:** (from `NotificationType` enum in `SystemNotification` table, e.g., `ORDER_STATUS_CHANGE`, `QC_REQUIRED`, `TASK_ASSIGNMENT`)
            *   **Delivery Method(s):** (In-app, Email - initially focus on in-app as per current design).
    2.  **Implement Notification Logic in Backend Services:**
        *   In each backend service/API route where a defined event trigger occurs:
            *   Call the notification service.
            *   The notification service should:
                *   Identify the appropriate recipient users based on their roles and potentially their relation to the entity (e.g., assignee of the order).
                *   Construct the message using the defined template and relevant data from the event.
                *   Create a record in the `SystemNotification` table for each recipient.
    3.  **Frontend Notification Display:**
        *   Ensure the `NotificationCenter` component polls for new notifications or uses a real-time mechanism (if implemented, e.g., WebSockets - though polling is simpler initially).
        *   Display notifications to the logged-in user, allowing them to mark notifications as read.
        *   Clicking a notification should ideally navigate the user to the relevant page/entity if applicable (e.g., clicking an order status change notification takes them to the order details page).
*   **Key Considerations:**
    *   Avoid notification fatigue: ensure notifications are relevant and actionable.
    *   User preferences for notification delivery (future enhancement).
    *   Batching of similar notifications if many occur in a short period (future enhancement).
*   **Acceptance Criteria:**
    *   When a defined event occurs (e.g., order status changes to `READY_FOR_PRE_QC`), the correct user roles (e.g., QC Person) receive a notification with the correct message content.
    *   Notifications are stored in the `SystemNotification` table.
    *   Users can view their notifications in the UI.
    *   Marking notifications as read works correctly.

---

This detailed guide should provide the AI coding agent with clear instructions for implementing the proposed enhancements.
