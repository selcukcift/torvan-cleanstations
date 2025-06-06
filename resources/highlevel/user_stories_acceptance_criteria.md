# User Stories & Acceptance Criteria
## Torvan Medical CleanStation Production Workflow Digitalization

**Version:** 1.0  
**Date:** June 2, 2025  
**Document Type:** User Stories & Acceptance Criteria  

---

## 1. Authentication & User Management

### Epic 1.1: User Authentication
**As a system user, I want to securely log into the system so that I can access role-appropriate functionality.**

#### Story 1.1.1: User Login
**As a** registered user  
**I want to** log into the system with my credentials  
**So that** I can access the application features appropriate to my role  

**Acceptance Criteria:**
- [ ] User can enter username and password
- [ ] System validates credentials against database
- [ ] Successful login redirects to role-appropriate dashboard
- [ ] Failed login shows appropriate error message
- [ ] Account lockout after 5 failed attempts
- [ ] Session expires after 8 hours of inactivity
- [ ] User session is maintained across browser tabs

**Definition of Done:**
- Login form implemented with validation
- Authentication middleware configured
- Role-based redirects working
- Security measures implemented (rate limiting, session management)
- Unit and integration tests written

#### Story 1.1.2: User Logout
**As a** logged-in user  
**I want to** securely log out of the system  
**So that** my session is terminated and data is protected  

**Acceptance Criteria:**
- [ ] Logout button available in navigation
- [ ] Logout clears user session
- [ ] Logout redirects to login page
- [ ] All tabs logged out simultaneously
- [ ] Confirmation message displayed

#### Story 1.1.3: Role-Based Access Control
**As a** system administrator  
**I want** users to only access features appropriate to their role  
**So that** data security and workflow integrity is maintained  

**Acceptance Criteria:**
- [ ] Production Coordinator can create and manage orders
- [ ] Admin has full system access
- [ ] Procurement Specialist can manage BOMs and parts
- [ ] QC Person can access quality control functions
- [ ] Assembler can view and complete assembly tasks
- [ ] Service Department can order service parts only
- [ ] Unauthorized access attempts are blocked and logged

## 2. Order Creation & Management

### Epic 2.1: Order Creation Wizard
**As a Production Coordinator, I want to create production orders through a guided process so that all necessary information is captured accurately.**

#### Story 2.1.1: Customer & Order Information (Step 1)
**As a** Production Coordinator  
**I want to** enter customer and order details  
**So that** the production order has complete customer information  

**Acceptance Criteria:**
- [ ] Form accepts PO Number (min 3 chars, unique validation)
- [ ] Customer Name field (min 3 chars, required)
- [ ] Project Name field (optional)
- [ ] Sales Person selection/entry (min 3 chars)
- [ ] Desired Delivery Date picker (future dates only)
- [ ] PO Document upload (PDF, max 10MB)
- [ ] Notes text area (optional)
- [ ] Document Language selection (EN, FR, SP)
- [ ] Validation errors displayed inline
- [ ] Progress indicator shows step 1 of 5
- [ ] Next button enables only when required fields complete

**Definition of Done:**
- Form component implemented with validation
- File upload functionality working
- Data persisted to database
- Error handling implemented
- Responsive design working

#### Story 2.1.2: Sink Selection & Quantity (Step 2)
**As a** Production Coordinator  
**I want to** specify sink family, quantity, and build numbers  
**So that** the order structure is defined  

**Acceptance Criteria:**
- [ ] Sink Family selection (MDRD available, others show "Under Construction")
- [ ] Quantity input (positive integer, max 10)
- [ ] Build Number assignment for each sink (alphanumeric, unique)
- [ ] Build Number auto-generation option available
- [ ] Build Number uniqueness validation (within PO or global)
- [ ] Dynamic form updates based on quantity
- [ ] Back button returns to step 1 with data preserved
- [ ] Next button enables when all build numbers assigned

#### Story 2.1.3: MDRD Sink Configuration (Step 3)
**As a** Production Coordinator  
**I want to** configure each sink's specifications  
**So that** the exact product requirements are captured  

**Acceptance Criteria:**

