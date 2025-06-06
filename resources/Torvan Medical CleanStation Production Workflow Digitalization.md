# **Product Requirements Document:**

# **Torvan Medical CleanStation Production Workflow Digitalization**

Version: 1.1  
Date: May 30, 2025  
Prepared For: AI Coding Agent / Development Team  
Project Owner: Sal (Torvan Medical)  
Change Log:

* **v1.1 (May 30, 2025):** Integrated details from CLP.T2.001.V01 \- T2SinkProduction.docx (Production Checklists) into relevant User Stories (UC 4.1, 4.2, 5.2, 5.5) and Data Models (QC Forms/Checklists, Task Lists, Assemblies). Added new clarification questions.

## **1\. Introduction**

### **1.1. Project Name**

Torvan Medical CleanStation Reprocessing Sinks \- Production Workflow Digitalization

### **1.2. Purpose**

To develop a web application that digitizes and streamlines the manufacturing and assembly workflow for Torvan Medical's CleanStation Reprocessing Sinks. The application aims to enhance efficiency, improve data accuracy, ensure traceability, support various user roles with tailored interfaces, and maintain compliance with industry standards.

### **1.3. Scope**

The initial scope of this project focuses on the **MDRD (Medical Device Reprocessing Department) sink family**. Functionality for "Endoscope CleanStation" and "InstroSink" families will be deferred to future phases (placeholder/TODO pages for initial release). The system will manage the process from the creation of a production order (after sales and quoting are complete) through to the "Ready for Ship" status. It also includes a separate module for the Service Department to order parts.

### **1.4. Background**

Torvan Medical currently employs manual processes for building their CleanStation Reprocessing Sinks. This project seeks to modernize this by creating a digital platform that manages order configurations, Bill of Materials (BOM) generation, assembly tasks, quality control, and procurement interactions. The company is ISO 13485:2016 registered, and the application must support these compliance requirements.

## **2\. Goals**

* **Digitalize Workflow:** Transition the current manual sink production process to a fully digital system.  
* **Role-Based Access:** Provide distinct dashboards, functionalities, and authorization levels for various user roles (Production Coordinator, Admin, Procurement Specialist, QC Person, Assembler, Service Department).  
* **Automated BOM Generation:** Automatically create accurate and tailored Bill ofMaterials (BOMs) based on specific sink configurations selected by the user.  
* **Guided Assembly:** Provide assemblers with auto-generated, tailored task lists, sequences, required parts, necessary tools, and detailed work instructions, incorporating checks from production checklists.  
* **Order Tracking & Status Management:** Enable real-time tracking of production orders through various statuses (e.g., Order Created, Parts Sent, Ready for Pre-QC, Ready for Production, Ready for Final QC, Ready for Ship, Shipped).  
* **Integrated Quality Control:** Implement QC checkpoints at pre-assembly and final assembly stages with tailored digital checklists derived from documents like CLP.T2.001.V01 \- T2SinkProduction.docx.  
* **Efficient Procurement:** Streamline the procurement process by providing clear BOMs, identifying parts for outsourcing, and managing service part requests.  
* **Centralized Data Management:** Establish a robust and easily maintainable database for parts, assemblies (including sub-assemblies), categories, work instructions, task lists, tools, and QC checklists with clear hierarchical relationships.  
* **Service Part Ordering:** Provide a simplified interface for the Service Department to order necessary parts from inventory.  
* **Compliance:** Ensure the system and its processes adhere to ISO 13485:2016 standards for medical device manufacturing.  
* **Improved Documentation:** Facilitate the upload, storage, and association of relevant documents (e.g., POs, technical drawings, completed QC forms) with production orders.

## **3\. Target Users and Roles**

The application will be used by several distinct roles within Torvan Medical:

* **3.1. Production Coordinator:**  
  * **Responsibilities:** Initiates production orders, enters customer and order details, configures sinks, manages overall order flow, updates final shipment status.  
  * **Dashboard/View:** Overview of all orders, ability to create new orders, filter by status, access order details and documents.  
* **3.2. Admin (Sal):**  
  * **Responsibilities:** Full system oversight, user management, data management (parts, assemblies, work instructions, QC checklists, etc.), system configuration, troubleshooting.  
  * **Dashboard/View:** Access to all system functionalities, administrative panels, logs, and reporting.  
* **3.3. Procurement Specialist:**  
  * **Responsibilities:** Reviews new orders, validates auto-generated BOMs, manages parts for outsourcing, approves BOMs, updates order status related to parts availability, handles service part order requests.  
  * **Dashboard/View:** List of orders requiring procurement action, BOM details, inventory insights (for service parts), status update capabilities.  
