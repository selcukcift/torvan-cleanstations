# AI Coding Prompt Sequence: Torvan Medical Workflow App Completion (v3)

**Objective:** To systematically complete all in-progress and outstanding features of the Torvan Medical CleanStation Production Workflow Digitalization application, structured into manageable development sprints. This document provides hyper-specific instructions tailored to the existing codebase.

### Core Directives for AI Agent

* **Execute Prompts Sequentially:** The sprints and prompts are ordered by dependency. Do not proceed to the next prompt until the current one's acceptance criteria are fully met.  
* **Reference Existing Architecture:** Adhere to the architectural patterns and coding conventions previously established, as documented in CLAUDE.md.  
* **Source of Truth (Requirements):** The primary requirements document is resources/Torvan Medical CleanStation Production Workflow Digitalization.md (the PRD). All User Stories (UC) and data models referenced are from this file.  
* **Source of Truth (Business Logic):** For detailed operational checklists, rules, and options, the definitive sources are the text and JSON files in the resources/ folder, especially CLP.T2.001.V01 \- T2SinkProduction.txt.  
* **BOM Engine Integrity (CRITICAL):** The Bill of Materials (BOM) rules engine in components/debug/BOMDebugHelper.tsx is the inviolable source of truth. **DO NOT MODIFY THIS COMPONENT OR ITS LOGIC.** All BOM data for the UI **must** be fetched by sending the current order configuration to the app/api/orders/preview-bom/route.ts API endpoint.  
* **Utilize Existing Components:** Leverage the existing shadcn/ui components in components/ui/ to ensure visual consistency. Use the useToast hook from hooks/use-toast.ts for user feedback on actions.  
* **State Management:** Use the existing Zustand store in stores/orderCreateStore.ts for managing the state of the order creation wizard.

### Sprint 1: Foundational Data Management (Admin)

**Goal:** Empower the Admin to manage the core data that drives all other workflows. This is a prerequisite for the QC and Assembly sprints.

* **Prompt 1.1: Complete QC Template Manager**  
  * **File to Modify:** components/admin/QCTemplateManager.tsx  
  * **Task:** Implement a full CRUD interface for QC Form Templates and their checklist items.  
  * **Acceptance Criteria:**  
    1. **Template Creation:** Implement a \<Dialog\> form (using components/ui/dialog.tsx) for creating a new QCFormTemplate. The form must capture FormName, FormType (\<Select\>), and Version. On submit, POST to /api/admin/qc-templates.  
    2. **Display Items:** Display the ChecklistItems of a selected template in a \<Table\> (components/ui/table.tsx).  
    3. **Item Management:** Within the table, each row must have "Edit" and "Delete" buttons. The "Edit" button should open a Dialog pre-filled with the item's data (Section, ItemDescription, CheckType, IsBasinSpecific). Submitting the form should PUT to /api/admin/qc-templates/\[templateId\]. Deleting should DELETE a specific item.  
    4. **Form Validation:** Use the zod schemas defined in lib/qcValidationSchemas.ts with react-hook-form for all template and item forms.  
    5. **Seeding Utility:** Add a \<Button\> labeled "Seed Official Checklists". On click, it should trigger a function that reads resources/CLP.T2.001.V01 \- T2SinkProduction.txt, transforms its sections into the correct JSON structure for QCFormTemplate and ChecklistItems, and POSTs them to the API. Use the useToast hook to report success or failure.  
* **Prompt 1.2: Build Work Instruction & Task List Manager**  
  * **Task:** Create two new Admin modules for managing WorkInstructions and TaskLists.  
  * **Acceptance Criteria:**  
    1. **Work Instructions Module:**  
       * Create a new page at app/admin/work-instructions/page.tsx.  
       * This page should feature a component that displays all WorkInstructions in a data table and allows for creating, editing, and deleting them.  
       * The create/edit form (in a Dialog) must capture a Title and a dynamic list of Steps, where an admin can add/remove text areas for step descriptions.  
       * Implement the backend API route app/api/v1/admin/work-instructions/route.ts (and /\[instructionId\]) to handle these CRUD operations.  
    2. **Task Lists Module:**  
       * Create a new page at app/admin/task-lists/page.tsx.  
       * The main component will allow an Admin to create and manage TaskLists, associating each with an AssemblyType (e.g., "MDRD\_B2\_ESINK").  
       * The interface must allow for ordering a sequence of tasks. Each task entry should have searchable dropdowns to link a WorkInstructionID, RequiredToolIDs, and RequiredPartIDs.  
       * Implement the backend API route app/api/v1/admin/task-lists/route.ts (and /\[taskListId\]) for persistence.