**Sink Body Configuration:**
- [ ] Sink Model selection (T2-B1, T2-B2, T2-B3)
- [ ] Sink Dimensions input (Width/Length in inches, positive integers)
- [ ] Legs Type selection (Height Adjustable/Fixed Height)
- [ ] Legs Model dropdown based on type (DL27, DL14, LC1)
- [ ] Feet Type selection (Lock & Leveling Casters/S.S Adjustable Seismic Feet)
- [ ] Pegboard toggle (Yes/No)
- [ ] Pegboard Color dropdown (when enabled)
- [ ] Pegboard Type selection (Perforated/Solid)
- [ ] Pegboard Size options (Same as Sink Length/Custom Size)
- [ ] Custom pegboard dimensions input (when Custom selected)
- [ ] Workflow Direction selection (Left to Right/Right to Left)

**Basin Configuration (per basin based on model):**
- [ ] Basin Type selection (E-Sink, E-Sink DI, E-Drain)
- [ ] Basin Size selection (standard sizes + Custom option)
- [ ] Custom basin dimensions input (W x L x D inches)
- [ ] Basin Add-ons checkboxes (P-TRAP, Basin Light)
- [ ] Dynamic form updates based on sink model
- [ ] Configuration validation per basin

**Faucet Configuration:**
- [ ] Faucet Type selection
- [ ] Auto-selection for E-Sink DI (GOOSENECK TREATED WATER)
- [ ] Faucet Quantity input (max based on basin count)
- [ ] Faucet Placement selection (options based on basin count)
- [ ] Sprayer toggle (Yes/No)
- [ ] Sprayer Type selection (when enabled)
- [ ] Sprayer Quantity input (1 or 2)
- [ ] Sprayer Location selection

**Definition of Done:**
- Complex form with conditional logic implemented
- Real-time validation working
- Data structure properly designed
- All configuration options functional
- Form state management working

#### Story 2.1.4: Add-on Accessories (Step 4)
**As a** Production Coordinator  
**I want to** select additional accessories for the order  
**So that** all customer requirements are included  

**Acceptance Criteria:**
- [ ] Accessory library displays available items
- [ ] Search and filter functionality
- [ ] Categories browsing (from categories.json)
- [ ] Quantity selection for each accessory
- [ ] Selected accessories summary display
- [ ] Remove accessories functionality
- [ ] Real-time total calculation
- [ ] Accessory images and descriptions shown

#### Story 2.1.5: Review and Submit (Step 5)
**As a** Production Coordinator  
**I want to** review the complete order before submission  
**So that** I can verify all details are correct  

**Acceptance Criteria:**
- [ ] Complete order summary displayed
- [ ] Customer information summary
- [ ] All sink configurations shown by build number
- [ ] Preliminary BOM preview
- [ ] Accessories list with quantities
- [ ] Edit buttons for each section (return to previous steps)
- [ ] Order total calculations
- [ ] Submit button creates order in database
- [ ] Success confirmation with order number
- [ ] Order status set to "Order Created"

### Epic 2.2: Order Management
**As various users, I want to view and manage production orders so that I can track progress and take appropriate actions.**

#### Story 2.2.1: Order List View
**As a** user with order access  
**I want to** view a list of production orders  
**So that** I can see order status and select orders to work on  

**Acceptance Criteria:**
- [ ] Paginated list of orders (10, 25, 50 per page)
- [ ] Order information displayed: PO#, Build#, Customer, Want Date, Status
- [ ] Filter by status, customer, date range
- [ ] Sort by PO#, customer, want date, created date
- [ ] Search functionality across visible fields
- [ ] Status badges with color coding
- [ ] Click order row to view details
- [ ] Role-based action buttons visible
- [ ] Responsive table design

#### Story 2.2.2: Order Detail View
**As a** user with order access  
**I want to** view complete order details  
**So that** I can understand the full order specification  

**Acceptance Criteria:**
- [ ] Complete order information displayed
- [ ] Customer details section
- [ ] Sink configuration details
- [ ] Basin configuration breakdown
- [ ] Faucet and sprayer specifications
- [ ] Accessories list
- [ ] Generated BOM display
- [ ] Order status history
- [ ] Associated documents list
- [ ] Current assignee information
- [ ] Timeline of status changes
- [ ] Download/print options
- [ ] Edit options (role-dependent)