* **3.4. QC (Quality Control) Person:**  
  * **Responsibilities:** Performs Pre-QC on arrived sink structures and Final QC on assembled sinks using tailored digital checklists (based on CLP.T2.001.V01 \- T2SinkProduction.docx), approves/rejects QC stages, updates order status.  
  * **Dashboard/View:** Orders awaiting Pre-QC, orders awaiting Final QC, access to order details, technical documents, and digital QC forms.  
* **3.5. Assembler:**  
  * **Responsibilities:** Views production-ready orders, assigns tasks to themselves, follows guided assembly instructions (task lists incorporating checks from CLP.T2.001.V01 \- T2SinkProduction.docx, parts, tools, work instructions), performs and records testing, packages peripherals, updates order status.  
  * **Dashboard/View:** Queue of orders ready for production, ability to claim tasks, step-by-step assembly guidance including production checks, testing forms, packaging checklists.  
* **3.6. Service Department:**  
  * **Responsibilities:** Orders service parts from inventory for maintenance and repair purposes. This workflow is separate from the main production flow.  
  * **Dashboard/View:** Interface to browse/search inventory, add parts to a request cart, and submit part orders (without pricing). Procurement and Production users will see these requests.

All roles will be able to see the general order pool but with varying levels of detail and action authorization.

## **4\. Product Features (User Stories)**

### **4.1. Core: Order Creation & Configuration (Production Coordinator)**

