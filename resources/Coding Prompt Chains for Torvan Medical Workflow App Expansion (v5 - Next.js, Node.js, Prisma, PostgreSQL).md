# Coding Prompt Chains for Torvan Medical Workflow App Expansion (v5 - Hybrid Backend)

**Document Version:** 5.0
**Date:** June 1, 2025
**Project:** Torvan Medical CleanStation Workflow Digitalization
**Lead:** Sal C.

**Architectural Decision:** This document outlines a **hybrid backend architecture** for the Torvan Medical CleanStation Workflow application:

* **Plain Node.js Backend (`src/` directory):** This backend remains responsible for:
    * **Chain 1:** Core Product Data APIs (Parts, Assemblies, Categories).
    * **Chain 2:** User Authentication & Authorization APIs.
    It utilizes the standard Node.js `http` module, a custom router (`src/lib/router.js`), and API handlers located in `src/api/*.js`. No Express.js framework is used for this part.

* **Next.js API Routes (`app/api/` directory):** This backend approach will be used for:
    * **Chain 3 (and subsequent complex workflows):** Order Creation & Management, File Uploads (e.g., PO documents), Configurator Data Serving, Accessories Data Serving, and Bill of Materials (BOM) generation directly associated with the order creation flow.
    These are TypeScript-based (`*.ts`) route handlers integrated within the Next.js application structure.

This hybrid strategy leverages the stability and existing functionality of the plain Node.js backend for foundational services while utilizing the more developed and integrated Next.js API Routes for the complex, interactive order workflow and future features tightly coupled with the Next.js frontend. This approach aims for an efficient MVP delivery for advanced features.

This document supersedes "Coding Prompt Chains for Torvan Medical Workflow App Expansion (v4 - Next.js, Node.js, Prisma, PostgreSQL).md".

---

## General Guidelines for the AI Coding Assistant (Updated)

**(0.1 - 0.2 remain largely the same as in CPC-v4. Ensure the AI has access to the original details if needed. Key points reiterated below.)**

**0.1. Preserve Core Logic:**
The existing legacy JavaScript files (`app.js`, `sink-config.js`, `accessories.js`, `bom-generator.js`) contain critical configurator and BOM generation logic. This logic must be carefully preserved and integrated into the new application structure, primarily by moving it into backend services (`src/services/`) called by the appropriate backend APIs (either Plain Node.js or Next.js API Routes as defined by this document). Do not rewrite this logic from scratch unless explicitly instructed and for a compelling reason.

**0.2. Refer to Documentation (Primary Sources):**
    * **PRD v1.1:** "Torvan Medical CleanStation Production Workflow Digitalization.md" (Primary Specification).
    * **Sink Config & BOM Details:** "sink configuration and bom.txt".
    * **QC Checklist:** "CLP.T2.001.V01 - T2SinkProduction.docx".
    * **Initial Data:** `parts.json`, `assemblies.json`, `categories.json`.
    * **Legacy UI/UX Reference:** "before sparc _sink prompt .txt" (though PRD NFR Section 6.2 is more current).

**0.3. Technology Stack (Updated Backend Definition):**
    0.3.1. **Frontend:** Latest stable Next.js (using App Router).
    0.3.2. **UI Components:** ShadCN UI, built with Radix UI and Tailwind CSS.
    0.3.3. **Styling:** Tailwind CSS.
    0.3.4. **Animations:** Framer Motion (for dropdowns, modals, page transitions where appropriate).
    0.3.5. **State Management:** Zustand with Immer for client-side state. Persist where necessary (e.g., auth state, multi-step form data).
    **0.3.6. Backend (Hybrid Approach - CRITICAL UPDATE):**
        * **Plain Node.js Backend (`src/` directory):**
            * **Scope:** Core data APIs (Parts, Assemblies, Categories - Chain 1) and Authentication/Authorization APIs (Chain 2).
            * **Implementation:** Uses standard `http` module, custom router (`src/lib/router.js`), and handlers in `src/api/*.js`. No Express.js.
            * **Port:** Standardized to **3004**.
        * **Next.js API Routes (`app/api/` directory):**
            * **Scope:** Order Workflow features (Chain 3+), including Order CRUD, Configurator data serving, Accessories data serving, File Uploads, and BOM generation tied to orders. Also for future complex backend functionalities directly supporting the Next.js frontend.
            * **Implementation:** TypeScript-based (`*.ts`) route handlers within the Next.js framework.
            * **Port:** Runs as part of the Next.js application (e.g., port **3005**).
    0.3.7. **ORM:** Prisma ORM.
    0.3.8. **Database:** PostgreSQL (target database name: "torvan-db").
    0.3.9. **Schema Validation:** Zod for validating API request/response schemas, especially for Next.js API Routes and potentially for plain Node.js handlers if complex.

**(0.4 - 0.10 remain largely the same as in CPC-v4. Ensure the AI has access to the original details if needed. Key points reiterated below.)**

**0.4. Modular Design:** Emphasize separation of concerns. Services in `src/services/` should contain business logic and be callable by either backend type.
**0.5. Version Control:** Follow Git best practices. Commit frequently with clear messages.
**0.6. Testing:** Unit and integration tests are crucial (details TBD in later chains).
**0.7. Security:** Implement security best practices (input validation, parameterized queries via Prisma, secure JWT handling, CSRF protection if applicable, XSS prevention).
**0.8. Compliance:** Adhere to medical device software development guidelines where applicable (documentation, traceability).
**0.9. Accessibility:** Follow WCAG guidelines for frontend development.
**0.10. Phased Approach:** Development will follow the chains outlined. Refer to PRD Section 10 for overall project phases.

---

## Transitional Refactoring Roadmap & Prompts (Hybrid Backend Adoption)

This roadmap guides the transition to the defined hybrid backend architecture and aligns the existing codebase.

### Phase 0: Foundation - Documentation, Configuration, and Next.js API Route Authentication

**Goal:** Establish a solid foundation by updating all guiding documents, standardizing configurations, and ensuring robust authentication for Next.js API Routes.