#### Story 2.2.3: Order Status Updates
**As a** user with appropriate permissions  
**I want to** update order status  
**So that** the workflow progresses correctly  

**Acceptance Criteria:**
- [ ] Status dropdown with valid next states
- [ ] Notes field for status change reason
- [ ] Assignee selection (when applicable)
- [ ] Confirmation dialog for status change
- [ ] Audit trail entry created
- [ ] Notifications sent to relevant users
- [ ] Status change restrictions by role
- [ ] Timestamp recorded
- [ ] History log updated

## 3. BOM Generation & Management

### Epic 3.1: Automated BOM Generation
**As the system, I want to automatically generate accurate BOMs based on sink configurations so that procurement and assembly have complete parts lists.**

#### Story 3.1.1: BOM Generation Engine
**As a** Production Coordinator  
**I want** the system to automatically generate a BOM when I create an order  
**So that** all required parts are identified  

**Acceptance Criteria:**
- [ ] BOM generated upon order creation
- [ ] Configuration mapping rules applied
- [ ] Hierarchical structure created (assemblies, sub-assemblies, parts)
- [ ] Custom part numbers generated for custom sizes
- [ ] Standard manuals included based on language selection
- [ ] Quantities calculated correctly
- [ ] Optional components included only when selected
- [ ] BOM linked to order in database
- [ ] Generation errors logged and reported

#### Story 3.1.2: BOM Display and Navigation
**As a** user with BOM access  
**I want to** view the generated BOM in a clear format  
**So that** I can understand the complete parts requirement  

**Acceptance Criteria:**
- [ ] Hierarchical tree view of BOM structure
- [ ] Expandable/collapsible assembly sections
- [ ] Part numbers, names, and quantities displayed
- [ ] Level indicators (assembly depth)
- [ ] Search functionality within BOM
- [ ] Filter by part type, assembly level
- [ ] Total parts count summary
- [ ] Assembly-specific part lists
- [ ] Print-friendly format option

#### Story 3.1.3: BOM Export Functionality
**As a** user with BOM access  
**I want to** export the BOM in different formats  
**So that** I can share information with external parties  

**Acceptance Criteria:**
- [ ] CSV export with proper formatting
- [ ] PDF export with company branding
- [ ] Excel export with multiple sheets
- [ ] Email sharing functionality
- [ ] Custom export templates
- [ ] Export includes all BOM levels
- [ ] Quantity summaries included
- [ ] Export audit trail maintained

## 4. Procurement Workflow

### Epic 4.1: Procurement Management
**As a Procurement Specialist, I want to manage parts and outsourcing so that production has the materials needed.**

#### Story 4.1.1: New Order Review
**As a** Procurement Specialist  
**I want to** see new orders requiring procurement review  
**So that** I can begin the procurement process  

**Acceptance Criteria:**
- [ ] Dashboard shows "Order Created" status orders
- [ ] Order details accessible from dashboard
- [ ] BOM review interface available
- [ ] Parts identification tools provided
- [ ] Priority indicators based on want date
- [ ] Bulk actions for multiple orders
- [ ] Assignment functionality to self
- [ ] SLA indicators for review time

#### Story 4.1.2: Parts for Outsourcing Management
**As a** Procurement Specialist  
**I want to** identify and manage parts requiring outsourcing  
**So that** external processing is properly coordinated  

**Acceptance Criteria:**
- [ ] Mark parts/assemblies for outsourcing
- [ ] Outsourcing vendor selection
- [ ] Delivery date tracking
- [ ] Outsourcing status updates
- [ ] Communication log with vendors
- [ ] Cost tracking (future phase)
- [ ] Quality requirements specification
- [ ] Receiving confirmation process

#### Story 4.1.3: BOM Approval Process
**As a** Procurement Specialist  
**I want to** approve BOMs after verification  
**So that** production can proceed with confidence  

**Acceptance Criteria:**
- [ ] BOM review checklist
- [ ] Approval/rejection options
- [ ] Approval comments and notes
- [ ] Version control for BOM changes
- [ ] Approval history tracking
- [ ] Notification to relevant stakeholders
- [ ] Status update to "Parts Sent"
- [ ] Approval authorization verification