### Sprint 2: Finalize Order Creation & Configuration

**Goal:** Complete the 5-step OrderWizard with full functionality and correct integration with the BOM engine.

* **Prompt 2.1: Implement Step 3 \- Sink Configuration**  
  * **File to Modify:** components/order/ConfigurationStep.tsx  
  * **Task:** Implement the dynamic form logic for configuring the sink.  
  * **Acceptance Criteria:**  
    1. Read the sinkModel and quantity from the orderCreateStore. Use this data to dynamically render the correct number of basin configuration sections using a .map() function.  
    2. For custom dimensions (basin or pegboard), implement the onChange handler to construct the custom part number string as specified in PRD UC 1.1 and update the store.  
    3. Ensure all \<Select\>, \<Checkbox\>, and \<RadioGroup\> components (components/ui/) have their onValueChange or onCheckedChange handlers correctly wired to update the corresponding slice in the orderCreateStore.  
    4. The options for each dropdown must be sourced from the logic detailed in resources/sink configuration and bom.txt.  
* **Prompt 2.2: Implement Step 4 \- Accessories**  
  * **File to Modify:** components/order/AccessoriesStep.tsx  
  * **Task:** Build the UI for selecting accessories.  
  * **Acceptance Criteria:**  
    1. Use react-query or a useEffect hook to fetch data from the /api/accessories endpoint on component mount.  
    2. Display the results in a grid of \<Card\> components. Each card should contain the accessory name, an image, and a numerical \<Input\> for the quantity.  
    3. When the quantity input changes, update the accessories slice in the orderCreateStore.  
* **Prompt 2.3: Finalize Step 5 \- Review & Submit**  
  * **File to Modify:** components/order/ReviewStep.tsx  
  * **Task:** Integrate the BOM preview and finalize order submission.  
  * **Acceptance Criteria:**  
    1. Create a previewBOM function that is triggered on component mount. This function will get the complete order configuration from orderCreateStore.ts.  
    2. It will then POST this configuration object to the /api/orders/preview-bom endpoint.  
    3. The hierarchical JSON response must be passed as a prop to the \<BOMViewer /\> component for rendering. Handle loading and error states gracefully.  
    4. The final "Submit Order" \<Button\> must trigger a handleSubmit function that POSTs the entire state from orderCreateStore to /api/orders. On success (201), redirect the user to the new order's page (/orders/\[orderId\]) and show a success toast.

### Sprint 3: Implement Core Production Workflows

**Goal:** Build the interactive, role-specific interfaces for QC and Assembly.

* **Prompt 3.1: Build the Interactive Pre-QC Interface**  
  * **File to Modify:** app/orders/\[orderId\]/qc/page.tsx  
  * **Task:** Develop the UI to render and process a Pre-QC checklist for a QC Person.  
  * **Acceptance Criteria:**  
    1. In the page component, fetch the order data. If order.status is ReadyForPreQC, then fetch the appropriate "Pre-Production Check" template from /api/orders/\[orderId\]/qc/template.  
    2. Pass the fetched template data as a prop to the \<QCFormInterface /\> component.  
    3. Inside \<QCFormInterface /\>, render the checklist sections and items. Use react-hook-form to manage the form state.  
    4. The form's onSubmit handler must package the results, include a digitalSignature object { userId: session.user.id, timestamp: new Date().toISOString() }, and POST the payload to /api/orders/\[orderId\]/qc.  
    5. The API response for this POST should handle the status update to "Ready for Production".  
* **Prompt 3.2: Build the Guided Assembly Interface**  
  * **File to Modify:** components/assembly/TaskManagement.tsx  
  * **Task:** Transform this component into a step-by-step guided workflow.  
  * **Acceptance Criteria:**  
    1. On the AssemblerDashboard.tsx, orders with status ReadyForProduction should have a "Start Assembly" button. Clicking it navigates to the order detail page and assigns the order to the current user.  
    2. The TaskManagement.tsx component (on the order detail page) will fetch the TaskList from the API based on the order's specific configuration.  
    3. Render each task as a \<Collapsible\> item. The trigger shows the task name. The content shows detailed instructions, required parts, and tools.  
    4. Each task must have a \<Checkbox\> to mark it as complete. The state of all checkboxes must persist.  
    5. The final task must be the packaging checklist derived from **Section 4 of CLP.T2.001.V01 \- T2SinkProduction.txt**.  
    6. Once all checkboxes are marked, a "Complete Assembly & Send to QC" button is enabled, which calls the API to update the order status to ReadyForFinalQC.  