**Prompt 0.1: Update Project Documentation (README, Architecture Docs)**
"Based on the formal decision to adopt a hybrid backend architecture (Plain Node.js for Chains 1 & 2, Next.js API Routes for Chain 3+ and future complex workflows):
1.  **Update `README-NEW.md`:**
    * Modify the 'Architecture' section to clearly describe this hybrid model, detailing which backend handles which functionalities and why.
    * In the 'Project Structure' section, explicitly state that `src/api/` handlers are for core product data and authentication, while `app/api/` route handlers are for the order workflow and related features.
    * Revise the 'Development Status' section to accurately reflect completed and in-progress items based on this refined architecture.
2.  **Archive CPC-v4:** This document, "Coding Prompt Chains (v5 - Hybrid Backend)", now supersedes "Coding Prompt Chains for Torvan Medical Workflow App Expansion (v4 - Next.js, Node.js, Prisma, PostgreSQL).md". Mark the v4 document as outdated and archive it.
3.  **Internal Docs:** If any other internal architectural diagrams or overview documents exist, ensure they are updated to reflect this hybrid model."

**Prompt 0.2: Standardize Backend Ports & Refactor API Client (`lib/api.ts`)**
"To ensure clarity and prevent conflicts:
1.  **Plain Node.js Backend Port:**
    * Confirm and standardize the port for the plain Node.js backend (`src/server.js`) to **3004**.
    * Update `src/config/environment.js` to set `process.env.PORT` or a default to 3004.
    * Update the `start:backend` script in `package.json` if it specifies a port, to use 3004.
2.  **Next.js Application Port:**
    * Confirm the Next.js application runs on its standard port (e.g., 3005, as per `dev` script in `package.json`).