## 5. Quality Control Workflow

### Epic 5.1: Digital QC Forms
**As a QC Person, I want to perform quality control checks using digital forms so that compliance and quality standards are maintained.**

#### Story 5.1.1: Pre-QC Digital Form
**As a** QC Person  
**I want to** perform Pre-QC checks using a digital checklist  
**So that** incoming sink structures meet specifications  

**Acceptance Criteria:**
- [ ] Digital form based on CLP.T2.001.V01 Section 1
- [ ] Order details accessible during QC
- [ ] Technical drawings viewable
- [ ] Checklist items with pass/fail options
- [ ] N/A options where applicable
- [ ] Comments field for each check
- [ ] Photo upload capability
- [ ] Measurement recording fields
- [ ] Basin-specific checks (when applicable)
- [ ] Digital signature capture
- [ ] Overall pass/fail determination
- [ ] Save draft functionality
- [ ] Submit and lock functionality

**Specific Pre-QC Checks:**
- [ ] Final sink dimensions verification
- [ ] Basin dimensions verification
- [ ] Drawing and paperwork confirmation
- [ ] Pegboard installation check (if applicable)
- [ ] Faucet hole locations verification
- [ ] Mounting holes verification
- [ ] Feet type confirmation
- [ ] Basin-specific features check

#### Story 5.1.2: Final QC Digital Form
**As a** QC Person  
**I want to** perform Final QC checks on assembled sinks  
**So that** completed products meet quality standards  

**Acceptance Criteria:**
- [ ] Digital form incorporating CLP.T2.001.V01 Sections 2-4
- [ ] Assembly verification checklist
- [ ] Component installation verification
- [ ] Labeling and branding checks
- [ ] Cleanliness verification
- [ ] Extra component verification (if ordered)
- [ ] Packaging verification
- [ ] Manual inclusion verification
- [ ] Digital signature with timestamp
- [ ] Final pass/fail determination
- [ ] Photo documentation capability

**Specific Final QC Checks:**
- [ ] LED light bracket installation
- [ ] Control button installation and labeling
- [ ] Torvan logo placement
- [ ] Power bar installation
- [ ] Control box installation
- [ ] Cable labeling verification
- [ ] Sink cleanliness check
- [ ] Basin-specific component checks (E-Drain/E-Sink)
- [ ] Packaging completeness

#### Story 5.1.3: QC Results Management
**As a** QC Person  
**I want to** manage QC results and follow-up actions  
**So that** quality issues are properly addressed  

**Acceptance Criteria:**
- [ ] QC results saved to database
- [ ] Failed QC workflow triggers
- [ ] Corrective action assignment
- [ ] Re-inspection scheduling
- [ ] QC history tracking
- [ ] Statistical reporting capability
- [ ] Trend analysis tools
- [ ] Issue escalation process

## 6. Assembly Workflow

### Epic 6.1: Assembly Task Management
**As an Assembler, I want guided assembly instructions so that I can build sinks correctly and efficiently.**

#### Story 6.1.1: Production Order Assignment
**As an** Assembler  
**I want to** view and assign production orders to myself  
**So that** I can begin assembly work  

**Acceptance Criteria:**
- [ ] Dashboard shows "Ready for Production" orders
- [ ] Order priority indicators
- [ ] Estimated completion time display
- [ ] Self-assignment functionality
- [ ] Current assignment visibility
- [ ] Workload balancing indicators
- [ ] Order complexity indicators
- [ ] Resource availability check

#### Story 6.1.2: Tailored Assembly Instructions
**As an** Assembler  
**I want to** access step-by-step assembly instructions tailored to my assigned order  
**So that** I can complete assembly correctly  

**Acceptance Criteria:**
- [ ] Sequential task list generation
- [ ] Order-specific configuration reflected
- [ ] Production checklist integration
- [ ] Required parts list per task
- [ ] Required tools list per task
- [ ] Work instructions with visuals
- [ ] Safety notes highlighted
- [ ] Task dependencies managed
- [ ] Progress tracking capability
- [ ] Time estimation per task