* **Prompt 3.3: Build the Final QC Interface**  
  * **File to Modify:** app/orders/\[orderId\]/qc/page.tsx  
  * **Task:** Adapt the existing QC page for the Final QC process.  
  * **Acceptance Criteria:**  
    1. Modify the page's data fetching logic: if the order.status is ReadyForFinalQC, it must fetch the "Final QC" template instead of the Pre-QC one.  
    2. The checklist rendered in \<QCFormInterface /\> must correspond to items from **Sections 2, 3, and 4 of CLP.T2.001.V01 \- T2SinkProduction.txt**.  
    3. The submission logic is identical to Pre-QC, but the API will update the status to ReadyForShip on success.

### Sprint 4: Ancillary Workflows & System Polish

**Goal:** Complete all remaining user workflows, implement system-wide features, and prepare for release.

* **Prompt 4.1: Finalize Procurement Specialist Workflow**  
  * **File to Modify:** components/dashboard/ProcurementSpecialistDashboard.tsx  
  * **Task:** Build out the interactive features for the Procurement Specialist.  
  * **Acceptance Criteria:**  
    1. The main tab/view of the dashboard should fetch and display all orders where status is OrderCreated.  
    2. Clicking an order should open a \<Dialog\> or navigate to a detail view showing the BOM (using the \<BOMViewer /\> component).  
    3. This view must have an "Approve BOM for Production" button. This button calls app/api/orders/\[orderId\]/status/route.ts with the new status PartsSent.  
    4. Add a second action/button, "Confirm Parts Arrival", which changes the status to ReadyForPreQC.  
* **Prompt 4.2: Complete the Service Department Loop**  
  * **File to Modify:** components/dashboard/ProcurementSpecialistDashboard.tsx  
  * **Task:** Implement the service order fulfillment process for Procurement.  
  * **Acceptance Criteria:**  
    1. Add a new \<TabsTrigger\> labeled "Service Requests" to the dashboard.  
    2. This tab will fetch and display all pending service orders from /api/service-orders.  
    3. Each order in the list must have "Approve & Fulfill" and "Reject" buttons.  
    4. These buttons must call the existing API route app/api/v1/service/orders/\[serviceOrderId\]/approve (or a new reject route) to update the status, which will then be visible in the service user's \<ServiceOrderHistory /\> component.  
* **Prompt 4.3: Implement Real-Time Notification System**  
  * **Task:** Build the backend notification creation logic and enhance the frontend NotificationBell.  
  * **Acceptance Criteria:**  
    1. Modify the API route handlers for key status changes (/api/orders/\[orderId\]/status, /api/orders/\[orderId\]/qc). After successfully updating an order, they must also create a Notification record in the database targeted to the relevant role (e.g., a QC submission notifies the Production Coordinator).  
    2. In components/notifications/NotificationBell.tsx, use a library like SWR or react-query to automatically re-fetch data from /api/v1/notifications on an interval (e.g., refreshInterval: 30000).  
    3. The bell icon must display a red \<Badge\> with the number of unread notifications.  
    4. The dropdown, populated by \<NotificationItem /\>, should correctly link to the order page, and clicking an item should trigger an API call to mark it as read.  
* **Prompt 4.4: End-to-End Testing and Final Polish**  
  * **Task:** Write E2E tests for the newly completed workflows using Playwright.  
  * **Acceptance Criteria:**  
    1. Create e2e/qc-workflow.spec.ts. This test must log in as a QC user, find an order that is ReadyForPreQC, complete the form, submit it, and assert that the order status is now ReadyForProduction.  
    2. Create e2e/assembly-workflow.spec.ts. This test must log in as an Assembler, claim an order, check all the task boxes, and assert the status changes to ReadyForFinalQC.  
    3. Create e2e/procurement-workflow.spec.ts. This test must log in as Procurement, find a new order, approve its BOM, and assert the status change.  
    4. Manually review the entire application, ensuring consistent use of Card, Dialog, Button, and other shadcn/ui components. Fix any layout shifts or inconsistent spacing. Ensure all buttons and interactive elements provide visual feedback via the useToast hook or loading spinners.