* **UC 1.1: Initiate New Production Order (5-Step Wizard):**  
  * As a Production Coordinator, I want to create a new production order through a 5-step guided process so that all necessary information is captured accurately.  
  * **Step 1: Customer & Order Information:**  
    * Enter PO Number (string, min 3 chars, unique).  
    * Enter Customer Name (string, min 3 chars).  
    * Enter Project Name (string, min 3 chars, optional).  
    * Select/Enter Sales Person (string, min 3 chars).  
    * Select Desired Delivery Date (must be in the future).  
    * Upload PO Document (file upload).  
    * Add general Notes (text area).  
    * Select Document Language (EN, FR, SP) for generated documents/manuals.  
  * **Step 2: Sink Selection & Quantity:**  
    * Select Sink Family: MDRD (initially). (Endoscope CleanStation, InstroSink selections lead to a "Under Construction" page).  
    * Enter Quantity of sinks for this order.  
    * For each sink, assign a Unique Build Number (alphanumeric, system should ensure uniqueness within the PO or globally). This build number will be the primary identifier for individual sink configurations.  
  * **Step 3: Sink Configuration (Repeated for each Unique Build Number):**  
    * The system will guide the user through configuring each sink identified by its build number.  
    * **3.1 Sink Body Configuration:**  
      * Select Sink Model (e.g., T2-B1, T2-B2, T2-B3) determining the number of basins.  
      * Enter Sink Dimensions (Width and Length in inches). This selection will determine the base sink body assembly (e.g., T2-BODY-48-60-HA if length is 54 inches).  
      * Select Legs Type:  
        * Height Adjustable (Dropdown: DL27, DL14, LC1).  
        * Fixed Height (Dropdown: DL27, DL14).  
      * Select Feet Type (Dropdown: Lock & Leveling Casters, S.S Adjustable Seismic Feet).  
      * Select Pegboard (Boolean Yes/No):  
        * If Yes:  
          * Select Colorsafe+ Color (Dropdown: Green, Black, Yellow, Grey, Red, Blue, Orange, White).  
          * Select Pegboard Type (Radio: Perforated, Solid).  
          * Select Pegboard Size (Radio: Same as Sink Length, Custom Size).  
            * If "Same as Sink Length," system auto-selects based on sink length.  
            * If "Custom Size," allow W x L text entry in inches. System generates a custom part number (e.g., 720.215.002 T2-ADW-PB-\[width\]x\[length\]).  
      * Select Workflow Direction (Dropdown: Left to Right, Right to Left).  
    * **3.2 Basin Configuration (Repeated for each basin in the selected Sink Model):**  
      * Select Basin Type (Dropdown: E-Sink, E-Sink DI, E-Drain).  
      * Select Basin Size (Dropdown: 20X20X8, 24X20X8, 24X20X10, 30X20X8, 30X20X10, Custom).  
        * If "Custom," allow W x L x D text entry in inches. System generates a custom part number (e.g., 720.215.001 T2-ADW-BASIN-\[width\]x\[length\]x\[depth\]).  
      * Select Basin Add-ons (Checkboxes):  
        * P-TRAP DISINFECTION DRAIN UNIT.  
        * Basin Light (Part number varies based on E-Sink/E-Drain selection).  
    * **3.3 Faucet Configuration:**  
      * Select Faucet Type (Dropdown: 10" WRIST BLADE SWING SPOUT WALL MOUNTED FAUCET KIT, PRE-RINSE OVERHEAD SPRAY UNIT KIT, GOOSENECK TREATED WATER FAUCET KIT PVC).  
        * If Basin Type is "E-Sink DI," "GOOSENECK TREATED WATER FAUCET KIT PVC" is auto-selected.  
      * Enter Faucet Quantity (Numeric: Max 2 for 1-2 basin sinks, Max 3 for 3-basin sinks).  
      * Select Faucet Placement (Dropdown: Center, Between Basins \- options adjust based on basin count).  
      * Select Sprayer (Boolean Yes/No):  
        * If Yes:  
          * Select Sprayer Type (Dropdown: DI WATER GUN KIT & TURRET, DI WATER GUN KIT & ROSETTE, AIR GUN KIT & TURRET, AIR GUN KIT & ROSETTE).  
          * Enter Sprayer Quantity (Numeric: 1 or 2).  
          * Select Sprayer Location (Dropdown: Left Side, Right Side).  
  * **Step 4: Add-on Accessories:**  
    * Display a library/list of available accessories (from categories.json under "ACCESSORY LIST" and assemblies.json).  
    * Allow user to select accessories and specify quantities.  
  * **Step 5: Review and Submit:**  
    * Display a summary of the entire order, including customer info, all configured sinks (by build number), and a preliminary BOM for each.  
    * Allow user to go back and edit previous steps.  
    * On submission, the order is created in the database with a "Order Created" status and a unique PO number.  
* **UC 1.2: View and Manage Orders:**  
  * As a Production Coordinator, I want to view a list of all production orders with their current status, PO number, customer name, and want date, so I can track progress.  
  * I want to be able to filter and sort this list.  
  * I want to click on an order to see its full details, including all configurations, BOMs, associated documents, and history.  
* **UC 1.3: Update Order Status:**  
  * As a Production Coordinator, I want to update the status of an order to "Shipped" once it has left the facility.  
* **UC 1.4: Generate Standard Manuals:**  
  * As a Production Coordinator, I want the system to automatically include the correct standard sink manual kit (English, French, or Spanish based on Step 1 selection) in the BOM for each order. (e.g., T2-STD-MANUAL-EN-KIT).  
  * The system should also include specific manuals like IFU.T2.ESinkInstUserFR if applicable based on configuration and language.

### **4.2. Core: Bill of Materials (BOM) Management (System & All Roles)**

* **UC 2.1: Auto-Generate BOM:**  
  * As the System, I want to automatically generate a detailed, hierarchical Bill of Materials for each configured sink (by build number) based on the selections made during order creation.  
  * The BOM generation logic will use rules defined in sink configuration and bom.txt and map selections to specific part numbers from assemblies.json and parts.json.  
  * Parent-child relationships (assemblies, sub-assemblies, parts) must be clearly represented.  
  * The system must infer mandatory components based on selections (e.g., specific control box based on E-Drain/E-Sink basin combinations, pegboard components like T2-OHL-MDRD-KIT if pegboard is selected).  
  * The BOM should also include items listed in "Section 4: Standard Packaging & Kits" of CLP.T2.001.V01 \- T2SinkProduction.docx if they are standard for the configured sink type or selected as options.  
* **UC 2.2: View BOM:**  
  * As a user (Production Coordinator, Procurement, Admin, Assembler, QC), I want to view the detailed BOM for any configured sink, showing part numbers, names, quantities, and hierarchical structure.  
* **UC 2.3: Export/Share BOM:**  
  * As a user, I want to be able to export the BOM in CSV and PDF formats.  
  * I want to be able to share the BOM (e.g., via email link or attachment).

### **4.3. Core: Procurement Workflow (Procurement Specialist)**

* **UC 3.1: Review New Orders & BOMs:**  
  * As a Procurement Specialist, I want to see new orders with "Order Created" status on my dashboard.  
  * I want to review the order details and the system-generated BOM for accuracy and completeness.  
* **UC 3.2: Manage Parts for Outsourcing:**  
  * As a Procurement Specialist, I want the system to help identify or allow me to mark specific parts/sub-assemblies in the BOM that need to be sent to an outside company for processing/manufacturing.  
  * I want to track the status of these outsourced parts.  
* **UC 3.3: Approve BOM & Update Status:**  
  * As a Procurement Specialist, I want to approve the BOM once verified.  
  * After approving and sending parts for outsourcing (if any), I want to update the order status to "Parts Sent, Waiting for Arrival."  
* **UC 3.4: Update Status on Arrival:**  
  * As a Procurement Specialist, when the sink structure/outsourced parts arrive, I want to update the order status to "Ready for Pre-QC."  
* **UC 3.5: Manage Service Part Orders:**  
  * As a Procurement Specialist, I want to see service part order requests submitted by the Service Department on my dashboard.  
  * I want to process these requests (e.g., check availability, prepare for dispatch).

### **4.4. Core: Quality Control (QC) Workflow (QC Person)**

* **UC 4.1: Perform Pre-QC:**  
  * As a QC Person, I want to see orders with "Ready for Pre-QC" status on my dashboard.  
  * I want to access the order details, technical drawings, order confirmation document, and PO document for the sink.  
  * I want to perform Pre-QC checks on the arrived sink structure against these documents using a system-provided digital checklist derived from **Section 1 (Pre-Production Check) of CLP.T2.001.V01 \- T2SinkProduction.docx**. This includes:  
    * Verifying final sink dimensions, basin dimensions against drawing and BOM.  
    * Confirming final approved drawing and paperwork are attached (digitally).  
    * Checking pegboard installation and dimensions (if applicable).  
    * Verifying location of sink faucet holes and mounting holes.  
    * Confirming feet type (Lock & levelling castors or Levelling Feet).  
    * Verifying basin-specific features (bottom fill hole, drain button, basin light) and drain/faucet locations per basin.  
  * I want to record Pre-QC results (Job ID, \# of Basins, Initials, Pass/Fail for each item, notes) and update the order status to "Ready for Production" upon approval, or flag issues if rejected.  
* **UC 4.2: Perform Final QC:**  
  * As a QC Person, I want to see orders with "Ready for Final QC" status on my dashboard.  
  * I want to perform Final QC checks on the fully assembled sink using a system-provided digital checklist, incorporating relevant items from **Section 2 (Sink Production Check), Section 3 (Basin Production), and Section 4 (Standard Packaging & Kits) of CLP.T2.001.V01 \- T2SinkProduction.docx**. This includes verifying:  
    * Correct installation and labeling of all components as per production checks (e.g., LED light bracket, control buttons, Torvan logo, power bar, control boxes, cable labeling).  
    * Cleanliness of the sink.  
    * Installation of extra components (Air Gun, Water Gun, DI Faucet, Combo Faucet) if ordered.  
    * Correct packaging of standard items and kits.  
    * Presence of correct Install & Operations Manuals.  
  * I want to record Final QC results (including a digital equivalent of the sign-off "I, \[Name\], have checked this cabinet on \[Date\], and verify that it is ready for inspection.") and update the order status to "Ready for Ship" upon approval, or flag issues if rejected.

### **4.5. Core: Assembly Workflow (Assembler)**

* **UC 5.1: View & Assign Production Orders:**  
  * As an Assembler, I want to see orders with "Ready for Production" status on my dashboard.  
  * I want to be able to assign (or be assigned) a production order/build number to myself.  
* **UC 5.2: Access Tailored Assembly Guidance:**  
  * As an Assembler, for my assigned order (identified by PO\# and Build \#), I want to access an auto-generated, tailored sequence of assembly tasks.  
  * These tasks should incorporate detailed checks and steps from **Section 2 (Sink Production Check) and Section 3 (Basin Production \- E-Drain and E-Sink specific checks) of CLP.T2.001.V01 \- T2SinkProduction.docx**. Examples include:  
    * Mounting Sink Overhead LED Light Bracket with plastic washers.  
    * Installing and labeling Lifters Control Button and Controller.  
    * Attaching Torvan Logo.  
    * Installing power bar and necessary control boxes.  
    * Ensuring all cables are labelled correctly.  
    * Cleaning sink of metal shavings.  
    * For E-Drain Basins: Installing Bottom-Fill Mixing Valve, ensuring pipes are labelled, installing overflow sensor.  
    * For E-Sink Basins: Installing Mixing Valve plate, Emergency Stop buttons, E-Sink touchscreen, overflow sensor, dosing port, basin temperature cable gland.  
  * For each task, I want to see the specific parts needed (with quantities), tools required, and detailed work instructions (including visuals/diagrams if available).  
* **UC 5.3: Track Task Completion:**  
  * As an Assembler, I want to be able to check off tasks (including production checklist items) as I complete them.  
* **UC 5.4: Perform & Record Testing:**  
  * As an Assembler, after all assembly tasks for a sink are checked off, I want to be presented with a testing session/form.  
  * I want to perform the required tests (e.g., E-Sink touchscreen connected and working, drain solenoid tested and labelled) and record the results (pass/fail, measurements) in the system.  
* **UC 5.5: Manage Packaging:**  
  * As an Assembler, after successful testing, I want to proceed to a packaging step.  
  * I want to see an auto-generated list of peripherals and accessories that need to be packaged with the sink, based on the order and the **"Standard Packaging & Kits" (Section 4\) from CLP.T2.001.V01 \- T2SinkProduction.docx**. This includes items like:  
    * Anti-Fatigue Mat  
    * Sink strainer per sink bowl (lasered)  
    * Ø1.5 Flex Hose (4ft) per sink drain \+ 2x Hose Clamps  
    * Temp. Sensor per E-Drain basin (if applicable)  
    * Electronic Drain Solenoid per Basin (wired, tested, labelled)  
    * Drain assembly per basin  
    * Shelf for dosing pump & Tubeset per dosing pump (if applicable)  
    * Drain gasket per basin  
    * Specific kits if ordered (Air Gun Kit, Water Gun Kit, Pre-Rinse Faucet, Faucet Kit) with their listed components.  
    * Correct Install & Operations Manuals (e.g., IFU.T2.SinkInstUser, IFU.T2.SinkInstUserFR, IFU.T2.ESinkInstUserFR).  
  * I want to confirm that all items are packaged correctly with specified quantities.  
* **UC 5.6: Update Order Status for Final QC:**  
  * As an Assembler, after completing packaging, I want to update the order status to "Ready for Final QC."

### **4.6. Core: Service Department Workflow (Service Department User)**

* **UC 6.1: Browse and Order Service Parts:**  
  * As a Service Department user, I want to browse or search the inventory of service parts (derived from assemblies.json where type is SERVICE\_PART or KIT suitable for service).  
  * I want to see part details (name, photo, description).  
  * I want to add desired parts and quantities to a "shopping cart" like interface (no pricing displayed).  
  * I want to submit this service part order request.

### **4.7. Core: Data & System Management (Admin)**

* **UC 7.1: Manage Parts, Assemblies, Categories:**  
  * As an Admin, I want to perform CRUD (Create, Read, Update, Delete) operations on parts, assemblies (including their components and sub-assembly relationships), and categories.  
  * I want to upload and associate photos and technical drawing URLs/files with parts and assemblies.  
  * I want to define and manage parent-child relationships for BOM structures.  
* **UC 7.2: Manage Work Instructions, Task Lists, Tools, QC Checklists:**  
  * As an Admin, I want to manage the database pools for Work Instructions (linking to assemblies, including steps, descriptions, visuals), Task Lists (sequences, links to tools/parts/instructions), Tools, and **QC Checklist templates** (digitizing and maintaining lists like those in CLP.T2.001.V01 \- T2SinkProduction.docx).  
* **UC 7.3: Generate QR Codes:**  
  * As an Admin, I want the system to be able to generate QR codes for assemblies and sub-assemblies, which can be used for identification or linking to their details page.  
* **UC 7.4: User Management:**  
  * As an Admin, I want to manage user accounts, roles, and permissions.  
* **UC 7.5: System Configuration:**  
  * As an Admin, I want to configure system settings, such as custom part number generation rules or QC checklist templates.

### **4.8. General System Features**

* **UC 8.1: Authentication & Authorization:**  
  * Users must log in to access the system.  
  * Access to features and data must be restricted based on user roles.  
* **UC 8.2: Role-Based Dashboards:**  
  * Each user role should have a dedicated dashboard presenting relevant information and actions.  
* **UC 8.3: Search & Filtering:**  
  * Provide robust search and filtering capabilities across order lists, inventory, etc.  
* **UC 8.4: Notifications:**  
  * Implement a notification system to alert users of important events (e.g., order status changes, new task assignments, QC results).  
* **UC 8.5: Document Management:**  
  * Allow users to upload, view, and associate documents (PDFs, images, etc.) with orders at various stages.

## **5\. Data Model / Database Pools**

The application will interact with several interconnected data pools:

* **5.1. Orders Pool:**  
  * OrderID (Primary Key, e.g., PO Number \+ Build Number)  
  * PONumber (String, fk to a general PO record)  
  * BuildNumber (String, unique per sink in a PO)  
  * CustomerName (String)  
  * ProjectName (String, optional)  
  * SalesPerson (String)  
  * WantDate (Date)  
  * OrderLanguage (Enum: EN, FR, SP)  
  * SinkFamily (Enum: MDRD, Endoscope, InstroSink)  
  * SinkModel (String, e.g., T2-B1)  
  * SinkDimensions (Object: width, length)  
  * LegsType (String)  
  * LegsModel (String)  
  * FeetType (String)  
  * HasPegboard (Boolean)  
  * PegboardColor (String, if HasPegboard)  
  * PegboardType (Enum: Perforated, Solid, if HasPegboard)  
  * PegboardSize (Object: width, length, or "SameAsSink")  
  * WorkflowDirection (Enum: LeftToRight, RightToLeft)  
  * BasinConfigurations (Array of Objects, one per basin):  
    * BasinIndex (Number)  
    * BasinType (Enum: E-Sink, E-Sink DI, E-Drain)  
    * BasinSize (Object: width, length, depth, or standard size string)  
    * BasinAddons (Array of Strings: P-Trap, BasinLight)  
    * BasinSpecificDetails (Object, for storing checklist related info like drain location, faucet location from Pre-QC)  
  * FaucetConfigurations (Array of Objects):  
    * FaucetType (String)  
    * FaucetPlacement (String)  
  * SprayerConfigurations (Array of Objects):  
    * SprayerType (String)  
    * SprayerLocation (String)  
  * SelectedAccessories (Array of Objects: AccessoryID, Quantity)  
  * OrderStatus (Enum: OrderCreated, PartsSent, ReadyForPreQC, ReadyForProduction, TestingComplete, PackagingComplete, ReadyForFinalQC, ReadyForShip, Shipped)  
  * CurrentAssignee (UserID, fk)  
  * HistoryLog (Array of Objects: Timestamp, UserID, Action, OldStatus, NewStatus, Notes)  
  * AssociatedDocuments (Array of Objects: DocumentID, FileName, FileURL, UploadedBy, Timestamp)  
  * GeneratedBOM\_ID (fk to BOMs Pool)  
  * CreatedAt, UpdatedAt (Timestamps)  
* **5.2. Inventory Pool (derived from parts.json, assemblies.json, categories.json):**  
  * **Parts Table:**  
    * PartID (String, Primary Key, e.g., "1916")  
    * Name (String)  
    * ManufacturerPartNumber (String, nullable)  
    * ManufacturerInfo (String, nullable)  
    * Type (Enum: COMPONENT, MATERIAL \- based on context or can be added)  
    * Status (Enum: ACTIVE, INACTIVE)  
    * PhotoURL (String, nullable)  
    * TechnicalDrawingURL (String, nullable)  
    * (Implicit links to categories via assembly refs)  
  * **Assemblies Table:**  
    * AssemblyID (String, Primary Key, e.g., "T2-TS7")  
    * Name (String)  
    * Type (Enum: SIMPLE, COMPLEX, SERVICE\_PART, KIT)  
    * CategoryCode (String)  
    * SubcategoryCode (String)  
    * CanOrder (Boolean)  
    * IsKit (Boolean)  
    * Status (Enum: ACTIVE, INACTIVE)  
    * PhotoURL (String, nullable)  
    * TechnicalDrawingURL (String, nullable)  
    * WorkInstructionID (fk to WorkInstructions Pool, nullable)  
    * QRData (String, for QR code generation)  
    * KitComponents (JSON, for IsKit=true, detailing specific components and quantities, e.g., for Air Gun Kit: "1x 64-20900-00, 1x Gun & Tip Holder Bracket" from packaging checklist)  
  * **AssemblyComponents Table (Junction Table for Assembly BOMs):**  
    * AssemblyComponentID (Primary Key)  
    * ParentAssemblyID (String, fk to Assemblies Table)  
    * ChildPartID (String, fk to Parts Table or Assemblies Table for sub-assemblies)  
    * Quantity (Integer)  
    * Notes (String, nullable)  
  * **Categories Table:**  
    * CategoryID (String, Primary Key, e.g., "718")  
    * Name (String)  
    * Description (String)  
  * **Subcategories Table:**  
    * SubcategoryID (String, Primary Key, e.g., "718.001")  
    * ParentCategoryID (String, fk to Categories Table)  
    * Name (String)  
    * Description (String)  
  * **SubcategoryAssemblyRefs Table (Junction):**  
    * RefID (Primary Key)  
    * SubcategoryID (String, fk)  
    * AssemblyID (String, fk)  
* **5.3. Bill of Materials (BOMs) Pool:**  
  * BOM\_ID (Primary Key)  
  * OrderID (fk, for specific order's BOM)  
  * GeneratedAt (Timestamp)  
  * BOMItems (JSON or structured data representing the hierarchical list of parts and assemblies with quantities for that specific order configuration).  
* **5.4. Work Instructions Pool:**  
  * WorkInstructionID (Primary Key)  
  * AssociatedAssemblyID (String, fk, optional if generic)  
  * Title (String)  
  * Steps (Array of Objects: StepNumber, Description, VisualURL, SafetyNotes)  
* **5.5. Task Lists Pool:**  
  * TaskListID (Primary Key)  
  * AssociatedAssemblyType (String, e.g., "MDRD\_B2\_ESINK") or OrderID (fk)  
  * Tasks (Array of Objects: TaskSequence, Description, WorkInstructionID (fk), RequiredToolIDs (Array of fk), RequiredPartIDs (Array of fk with quantities), ProductionChecklistItemID (fk to specific item in a digitized CLP.T2.001.V01 checklist, optional)).  
* **5.6. Tools Pool:**  
  * ToolID (Primary Key)  
  * Name (String)  
  * Description (String)  
  * ImageURL (String, nullable)  
* **5.7. Users Pool:**  
  * UserID (Primary Key)  
  * Username (String, unique)  
  * PasswordHash (String)  
  * FullName (String)  
  * Role (Enum: ProductionCoordinator, Admin, ProcurementSpecialist, QCPerson, Assembler, ServiceDepartment)  
  * IsActive (Boolean)  
  * Initials (String, for QC/Assembler sign-offs)  
* **5.8. QC Forms/Checklists Pool:**  
  * QCFormTemplateID (Primary Key)  
  * FormName (String, e.g., "Pre-Production Check MDRD", "Sink Production Check MDRD")  
  * FormType (Enum: PreQC, FinalQC, InProcessAssembly)  
  * Version (Integer)  
  * ChecklistItems (Array of Objects: ChecklistItemID (PK within form), Section (String, e.g., "SECTION 1", "E-DRAIN BASIN CHECKS"), ItemDescription (String), CheckType (e.g., Boolean, Text, Measurement, N/AOption), IsBasinSpecific (Boolean), DefaultValue, NotesPrompt (Boolean))  
  * *This pool will store templates derived from documents like CLP.T2.001.V01 \- T2SinkProduction.docx.*  
* **5.9. QC Results Pool:**  
  * QCResultID (Primary Key)  
  * OrderID (fk)  
  * BuildNumber (String, if applicable)  
  * QCFormTemplateID (fk)  
  * QCTypePerformed (Enum: PreQC, FinalQC, InProcessAssembly)  
  * PerformedByUserID (fk)  
  * JobID (String, as per checklist, if applicable)  
  * NumberOfBasins (Integer, as per checklist, if applicable)  
  * Timestamp (DateTime)  
  * OverallStatus (Enum: Pass, Fail, Incomplete)  
  * ItemResults (Array of Objects: ChecklistItemID (fk), ResultValue (String/Boolean/Number), IsNA (Boolean), Notes (String))  
  * DigitalSignature (String, e.g., "User Initials \+ Timestamp" or cryptographic signature)  
* **5.10. Testing Forms & Results Pool (similar to QC Forms):**  
  * For assembly testing. Structure similar to QC Forms/Checklists Pool and QC Results Pool but tailored for functional tests.  
* **5.11. Service Orders Pool:**  
  * ServiceOrderID (Primary Key)  
  * RequestedByUserID (fk, Service Department user)  
  * RequestTimestamp (DateTime)  
  * Status (Enum: Pending, Approved, Rejected, Fulfilled)  
  * Items (Array of Objects: PartID, Quantity)  
  * ProcessedByUserID (fk, Procurement user, nullable)  
  * ProcessedTimestamp (DateTime, nullable)

## **6\. Non-Functional Requirements / Technical Considerations**

* **6.1. Technology Stack:**  
  * **Frontend:** Next.js  
  * **UI Components:** ShadCN UI  
  * **Styling:** Tailwind CSS  
  * **Animations:** Framer Motion (for dropdowns, modals, step transitions: fade-in, slide-up, staggered lists)  
* **6.2. UI/UX Design:**  
  * **Overall:** Sleek, modern, professional, dashboard-style layout.  
  * **Layout:** Fixed sidebar navigation, top toolbar, responsive content panes. Use flex and grid for alignment with consistent gutters (gap-4, p-4, space-y-6).  
  * **Components:** Consistent use of ShadCN components (card, dialog, popover, tabs, data-table, tooltip, badge, form). Customize for professional tone (rounded-xl or 2xl, medium shadows, subtle transitions).  
  * **Icons:** Use lucide-react icons for cues (status indicators, action buttons, breadcrumbs).  
  * **Color Scheme:** Neutral base (e.g., \#f9fafb, \#f1f5f9) with a single accent color (blue, green, or indigo) for actions. Muted variants for states (in progress, on hold, done).  
  * **Typography:** text-xl for headlines, text-base for body. font-semibold for labels, font-medium for descriptions.  
  * **Interactions:** Clean, tactile hover/focus states. Toasts/snackbars for form submissions and background actions.  
  * **Patterns:** Breadcrumb navigation for workflow stages, task cards with expandable details, multi-step forms, filtering/search/tagging tools with responsive feedback.  
  * **Benchmark:** UX polish similar to modern SaaS tools (Notion, Linear, ClickUp).  
  * **Avoid:** Cluttered UI, overuse of modals, inconsistent spacing, overly vibrant colors, non-standard components.  
* **6.3. Database:**  
  * Must support hierarchical data for BOMs and categories.  
  * Ensure data integrity and relationships.  
  * Admin interface should allow for easy editing of database content (parts, assemblies, QC checklist templates, etc.).  
* **6.4. Compliance:**  
  * The system design and data management must support Torvan Medical's ISO 13485:2016 registration requirements, particularly regarding traceability, documentation, process control, and record keeping (e.g., completed QC forms with signatures).  
* **6.5. Accessibility:**  
  * Adhere to WCAG guidelines. Use semantic HTML5, ARIA roles.  
  * Ensure proper color contrast and keyboard navigability.  
  * Use aria-live regions for real-time updates.  
* **6.6. Performance:**  
  * The application should be responsive, with fast load times for pages and data.  
  * Real-time feedback for user interactions like filtering and search.  
* **6.7. Security:**  
  * Implement standard web application security practices, including secure authentication, authorization, and input validation to prevent common vulnerabilities.  
* **6.8. Scalability:**  
  * The architecture should be designed to handle a growing number of users, orders, and data.  
  * State management: Utilize Zustand with Immer for slice-based store architecture, persistence, and devtools.

## **7\. Out of Scope (Initial Release \- Phase 1\)**

* Direct integration with sales and quoting systems (e.g., invoicing). The workflow begins after a sales order is confirmed.  
* Full functionality for "Endoscope CleanStation" and "InstroSink" sink families. These will have placeholder pages indicating they are "Under Construction."  
* Inventory stock level tracking and management (beyond viewing parts for service orders).  
* Costing information for parts or BOMs.  
* Advanced reporting and analytics beyond basic order tracking and QC record viewing.

## **8\. Assumptions**

* The provided JSON files (assemblies.json, parts.json, categories.json) are accurate and represent the current, correct data for products and components.  
* The part numbering system (e.g., "700" series for configurable items) described in sink configuration and bom.txt will be used as a basis for mapping user selections to detailed BOM components.  
* The production checklist document (CLP.T2.001.V01 \- T2SinkProduction.docx) provides a solid foundation for the digital checklists to be implemented.  
* Users will have reliable internet access to use the web application.  
* The "Admin" user (Sal) will be responsible for initial data population and ongoing maintenance of core data like parts, assemblies, work instructions, and QC checklist templates.

## **9\. Open Questions / Clarifications for AI Agent/Development**

* What is the specific data to be encoded in QR codes for assemblies/sub-assemblies? (e.g., link to details page, serial number).  
* **Is CLP.T2.001.V01 \- T2SinkProduction.docx the definitive and complete source for all Pre-QC, Production, and Packaging checklists, or is it an example? Are there other versions or more detailed breakdowns?**  
* **How should "N/A" options in the checklist be handled in the digital form (e.g., a separate checkbox, or implied if a feature isn't present)?**  
* **For checklist items like "Attach the final approved drawing and paperwork," how will this be verified digitally? Link to an uploaded document?**  
* What are the specific triggers and content for user notifications?  
* How are "Parts for Outsourcing" currently identified? Does the system need to automate this identification, or will it be a manual flag by the Procurement Specialist?  
* Are there any existing digital assets (images, technical drawings, work instruction documents) that need to be migrated or linked?  
* Specific requirements for data validation beyond basic type checks (e.g., min/max values for custom dimensions).  
* Workflow for handling rejected QC steps or failed tests – what are the subsequent statuses or actions?  
* **How should the "INITIALS" and "Signature" fields from the checklist be handled digitally for traceability and compliance?** (e.g., User's logged-in identity \+ timestamp).

## **10\. Suggested Phased Implementation Approach (for AI Agent)**

To manage complexity, the development can be phased:

* **Phase 1: Core Order Creation & MDRD Configuration:**  
  * User authentication and role setup (Admin, Production Coordinator).  
  * 5-step order creation wizard for MDRD sinks (Customer Info, Sink Selection, MDRD Configuration, Accessories, Review).  
  * Backend logic for BOM generation based on MDRD configurations using the provided JSON data.  
  * Basic order viewing and status tracking.  
  * Database schema for orders, parts, assemblies, categories.  
* **Phase 2: Procurement & Digital Pre-QC Workflow:**  
  * Procurement Specialist dashboard and functionalities (view orders, review BOMs, update status).  
  * QC Person dashboard.  
  * **Implementation of digital Pre-QC forms based on Section 1 of CLP.T2.001.V01.**  
  * Document upload and association with orders.  
* **Phase 3: Assembly Guidance & Digital Production/Final QC Workflow:**  
  * Assembler dashboard and functionalities (task assignment).  
  * **Generation of tailored task lists incorporating checks from Sections 2 & 3 of CLP.T2.001.V01.**  
  * Task completion tracking, including digital check-offs for production steps.  
  * Testing forms and result recording.  
  * **Digital packaging checklists based on Section 4 of CLP.T2.001.V01.**  
  * **Implementation of digital Final QC forms incorporating relevant checks.**  
* **Phase 4: Service Department & Advanced Features:**  
  * Service Department interface for ordering parts.  
  * Admin functionalities for managing all data pools (parts, assemblies, work instructions, users, **QC checklist templates**).  
  * QR code generation.  
  * Notifications.  
  * Export/Share functionalities.  
  * UI/UX polish, animations, and accessibility enhancements.  
* **Phase 5: Future Scope (Post-Initial Release):**  
  * Implementation of Endoscope CleanStation and InstroSink families.  
  * Advanced reporting and analytics.

This PRD provides a comprehensive guide for the development of the Torvan Medical CleanStation Production Workflow Digitalization application. It should be used as the primary reference for the AI coding agent and development team.