**Task Categories:**
- [ ] Sink structure preparation
- [ ] LED light bracket mounting
- [ ] Control button installation
- [ ] Torvan logo attachment
- [ ] Power bar installation
- [ ] Control box installation
- [ ] Cable management and labeling
- [ ] Basin-specific installations (E-Drain/E-Sink)
- [ ] Final cleaning and preparation

#### Story 6.1.3: Task Completion Tracking
**As an** Assembler  
**I want to** track completion of individual tasks  
**So that** my progress is recorded and visible  

**Acceptance Criteria:**
- [ ] Task checkbox completion
- [ ] Completion timestamp recording
- [ ] Notes field for each task
- [ ] Photo upload for verification
- [ ] Quality check confirmations
- [ ] Issue reporting functionality
- [ ] Time tracking per task
- [ ] Overall progress percentage
- [ ] Next task auto-suggestion

#### Story 6.1.4: Testing and Verification
**As an** Assembler  
**I want to** perform and record functional tests  
**So that** the assembled sink operates correctly  

**Acceptance Criteria:**
- [ ] Testing checklist presentation
- [ ] Test result recording (Pass/Fail)
- [ ] Measurement recording capability
- [ ] Issue documentation
- [ ] Retest functionality
- [ ] Test result persistence
- [ ] Integration with QC workflow
- [ ] Test completion verification

**Test Categories:**
- [ ] E-Sink touchscreen functionality
- [ ] Drain solenoid operation
- [ ] Control button responsiveness
- [ ] LED lighting functionality
- [ ] Water flow verification
- [ ] Emergency stop functionality
- [ ] Temperature sensor testing

#### Story 6.1.5: Packaging Management
**As an** Assembler  
**I want to** manage peripheral packaging  
**So that** all components are included with the sink  

**Acceptance Criteria:**
- [ ] Auto-generated packaging checklist
- [ ] Standard item inclusion verification
- [ ] Kit component verification
- [ ] Manual inclusion check
- [ ] Packaging quantity verification
- [ ] Packaging completion confirmation
- [ ] Special packaging instructions
- [ ] Documentation packaging

**Standard Packaging Items:**
- [ ] Anti-Fatigue Mat
- [ ] Sink strainers (per bowl)
- [ ] Flex hoses and clamps
- [ ] Temperature sensors (if applicable)
- [ ] Electronic drain solenoids
- [ ] Drain assemblies
- [ ] Dosing pump shelves (if applicable)
- [ ] Drain gaskets
- [ ] Installation manuals

## 7. Service Department Workflow

### Epic 7.1: Service Parts Ordering
**As a Service Department user, I want to order service parts so that I can maintain and repair existing equipment.**

#### Story 7.1.1: Service Parts Browsing
**As a** Service Department user  
**I want to** browse available service parts  
**So that** I can find the parts I need  

**Acceptance Criteria:**
- [ ] Service parts catalog display
- [ ] Category-based browsing
- [ ] Search functionality
- [ ] Part images and descriptions
- [ ] Compatibility information
- [ ] Availability status
- [ ] Part specifications
- [ ] Related parts suggestions
- [ ] Recently ordered parts history

#### Story 7.1.2: Service Order Creation
**As a** Service Department user  
**I want to** create service part orders  
**So that** I can request necessary parts  

**Acceptance Criteria:**
- [ ] Shopping cart functionality
- [ ] Quantity selection per part
- [ ] Order notes capability
- [ ] Order review before submission
- [ ] Order submission confirmation
- [ ] Order number generation
- [ ] Email confirmation
- [ ] Order status tracking

#### Story 7.1.3: Service Order Management
**As a** Procurement Specialist  
**I want to** manage service part order requests  
**So that** service needs are fulfilled  

**Acceptance Criteria:**
- [ ] Service order queue visibility
- [ ] Order details access
- [ ] Approval/rejection capability
- [ ] Processing status updates
- [ ] Fulfillment tracking
- [ ] Communication with requestor
- [ ] Completion confirmation
- [ ] Service order reporting

## 8. Administrative Functions

### Epic 8.1: Data Management
**As an Admin, I want to manage system data so that the application reflects current business requirements.**