3.  **Refactor Frontend API Client (`lib/api.ts`):**
    * Modify `lib/api.ts` to manage two distinct Axios instances for clarity:
        * `plainNodeApiClient`: Configured with `baseURL: 'http://localhost:3004/api'`. This client will be used for all calls to the plain Node.js backend (Chain 1: parts, assemblies, categories; Chain 2: auth).
        * `nextJsApiClient`: Configured with `baseURL: '/api'` (which resolves to the Next.js application's own API routes). This client will be used for all calls to Next.js API Routes (Chain 3+: orders, configurator, accessories, uploads).
    * Update existing API calls throughout the frontend:
        * Login (`app/login/page.tsx`): Ensure it uses `plainNodeApiClient.post('/auth/login', ...)`.
        * Order Wizard (`components/order/*` steps, `app/orders/create/page.tsx`): Ensure all calls related to order creation, configurator data, accessories, and PO uploads use `nextJsApiClient`.
        * Any calls fetching core product data (parts, assemblies, categories) directly from the frontend (if any) should use `plainNodeApiClient`.
4.  **Review `next.config.js` Rewrites:**
    * The existing `rewrites` configuration in `next.config.js` (proxying `/api/:path*` to `http://localhost:3001/api/:path*`) was likely intended for a unified backend target.
    * **Action:** Remove this broad rewrite for `/api/:path*`. The explicit `baseURL`s in the refactored `lib/api.ts` make this proxying redundant and potentially confusing. Direct calls are now clearer.
5.  **Environment Variables:**
    * Ensure `.env.example` and the development `.env` file reflect these port configurations if any base URLs were previously parameterized there. `NEXT_PUBLIC_API_URL` might become less relevant if API clients have hardcoded base URLs or use relative paths for Next.js API routes."

**Prompt 0.3: Implement Robust Authentication & Authorization for Next.js API Routes**
"Secure all Next.js API Routes in `app/api/` that require protection:
1.  **Create Authentication Utilities (`lib/nextAuthUtils.ts`):**
    * Develop a new file, `lib/nextAuthUtils.ts`, to house helper functions for JWT verification and user authorization within Next.js Route Handlers.
    * `getAuthUser(req: NextRequest): Promise<User | null>`:
        * Extracts the Bearer token from the `Authorization` header.
        * Verifies the JWT using `jsonwebtoken` and `process.env.JWT_SECRET`.
        * Fetches the user from Prisma using the `userId` from the token.
        * Returns the active user object or `null` if authentication fails.
    * `authorizeUserRole(user: User | null, allowedRoles: UserRole[]): boolean`:
        * Checks if the authenticated user's role is included in the `allowedRoles` array.
2.  **Apply to Next.js API Routes:**
    * In each Next.js API Route handler function (e.g., in `app/api/orders/route.ts`, `app/api/upload/route.ts`, `app/api/configurator/route.ts`, `app/api/accessories/route.ts`):
        * Call `await getAuthUser(request)` at the beginning. If `null`, return a 401 Unauthorized response.
        * If specific roles are required, call `authorizeUserRole(user, ['ROLE_1', 'ROLE_2'])`. If `false`, return a 403 Forbidden response.
    * Example:
        ```typescript
        // In app/api/orders/route.ts
        import { NextRequest, NextResponse } from 'next/server';
        import { User, UserRole } from '@prisma/client'; // Assuming UserRole is your enum
        import { getAuthUser, authorizeUserRole } from '@/lib/nextAuthUtils'; // Adjust path
        import { prisma } from '@/lib/prisma'; // Your Prisma client instance

        export async function POST(request: NextRequest) {
          const authenticatedUser = await getAuthUser(request);

          if (!authenticatedUser) {
            return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
          }

          // Example: Only ADMIN or PRODUCTION_COORDINATOR can create orders
          if (!authorizeUserRole(authenticatedUser, [UserRole.ADMIN, UserRole.PRODUCTION_COORDINATOR])) {
            return NextResponse.json({ message: 'Forbidden: Insufficient permissions' }, { status: 403 });
          }

          // ... (rest of your order creation logic, using authenticatedUser.id as createdById)
          const body = await request.json();
          // ...
          return NextResponse.json({ message: 'Order created successfully', orderId: newOrder.id }, { status: 201 });
        }
        ```
3.  **JWT Secret:** Ensure `JWT_SECRET` is defined in your environment variables and accessible to the Next.js runtime environment (not prefixed with `NEXT_PUBLIC_` unless intentionally public, which it shouldn't be for a secret)."

---

### Phase 1: Solidify Chain 3 Backend (Focus on Next.js API Routes)

**Goal:** Ensure the Next.js API Routes for orders, uploads, configurator, and accessories are the primary, robust, and complete backend endpoints for these functionalities. Deprecate their plain Node.js counterparts.

**Prompt 1.1: Enhance and Finalize Order Management Next.js API Routes**
"Review and complete the Next.js API Routes for order management:
1.  **`app/api/orders/route.ts`:**
    * **`POST` Handler (Create Order):**
        * Confirm robust Zod validation for the request body (`OrderCreateSchema`).
        * Ensure it correctly calls `src/services/bomService.js -> generateBOMForOrder` (or equivalent logic if refactored into the route handler, though service is preferred for separation) and creates `Bom` and `BomItem` records in Prisma as part of the order creation transaction.
        * Verify all related entities (`BasinConfiguration`, `FaucetConfiguration`, `SelectedAccessory`, `AssociatedDocument` if PO uploaded simultaneously) are correctly created and linked.
        * Ensure `OrderHistoryLog` is created for order creation.
        * Return a consistent success response (e.g., `{ orderId: newOrder.id }`).
    * **`GET` Handler (List Orders):**
        * Implement comprehensive role-based filtering (e.g., users see their orders, admins see all, specific roles see orders by status).
        * Add pagination, filtering by status/PO number/customer, and sorting capabilities.
        * Populate necessary relations for list display (e.g., `createdBy.fullName`, basic BOM summary if needed).
2.  **`app/api/orders/[orderId]/route.ts` (Create if not existing for GET by ID):**
    * **`GET` Handler (Get Order by ID):**
        * Implement role-based access control to the specific order.
        * Deeply populate all relations: `createdBy`, `AssociatedDocument`, `Bom` (with `BomItem` hierarchy), `OrderHistoryLog`, all configuration sub-tables (`BasinConfiguration`, etc.).
3.  **`app/api/orders/[orderId]/status/route.ts` (Create if not existing for status updates):**
    * **`PUT` Handler (Update Order Status):**
        * Implement role-based authorization for status transitions (refer to PRD for allowed transitions per role).
        * Validate `newStatus` and transition rules.
        * Update `Order.status` and create an `OrderHistoryLog` entry within a Prisma transaction.
        * Return the updated order object.
4.  **Error Handling:** Ensure robust try/catch blocks and consistent error responses (e.g., `{ message: 'Error details' }`) with appropriate HTTP status codes across all handlers."

**Prompt 1.2: Enhance and Finalize File Upload Next.js API Route (`app/api/upload/route.ts`)**
"Review and complete `app/api/upload/route.ts`:
1.  **`POST` Handler (Upload File, e.g., PO Document):**
    * Verify robust file validation (MIME types like PDF/DOCX, size limits).
    * Implement secure file saving (e.g., to a designated `uploads/` directory, using unique filenames to prevent overwrites). Consider structuring by `orderId` if applicable.
    * Ensure `AssociatedDocument` record is correctly created in Prisma, storing metadata (filename, path, type) and linking to the `orderId` if provided in the request.
2.  **`DELETE` Handler (Delete File - `app/api/upload/[documentId]/route.ts` or similar):**
    * Implement authentication and authorization (e.g., only uploader or admin can delete).
    * Ensure the physical file is deleted from the filesystem.
    * Ensure the corresponding `AssociatedDocument` record is removed from Prisma.
3.  **Error Handling:** Cover scenarios like file system errors, database errors, and invalid inputs."

**Prompt 1.3: Deprecate Corresponding Plain Node.js Handlers**
"Now that Next.js API Routes are primary for orders and uploads:
1.  **In `src/api/ordersHandlers.js`:**
    * Add a prominent comment at the top of `createOrder`, `getOrders`, `getOrderById`, and `updateOrderStatus`: `// DEPRECATED (YYYY-MM-DD): This functionality is now handled by Next.js API Routes in app/api/orders/*.ts. This handler will be removed in a future version.`
2.  **In `src/api/fileUploadHandlers.js`:**
    * Add a similar deprecation comment to `uploadPODocument`.
3.  **In `src/lib/router.js`:**
    * Comment out the routes pointing to these deprecated handlers in `ordersHandlers.js` and `fileUploadHandlers.js`.
    * Add comments indicating the new location of this functionality (e.g., `// Order creation: See Next.js API Route app/api/orders/route.ts`).
This clearly marks the shift and prevents accidental use of the old handlers for these features."

---

### Phase 2: Dynamic Configurator & Accessories Logic (Backend Services & Next.js API Routes)

**Goal:** Transition configurator and accessories data from static/mock in Next.js API Routes to dynamic data fetched via Prisma, orchestrated by backend services (`src/services/`).

**Prompt 2.1: Develop/Enhance `src/services/configuratorService.js`**
"Flesh out `src/services/configuratorService.js`. This module should contain pure business logic and data retrieval functions, callable by Next.js API Routes. It should use Prisma to interact with the database (seeded from `parts.json`, `assemblies.json`, `categories.json`).
1.  **Implement/Refine Functions:**
    * `getSinkModels(family)`: Fetch sink models (e.g., 'T2-B1') for a given family (e.g., 'MDRD').
    * `getLegTypes()`: Fetch available leg types with associated kit/part numbers.
    * `getFeetTypes()`: Fetch available feet types.
    * `getPegboardOptions(sinkDimensions)`: Fetch pegboard types, standard sizes, and implement logic for 'Same as Sink Length' custom part number generation (e.g., "720.215.002 T2-ADW-PB-\[width\]x\[length\]") based on rules in `sink configuration and bom.txt`.
    * `getBasinTypeOptions()`: Fetch basin types (E-Sink, E-Sink DI, E-Drain) and their kits.
    * `getBasinSizeOptions(basinType)`: Fetch standard basin sizes and implement custom generation rules.
    * `getBasinAddonOptions(basinType)`: Fetch addons like P-TRAP, BASIN LIGHT (conditional part numbers).
    * `getFaucetTypeOptions(basinType)`: Fetch faucet types, handling conditional logic (e.g., Gooseneck for E-Sink DI).
    * `getSprayerTypeOptions()`: Fetch sprayer types.
    * `getControlBox(basinConfigurationsArray)`: Implement logic to determine the correct control box assembly based on the combination of E-Sink/E-Drain basins selected.
2.  Ensure all functions use Prisma for data fetching and handle cases where data might be missing or configurations are invalid."

**Prompt 2.2: Develop/Enhance `src/services/accessoriesService.js`**
"Create or enhance `src/services/accessoriesService.js` for accessories data:
1.  **Implement/Refine Functions:**
    * `getAccessoryCategories()`: Fetch accessory categories (Subcategories under "ACCESSORY LIST" category "720").
    * `getAccessoriesByCategory(categoryCode)`: Fetch accessories (assemblies) for a given subcategory.
    * `getAllAccessories({ searchTerm, categoryFilter })`: Fetch all accessories with optional filtering.
2.  All functions should use Prisma."

**Prompt 2.3: Refactor Configurator & Accessories Next.js API Routes**
"Modify the Next.js API Routes to use the new backend services:
1.  **`app/api/configurator/route.ts`:**
    * Import and use the relevant functions from `src/services/configuratorService.js`.
    * The `GET` handler should parse query parameters (e.g., `queryType=sinkModels&family=MDRD`, `queryType=pegboardOptions&width=X&length=Y`) to determine which service function to call.
    * Return the dynamic data from the service.
2.  **`app/api/accessories/route.ts`:**
    * Import and use functions from `src/services/accessoriesService.js`.
    * The `GET` handler should parse query parameters (e.g., `categoryCode`, `searchTerm`) and call the appropriate service function.
    * Return dynamic accessory data.
3.  Ensure these routes are authenticated using `nextAuthUtils.ts` if sensitive configuration data is involved."

**Prompt 2.4: Deprecate Corresponding Plain Node.js Configurator Handlers**
"With dynamic data now served by Next.js API Routes calling backend services:
1.  **In `src/api/configuratorHandlers.js`:**
    * Add a prominent deprecation comment: `// DEPRECATED (YYYY-MM-DD): Configurator & accessories data is now served by Next.js API Routes (app/api/configurator/route.ts & app/api/accessories/route.ts) which call backend services. This handler will be removed.`
2.  **In `src/lib/router.js`:**
    * Comment out the routes pointing to `configuratorHandlers.js`.
    * Add comments indicating the new location of this functionality."

---

### Phase 3: Frontend Integration & Legacy Code Refinement

**Goal:** Ensure the Next.js frontend fully utilizes the dynamic backend services via the updated Next.js API Routes. Progressively refactor or isolate remaining legacy client-side JavaScript.

**Prompt 3.1: Update Frontend Order Creation Steps for Dynamic Data**
"Refactor frontend components in `components/order/` to fetch and use dynamic data:
1.  **`ConfigurationStep.tsx`:**
    * Modify all dropdowns/selections (Sink Model, Legs, Feet, Pegboard, Basins, Faucets, Sprayers, Control Box) to fetch options dynamically from the `/api/configurator` Next.js API route using `nextJsApiClient`.
    * Pass necessary parameters in API calls (e.g., `family` for sink models, selected `basinType` for faucet options).
    * Implement client-side logic to react to selections and fetch dependent options (e.g., re-fetch faucet options when basin type changes).
    * Handle display of custom part numbers generated by the backend for items like custom pegboards/basins.
2.  **`AccessoriesStep.tsx`:**
    * Replace mock data with dynamic data fetched from the `/api/accessories` Next.js API route using `nextJsApiClient`.
    * Implement UI for category filtering and search, passing parameters to the API.
3.  **`orderCreateStore.ts` (Zustand Store):**
    * Ensure the store correctly captures all selected IDs, quantities, custom part numbers, and configuration details derived from the dynamic data.
    * This store will be the source of truth for building the payload for the `POST /api/orders` request in `ReviewStep.tsx`."

**Prompt 3.2: Strategize Legacy JavaScript File Usage (`app.js`, `sink-config.js`, etc.)**
"Review the role of legacy JavaScript files (`app.js`, `sink-config.js`, `accessories.js`, `bom-generator.js`) in the context of the Next.js application:
1.  **Identify Remaining Essential Logic:**
    * For each legacy file, determine if any client-side logic (e.g., complex UI interactions not easily replicable with React state, specific validation rules, unique display formatting) is still absolutely essential and not yet ported to React components or backend services.
2.  **Migration Path:**
    * Prioritize migrating any such essential client-side logic into relevant React components (`.tsx` files) or TypeScript utility functions (`lib/utils.ts`).
    * Configuration *rules* and BOM *calculation* logic should reside in `src/services/` and be consumed via APIs.
3.  **Phasing Out `index.html`:**
    * The primary application entry point is now `app/layout.tsx` and `app/page.tsx` (or other Next.js pages).
    * `index.html` and its associated `styles.css` are for the legacy, non-React version.
    * **Decision Point for `index.html`:** Determine if `index.html` (and the legacy JS it loads) needs to remain accessible for a specific reason (e.g., a temporary fallback, direct comparison during transition). If the Next.js application (`app/orders/create/page.tsx`) is the sole path for order creation, then `index.html` is effectively obsolete for this workflow.
4.  **CSS Migration:**
    * Ensure any unique and valuable CSS from `styles.css` that aligns with the new UI/UX (PRD Section 6.2) has been migrated to Tailwind utility classes within components or added to `app/globals.css`.
5.  **Goal:** Minimize and eventually eliminate direct reliance on these global legacy JS files for the Next.js application. If `index.html` is kept, it should be for a clearly defined, separate purpose, not as part of the main Next.js app flow."

**Prompt 3.3: Final Review of Frontend API Calls**
"Conduct a final sweep of the Next.js frontend codebase:
1.  Ensure all backend API calls correctly use either `plainNodeApiClient` (for Chain 1 & 2 APIs) or `nextJsApiClient` (for Chain 3+ APIs) from the refactored `lib/api.ts`.
2.  Verify that authentication tokens (JWT) are correctly included in requests to protected endpoints for both backend types.
3.  Confirm consistent error handling for API responses in the frontend (e.g., displaying toasts for errors, handling 401/403 responses by redirecting to login or showing error messages)."

---
## Chain 4: Role-Based Dashboards & Order Viewing (PRD UC 1.2, 1.3, 1.4, 1.5)

**Goal:** Implement role-specific dashboards for users to view and manage orders relevant to their roles. APIs for fetching orders are established in Phase 1 (Prompt 1.1) as Next.js API Routes.

**Backend Focus:** Next.js API Routes (primarily using existing order APIs).
**Frontend Focus:** Next.js (App Router), ShadCN UI, Zustand.

**Prompt 4.1: Basic Dashboard Structure & Navigation (`app/dashboard/page.tsx`)**
"Enhance `app/dashboard/page.tsx`:
1.  This page should act as a central hub or redirect to role-specific dashboard views.
2.  Use the `useAuthStore` to get the current user's role.
3.  Based on the role, display:
    * A welcoming message.
    * A summary of relevant information (e.g., number of open orders for their role).
    * Quick action buttons (e.g., "Create New Order" for `ADMIN`/`PRODUCTION_COORDINATOR`, "View Assigned Tasks" for `ASSEMBLER`/`QC_PERSON`).
    * Links or tabs to navigate to detailed views/tables for their orders or tasks.
4.  Use ShadCN UI components like `Card`, `Button`, `Tabs` for layout and interaction.
5.  Ensure the `AppHeader` component is present and provides consistent navigation."

**Prompt 4.2: Production Coordinator Dashboard View (PRD UC 1.2)**
"Create a new component, e.g., `components/dashboard/ProductionCoordinatorDashboard.tsx`, to be displayed within `app/dashboard/page.tsx` or as a separate route like `app/dashboard/production/page.tsx` if preferred.
1.  **Order List:**
    * Fetch orders using `nextJsApiClient.get('/api/orders?status=PENDING&status=IN_PROGRESS&status=READY_FOR_QC...')` (adjust statuses as per PRD).
    * Display orders in a ShadCN `DataTable` with columns: PO Number, Customer Name, Order Date, Status, Build Numbers, Assigned To (if applicable), Actions (View Details).
    * Implement client-side or server-side pagination, sorting, and filtering for the DataTable.
2.  **Order Details View:**
    * Clicking "View Details" should navigate to a dynamic route `app/orders/[orderId]/page.tsx` (create this page).
    * This page should fetch detailed order data (using `GET /api/orders/[orderId]`) including customer info, full configuration, accessories, BOM, PO document link, and order history.
    * Display this information clearly using ShadCN components.
    * Allow Production Coordinators to update order status (e.g., "Assign to Assembler", "Mark as Ready for QC") by calling the `PUT /api/orders/[orderId]/status` Next.js API Route.
3.  **Quick Actions:** Buttons for "Create New Order" (links to `/orders/create`)."

**Prompt 4.3: Procurement Specialist Dashboard View (PRD UC 1.3)**
"Create `components/dashboard/ProcurementSpecialistDashboard.tsx` (or `app/dashboard/procurement/page.tsx`).
1.  **Order List (Focus on BOM Requirements):**
    * Fetch orders, perhaps filtered by statuses indicating parts may need procurement (e.g., `PENDING_PROCUREMENT`, `PENDING_ASSEMBLY`).
    * Display orders in a DataTable with columns: PO Number, Order Date, Status, Key Components from BOM (this might require specific BOM summary data from the API or client-side processing).
    * Link to the full Order Details page (`app/orders/[orderId]/page.tsx`).
2.  **BOM View/Export:**
    * On the Order Details page, ensure the BOM is clearly displayed.
    * Implement functionality to trigger a BOM export (CSV/PDF - this is a Chain 7 task, but the button/placeholder can be added here).
3.  **Service Order Requests (Future - Chain 10):** Placeholder for viewing service part requests."

**Prompt 4.4: Assembler Dashboard View (PRD UC 1.4)**
"Create `components/dashboard/AssemblerDashboard.tsx` (or `app/dashboard/assembly/page.tsx`).
1.  **Assigned Orders/Tasks List:**
    * Fetch orders assigned to the logged-in assembler or with status `READY_FOR_ASSEMBLY` / `ASSEMBLY_IN_PROGRESS`.
    * Display in a DataTable: PO Number, Sink Type/Model, Due Date (if available), Status, Actions (View Details, Start Assembly, Complete Assembly, View QC Checklist).
2.  **Order Details View:** Access to `app/orders/[orderId]/page.tsx` to view full configuration and BOM.
3.  **Workflow Actions:**
    * "Start Assembly": Updates order status via `PUT /api/orders/[orderId]/status`.
    * "Complete Assembly": Updates order status.
    * "View/Fill QC Checklist": Links to QC checklist functionality (Chain 6)."

**Prompt 4.5: QC Person Dashboard View (PRD UC 1.5)**
"Create `components/dashboard/QCPersonDashboard.tsx` (or `app/dashboard/qc/page.tsx`).
1.  **Orders Ready for QC List:**
    * Fetch orders with status `READY_FOR_QC` or `QC_IN_PROGRESS`.
    * Display in a DataTable: PO Number, Sink Type/Model, Assembly Completion Date, Status, Actions (View Details, Start QC, View/Fill QC Checklist).
2.  **Order Details View:** Access to `app/orders/[orderId]/page.tsx`.
3.  **Workflow Actions:**
    * "Start QC": Updates order status.
    * "Pass QC / Fail QC": Updates order status and potentially triggers other workflow steps (e.g., creating rework tasks or moving to `READY_FOR_SHIPPING`).
    * "View/Fill QC Checklist": Links to QC checklist functionality (Chain 6)."

**Prompt 4.6: Admin Dashboard View**
"The Admin role should have a comprehensive view.
1.  **User Management Link:** (Future Chain - if user management UI is built).
2.  **All Orders List:** Access to all orders with advanced filtering capabilities.
3.  **System Logs/Analytics Overview:** (Future Chain - placeholders).
4.  Ability to perform actions available to other roles (e.g., update any order status)."

---

## Chain 5: Workflow State Management & Progression (PRD Section 4 & 5.1.3)

**Goal:** Implement robust order status transitions, history logging, and basic notifications. Order status update API is established in Phase 1 (Prompt 1.1) as a Next.js API Route.

**Backend Focus:** Next.js API Routes (for notifications).
**Frontend Focus:** Next.js, ShadCN UI, Zustand.

**Prompt 5.1: Solidify Order Status Transitions in `PUT /api/orders/[orderId]/status`**
"Review the `PUT /api/orders/[orderId]/status` Next.js API Route:
1.  Ensure it strictly validates allowed status transitions based on the current status and user role (as defined in PRD or business logic). For example, an Assembler cannot move an order from `PENDING` to `SHIPPED`.
2.  Log every status change to the `OrderHistoryLog` table, including `userId` of who made the change, `previousStatus`, `newStatus`, and a timestamp.
3.  Consider adding a `notes` field to `OrderHistoryLog` and allow users to add a note when changing status via the API."

**Prompt 5.2: Frontend Workflow Actions**
"In the Order Details page (`app/orders/[orderId]/page.tsx`) and relevant dashboard views:
1.  Display action buttons (e.g., "Start Assembly", "Pass QC") conditionally based on the order's current status and the user's role.
2.  Clicking these buttons should call the `PUT /api/orders/[orderId]/status` Next.js API Route with the appropriate `newStatus`.
3.  Provide a modal for users to add optional notes when performing a status change action.
4.  Refresh order data or redirect as appropriate after a successful status update.
5.  Display the `OrderHistoryLog` on the Order Details page in a readable format (e.g., a timeline or a table)."

**Prompt 5.3: Notification System - Prisma Model & Basic API (Next.js API Route)**
"Implement a basic notification system:
1.  **Prisma Model (`Notification` - PRD Section 5.10):**
    * `id`, `userId` (recipient), `message`, `isRead` (boolean, default false), `linkTo` (optional URL, e.g., `/orders/[orderId]`), `createdAt`.
2.  **Next.js API Route (`app/api/notifications/route.ts`):**
    * `GET /api/notifications`: Fetches unread notifications for the authenticated user.
    * `POST /api/notifications/mark-read`: Marks specified notifications (or all) as read for the authenticated user.
3.  **Backend Service (`src/services/notificationService.js` - Optional but Recommended):**
    * `createNotification(userId, message, linkTo)`: A helper function to create notification records in Prisma. This can be called from other services or API routes when a notable event occurs (e.g., order status change, new assignment)."

**Prompt 5.4: Frontend Notification Display**
"1.  **Notification Icon & Popover:**
    * In `AppHeader.tsx`, add a notification bell icon (e.g., from Lucide Icons).
    * Display a badge with the count of unread notifications (fetched via `GET /api/notifications`).
    * Clicking the icon should open a ShadCN `Popover` or `DropdownMenu` listing recent unread notifications. Each notification should be clickable, navigating to `linkTo` if provided, and marking it as read.
2.  **Real-time (Optional - Future Enhancement):** For MVP, polling or fetching on navigation is fine. Real-time (WebSockets) is a future enhancement."

---

## Chain 6: Production & QC Checklists (PRD UC 2.1, 2.2, 2.3, Section 5.8, 5.9 & Attachment CLP.T2.001.V01)

**Goal:** Implement dynamic QC checklists for production, allowing admins to manage templates and production staff to fill them out.

**Backend Focus:** Next.js API Routes, New Prisma Models.
**Frontend Focus:** Next.js, ShadCN UI.

**Prompt 6.1: Prisma Models for QC Checklists**
"Define Prisma models based on PRD Section 5.8, 5.9 and the structure of `CLP.T2.001.V01 - T2SinkProduction.docx`:
1.  **`QcFormTemplate`:**
    * `id`, `name` (e.g., "T2 Sink Production Checklist"), `version`, `description?`, `isActive` (boolean), `appliesToProductFamily?` (e.g., "MDRD_T2_SINK"), `createdAt`, `updatedAt`.
    * `items (QcFormTemplateItem[])`.
2.  **`QcFormTemplateItem`:**
    * `id`, `templateId (QcFormTemplate @relation)`, `section` (e.g., "Pre-Assembly Checks", "Basin Installation"), `checklistItem` (text of the check), `itemType` (Enum: `PASS_FAIL`, `TEXT_INPUT`, `NUMERIC_INPUT`, `SINGLE_SELECT`, `MULTI_SELECT`), `options?` (JSON or string array for select types), `expectedValue?` (for validation), `order` (for display sequence).
3.  **`OrderQcResult`:**
    * `id`, `orderId (Order @relation)`, `qcFormTemplateId (QcFormTemplate @relation)`, `qcPerformedById (User @relation)`, `qcTimestamp`, `overallStatus` (Enum: `PENDING`, `IN_PROGRESS`, `PASSED`, `FAILED`), `notes?`.
    * `itemResults (OrderQcItemResult[])`.
4.  **`OrderQcItemResult`:**
    * `id`, `orderQcResultId (OrderQcResult @relation)`, `qcFormTemplateItemId (QcFormTemplateItem @relation)`, `resultValue` (string, to store various input types), `isConformant?` (boolean, for pass/fail), `notes?`.
Run `prisma migrate dev` after defining models."

**Prompt 6.2: APIs for QC Form Templates (Next.js API Routes - Admin)**
"Create Next.js API Routes under `app/api/admin/qc-templates/`:
1.  **`POST /api/admin/qc-templates`:** Creates a new `QcFormTemplate` with its `QcFormTemplateItem`s. (Admin role)
2.  **`GET /api/admin/qc-templates`:** Lists all `QcFormTemplate`s. (Admin role)
3.  **`GET /api/admin/qc-templates/[templateId]`:** Gets a specific `QcFormTemplate` with its items. (Admin role)
4.  **`PUT /api/admin/qc-templates/[templateId]`:** Updates a `QcFormTemplate` and its items. (Admin role)
5.  **`DELETE /api/admin/qc-templates/[templateId]`:** Deletes a `QcFormTemplate`. (Admin role)
Use Zod for schema validation. Authenticate and authorize using `nextAuthUtils.ts`."

**Prompt 6.3: Frontend UI for QC Form Template Management (Admin)**
"Create new pages under `app/admin/qc-templates/`:
1.  **List Page (`app/admin/qc-templates/page.tsx`):**
    * Displays `QcFormTemplate`s in a ShadCN DataTable.
    * Actions: Create New, Edit, Delete.
2.  **Create/Edit Page (`app/admin/qc-templates/new/page.tsx`, `app/admin/qc-templates/[templateId]/edit/page.tsx`):**
    * Form to define `QcFormTemplate` details (name, version, etc.).
    * Dynamic form section to add/edit/reorder `QcFormTemplateItem`s (section, checklist item text, item type, options for select).
    * Use `react-hook-form` and ShadCN components.
    * Submits to the APIs created in Prompt 6.2."

**Prompt 6.4: APIs for Filling & Viewing QC Results (Next.js API Routes - Production/QC Roles)**
"Create Next.js API Routes under `app/api/orders/[orderId]/qc/`:
1.  **`GET /api/orders/[orderId]/qc/template?productFamily=[family]`:** Fetches the active `QcFormTemplate` applicable to the order's product family.
2.  **`POST /api/orders/[orderId]/qc`:** Submits `OrderQcResult` and its `OrderQcItemResult`s. (Assembler/QC Person roles).
    * Creates/updates the `OrderQcResult` for the given order.
3.  **`GET /api/orders/[orderId]/qc`:** Retrieves the saved `OrderQcResult` (with items) for an order.
Use Zod for validation. Authenticate and authorize."

**Prompt 6.5: Frontend UI for Filling QC Checklists (Production/QC Roles)**
"Create a new page, e.g., `app/orders/[orderId]/qc/fill/page.tsx`:
1.  Fetch the applicable `QcFormTemplate` using `GET /api/orders/[orderId]/qc/template`.
2.  If an existing `OrderQcResult` exists for this order, fetch and pre-fill it.
3.  Dynamically render the checklist based on `QcFormTemplateItem`s:
    * Group items by `section`.
    * Render appropriate input controls (ShadCN `Checkbox` for PASS_FAIL, `Input` for TEXT/NUMERIC, `RadioGroup` for SINGLE_SELECT, multiple `Checkbox` for MULTI_SELECT).
4.  Allow users (Assembler/QC Person) to fill in results and add notes.
5.  Submit button calls `POST /api/orders/[orderId]/qc`.
6.  A read-only view of the completed QC checklist should also be available on the Order Details page."

---

## Chain 7: BOM Management & Reporting Enhancement

**Goal:** Enhance BOM accessibility, implement backend export functionality. BOM generation is part of Chain 3 (Next.js API Route). Accessing BOMs is via order details API (Next.js API Route).

**Backend Focus:** Next.js API Routes (for export).
**Frontend Focus:** Next.js.

**Prompt 7.1: API for BOM Export (Next.js API Route)**
"Create a Next.js API Route: `GET /api/orders/[orderId]/bom/export?format=csv` (or `pdf` in future):
1.  Fetches the `Bom` and `BomItem` data for the specified `orderId`.
2.  **CSV Export:**
    * Formats the hierarchical BOM data into a CSV structure (e.g., Level, Part Number, Description, Quantity, Type).
    * Sets appropriate headers for CSV download (e.g., `Content-Disposition: attachment; filename="bom_order_[orderId].csv"`, `Content-Type: text/csv`).
    * Streams the CSV data in the response.
3.  **PDF Export (Future):** Placeholder for now, can be implemented later using libraries like `pdfmake` or `puppeteer`.
4.  Authenticate and authorize the request."

**Prompt 7.2: Frontend BOM View & Export Trigger**
"1.  **Order Details Page (`app/orders/[orderId]/page.tsx`):**
    * Ensure the BOM (fetched as part of order details) is displayed clearly, showing hierarchy (e.g., using nested lists or a tree component).
    * Include columns: Level, Part Number, Name/Description, Quantity, Type (Part/Assembly).
2.  **Export Button:**
    * Add an "Export BOM (CSV)" button on the Order Details page.
    * Clicking this button should make a GET request to `/api/orders/[orderId]/bom/export?format=csv`. The browser will handle the download."

**Prompt 7.3: Share BOM (Placeholder/Simple Implementation)**
"For MVP, 'sharing' a BOM can be achieved by the user downloading the CSV/PDF and emailing it.
If a more integrated sharing feature is needed (e.g., generating a shareable link), this can be a future enhancement. For now, focus on robust export."

---

## Chain 8: UI/UX Refinement and Styling Consistency

**Goal:** Ensure a polished, consistent, and user-friendly interface across the application, adhering to PRD Section 6.2.

**Backend Focus:** Minimal, potentially minor API adjustments for UI needs.
**Frontend Focus:** Next.js, ShadCN UI, Tailwind CSS, Framer Motion.

**Prompt 8.1: Consistent Application of ShadCN UI & Tailwind CSS**
"Review the entire application for consistent use of ShadCN UI components and Tailwind CSS utility classes:
1.  Ensure forms, buttons, tables, modals, cards, etc., follow a unified style.
2.  Check for responsive design on all pages, ensuring usability on various screen sizes (mobile, tablet, desktop).
3.  Verify consistent spacing, typography, and color usage as per a defined style guide (if one exists) or common sense best practices.
4.  Update `app/globals.css` for any global styles or Tailwind component customizations."

**Prompt 8.2: Implement Framer Motion for Micro-interactions**
"Identify areas where subtle animations can enhance user experience (PRD NFR 6.2.3):
1.  Apply Framer Motion to:
    * Dropdown menus and select components.
    * Modal dialogs (entry/exit animations).
    * Tab transitions.
    * Subtle hover effects on interactive elements.
    * Page transitions (optional, if it doesn't hinder performance).
2.  Ensure animations are smooth, non-intrusive, and improve perceived performance or provide meaningful feedback."

**Prompt 8.3: Accessibility Review (WCAG AA)**
"Perform an accessibility review (PRD NFR 6.5):
1.  Check for proper ARIA attributes on interactive components (especially custom ShadCN components).
2.  Ensure sufficient color contrast for text and UI elements.
3.  Verify keyboard navigability for all interactive elements.
4.  Ensure all images have appropriate `alt` text (or are marked as decorative if so).
5.  Test with screen reader software (e.g., NVDA, VoiceOver) for basic usability."

**Prompt 8.4: Error Handling and User Feedback**
"Improve user feedback mechanisms:
1.  Use ShadCN `Toast` (via `useToast` hook) consistently for success messages, error messages, and warnings from API calls or client-side actions.
2.  Implement clear loading states (e.g., ShadCN `Skeleton` components, spinners in buttons) for asynchronous operations.
3.  Provide helpful and user-friendly error messages. Avoid technical jargon."

---

## Chain 9: Implementing Other Sink Families (e.g., Endoscope CleanStation, InstoSink)

**Goal:** Extend the configurator and BOM generation to support other sink families as defined in PRD Section 1.3.

**Backend Focus:** Updates to `src/services/configuratorService.js` and `src/services/bomService.js`. Next.js API Routes for configurator should adapt.
**Frontend Focus:** Next.js (updating UI in `ConfigurationStep.tsx` based on new options).

**Prompt 9.1: Update Backend Services for New Sink Families**
"1.  **`src/services/configuratorService.js`:**
    * Extend functions like `getSinkModels`, `getBasinTypeOptions`, `getFaucetTypeOptions`, etc., to handle new product families ("ENDOSCOPE_CLEANSTATION", "INSTROSINK").
    * This will involve adding new data/logic based on the specific configurations and parts for these families (refer to `assemblies.json`, `parts.json`, and any specific documentation for these families).
    * Ensure the `getControlBox` logic is updated or extended for new basin combinations.
2.  **`src/services/bomService.js`:**
    * Verify that `generateBOMForOrder` can correctly process configurations from the new sink families and include all appropriate parts and sub-assemblies.
    * Add any new specific BOM generation rules for these families.
3.  **Database Seeding:** If new parts/assemblies specific to these families are introduced, update `parts.json`/`assemblies.json` and ensure `scripts/seed.js` can handle them, or create new seed scripts."

**Prompt 9.2: Update Frontend Configurator UI**
"1.  **`SinkSelectionStep.tsx`:**
    * Remove the "Under Construction" message for "Endoscope CleanStation" and "InstoSink".
    * Allow users to select these families.
2.  **`ConfigurationStep.tsx`:**
    * When a new family is selected, ensure the component fetches and displays the correct configuration options (sink models, basin types, etc.) from the `/api/configurator` Next.js API route.
    * The UI should adapt to potentially different configuration parameters or options for these new families."

**Prompt 9.3: Testing for New Families**
"Thoroughly test the order creation workflow for each new sink family:
1.  Verify all configuration options are displayed correctly.
2.  Confirm BOM generation is accurate.
3.  Ensure pricing (if implemented) and part numbers are correct."

---

## Chain 10: Service Department Workflow (PRD UC 3.5, 6.1, Section 5.11)

**Goal:** Implement a system for the Service Department to request parts for repairs or stock, and for Procurement to manage these requests.

**Backend Focus:** New Prisma Models, New Next.js API Routes.
**Frontend Focus:** Next.js, ShadCN UI.

**Prompt 10.1: Prisma Models for Service Orders**
"Define Prisma models based on PRD Section 5.11:
1.  **`ServiceOrder`:**
    * `id`, `requestedById (User @relation)`, `requestTimestamp`, `status` (Enum: `ServiceOrderStatus` - e.g., `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `ORDERED`, `RECEIVED`), `notes?` (for requestor), `procurementNotes?` (for procurement).
    * `items (ServiceOrderItem[])`.
2.  **`ServiceOrderItem`:**
    * `id`, `serviceOrderId (ServiceOrder @relation)`, `partId (Part @relation)`, `quantityRequested`, `quantityApproved?`, `notes?`.
Run `prisma migrate dev`."

**Prompt 10.2: APIs for Service Orders (Next.js API Routes)**
"Create Next.js API Routes under `app/api/service-orders/`:
1.  **`POST /api/service-orders`:** Creates a new `ServiceOrder` with its items. (Role: `SERVICE_DEPARTMENT`).
2.  **`GET /api/service-orders`:** Lists `ServiceOrder`s.
    * Role-based filtering: Service Dept sees their requests; Procurement/Admin see all.
    * Filter by status, date range.
3.  **`GET /api/service-orders/[serviceOrderId]`:** Gets a specific `ServiceOrder` with items and related user/part details.
4.  **`PUT /api/service-orders/[serviceOrderId]`:** Updates a `ServiceOrder` (e.g., Procurement Specialist approves quantities, adds notes, updates status). (Roles: `PROCUREMENT_SPECIALIST`, `ADMIN`).
Use Zod for validation. Authenticate and authorize."

**Prompt 10.3: Frontend - Service Part Ordering UI (Service Department Role - PRD UC 6.1)**
"Create new pages under `app/service-orders/`:
1.  **Request Page (`app/service-orders/new/page.tsx`):**
    * For `SERVICE_DEPARTMENT` role.
    * UI to search/browse parts (reuse parts listing components if possible, fetching from `/api/parts` - plain Node.js API).
    * Ability to add parts and quantities to a "request cart" (manage with Zustand or local component state).
    * Field for overall request notes.
    * Submit button calls `POST /api/service-orders`.
2.  **List View (`app/service-orders/page.tsx`):**
    * Displays a list of their submitted `ServiceOrder`s with status, request date.
    * Links to a detail view."

**Prompt 10.4: Frontend - Service Order Management UI (Procurement/Admin Roles)**
"Enhance or create views for `PROCUREMENT_SPECIALIST` and `ADMIN` roles:
1.  **List View (accessible via Dashboard or `app/service-orders/manage/page.tsx`):**
    * Displays all `ServiceOrder`s, filterable by status (especially `PENDING_APPROVAL`).
    * DataTable with columns: Request ID, Requestor, Date, Status, Actions (View Details).
2.  **Detail/Edit View (`app/service-orders/[serviceOrderId]/manage/page.tsx`):**
    * Displays full `ServiceOrder` details including requested items.
    * Allows Procurement to:
        * Approve/modify quantities for each `ServiceOrderItem`.
        * Add procurement notes.
        * Update the overall `ServiceOrder.status` (e.g., to `APPROVED`, `ORDERED`).
    * Submits changes via `PUT /api/service-orders/[serviceOrderId]`."

---

This concludes the planned chains for now. Further chains or enhancements can be added as needed.