#### Story 8.1.1: Parts and Assembly Management
**As an** Admin  
**I want to** manage parts and assemblies  
**So that** the system catalog is up-to-date  

**Acceptance Criteria:**
- [ ] CRUD operations for parts
- [ ] CRUD operations for assemblies
- [ ] Component relationship management
- [ ] Photo and document upload
- [ ] Status management (active/inactive)
- [ ] Bulk import/export capability
- [ ] Version control
- [ ] Change history tracking
- [ ] Validation rules enforcement

#### Story 8.1.2: QC Template Management
**As an** Admin  
**I want to** manage QC checklist templates  
**So that** quality processes stay current  

**Acceptance Criteria:**
- [ ] QC template creation and editing
- [ ] Checklist item management
- [ ] Template versioning
- [ ] Template activation/deactivation
- [ ] Template preview capability
- [ ] Template export/import
- [ ] Change impact analysis
- [ ] Template usage reporting

#### Story 8.1.3: User Management
**As an** Admin  
**I want to** manage user accounts  
**So that** system access is properly controlled  

**Acceptance Criteria:**
- [ ] User account creation
- [ ] Role assignment and changes
- [ ] Account activation/deactivation
- [ ] Password reset capability
- [ ] User profile management
- [ ] Access rights configuration
- [ ] User activity monitoring
- [ ] Bulk user operations

## 9. System-Wide Features

### Epic 9.1: File Management
**As a user, I want to manage documents so that order-related files are properly stored and accessible.**

#### Story 9.1.1: Document Upload
**As a** user with upload permissions  
**I want to** upload documents to orders  
**So that** relevant files are associated with production  

**Acceptance Criteria:**
- [ ] File upload interface
- [ ] Multiple file format support
- [ ] File size validation (max 10MB)
- [ ] File type validation
- [ ] Progress indicators
- [ ] Upload error handling
- [ ] Virus scanning integration
- [ ] Automatic file organization

#### Story 9.1.2: Document Management
**As a** user with document access  
**I want to** view and manage order documents  
**So that** I can access necessary information  

**Acceptance Criteria:**
- [ ] Document list by order
- [ ] Document preview capability
- [ ] Download functionality
- [ ] Document categorization
- [ ] Search within documents
- [ ] Document version control
- [ ] Access permissions enforcement
- [ ] Document sharing capabilities

### Epic 9.2: Notifications
**As a user, I want to receive notifications so that I'm informed of important events and required actions.**

#### Story 9.2.1: System Notifications
**As a** user  
**I want to** receive system notifications  
**So that** I'm informed of events relevant to my role  

**Acceptance Criteria:**
- [ ] In-app notification center
- [ ] Role-based notification filtering
- [ ] Notification categories
- [ ] Read/unread status tracking
- [ ] Notification history
- [ ] Notification preferences
- [ ] Email notification options
- [ ] Real-time notification updates

#### Story 9.2.2: Order Status Notifications
**As a** user involved in order processing  
**I want to** receive notifications when order status changes  
**So that** I can take timely action  

**Acceptance Criteria:**
- [ ] Automatic notifications on status change
- [ ] Role-appropriate recipient selection
- [ ] Notification content includes order details
- [ ] Direct links to relevant order views
- [ ] Escalation for overdue orders
- [ ] Batch notification options
- [ ] Notification delivery confirmation

---

## Acceptance Criteria Priority Levels

### Must Have (P0)
- User authentication and authorization
- Order creation wizard (all 5 steps)
- BOM generation
- Order status management
- Basic QC forms (Pre-QC and Final QC)
- Assembly task tracking
- Service parts ordering

### Should Have (P1)
- Advanced search and filtering
- Document management
- Notifications system
- Export functionality
- Audit trail
- Performance optimization

### Could Have (P2)
- Advanced reporting
- Bulk operations
- Template customization
- Mobile responsiveness
- Integration capabilities

### Won't Have (Initial Release)
- Cost tracking
- Advanced analytics
- Third-party integrations
- Automated scheduling
- Inventory management

---

*These user stories and acceptance criteria provide a comprehensive foundation for development, testing, and validation of the Torvan Medical CleanStation Production Workflow system. Each story should be estimated, prioritized, and tracked through the development lifecycle.*