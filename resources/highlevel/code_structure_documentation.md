# Code Structure Documentation
## Torvan Medical CleanStation Production Workflow Digitalization

**Version:** 1.0  
**Date:** June 2, 2025  
**Document Type:** Code Structure Documentation  
**Framework:** Next.js 14+ with App Router

---

## 1. Project Structure Overview

### 1.1 High-Level Architecture
```
torvan-cleanstation/
├── 📁 src/                     # Source code
│   ├── 📁 app/                 # Next.js App Router
│   ├── 📁 components/          # React components
│   ├── 📁 lib/                 # Utilities and configurations
│   ├── 📁 hooks/               # Custom React hooks
│   ├── 📁 store/               # State management
│   └── 📁 types/               # TypeScript definitions
├── 📁 prisma/                  # Database schema and migrations
├── 📁 public/                  # Static assets
├── 📁 docs/                    # Documentation
├── 📁 tests/                   # Test files
└── 📁 scripts/                 # Build and deployment scripts
```

### 1.2 Technology Stack
- **Frontend:** Next.js 14+, React 18, TypeScript
- **UI Framework:** ShadCN UI components
- **Styling:** Tailwind CSS
- **State Management:** Zustand with Immer
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js
- **Testing:** Jest, React Testing Library, Playwright
- **Deployment:** Vercel or AWS

## 2. Detailed Directory Structure

### 2.1 Complete Project Tree
```
torvan-cleanstation/
├── 📄 .env.local                    # Environment variables
├── 📄 .env.example                  # Environment template
├── 📄 .gitignore                    # Git ignore rules
├── 📄 .eslintrc.json               # ESLint configuration
├── 📄 .prettierrc                  # Prettier configuration
├── 📄 next.config.js               # Next.js configuration
├── 📄 package.json                 # Dependencies
├── 📄 tailwind.config.js           # Tailwind configuration
├── 📄 tsconfig.json                # TypeScript configuration
├── 📄 README.md                    # Project documentation
├── 📄 components.json              # ShadCN configuration
├── 📄 middleware.ts                # Next.js middleware
├── 📄 instrumentation.ts           # Monitoring setup
│
├── 📁 src/
│   ├── 📁 app/                     # App Router directory
│   │   ├── 📄 globals.css          # Global styles
│   │   ├── 📄 layout.tsx           # Root layout
│   │   ├── 📄 page.tsx             # Home page
│   │   ├── 📄 loading.tsx          # Loading UI
│   │   ├── 📄 error.tsx            # Error UI
│   │   ├── 📄 not-found.tsx        # 404 page
│   │   │
│   │   ├── 📁 (auth)/              # Authentication group
│   │   │   ├── 📄 layout.tsx       # Auth layout
│   │   │   ├── 📁 login/
│   │   │   │   └── 📄 page.tsx
│   │   │   └── 📁 logout/
│   │   │       └── 📄 page.tsx
│   │   │
│   │   ├── 📁 dashboard/           # Main application
│   │   │   ├── 📄 layout.tsx       # Dashboard layout
│   │   │   ├── 📄 page.tsx         # Dashboard home
│   │   │   ├── 📄 loading.tsx      # Dashboard loading
│   │   │   │
│   │   │   ├── 📁 orders/          # Order management
│   │   │   │   ├── 📄 page.tsx     # Orders list
│   │   │   │   ├── 📄 loading.tsx
│   │   │   │   ├── 📁 create/
│   │   │   │   │   ├── 📄 page.tsx
│   │   │   │   │   └── 📄 layout.tsx
│   │   │   │   └── 📁 [orderId]/
│   │   │   │       ├── 📄 page.tsx
│   │   │   │       ├── 📁 bom/
│   │   │   │       │   └── 📄 page.tsx
│   │   │   │       ├── 📁 qc/
│   │   │   │       │   ├── 📄 page.tsx
│   │   │   │       │   ├── 📁 pre-qc/
│   │   │   │       │   │   └── 📄 page.tsx
│   │   │   │       │   └── 📁 final-qc/
│   │   │   │       │       └── 📄 page.tsx
│   │   │   │       └── 📁 assembly/
│   │   │   │           ├── 📄 page.tsx
│   │   │   │           ├── 📁 tasks/
│   │   │   │           │   └── 📄 page.tsx
│   │   │   │           ├── 📁 testing/
│   │   │   │           │   └── 📄 page.tsx
│   │   │   │           └── 📁 packaging/
│   │   │   │               └── 📄 page.tsx
│   │   │   │
│   │   │   ├── 📁 inventory/       # Inventory management
│   │   │   │   ├── 📄 page.tsx
│   │   │   │   ├── 📁 parts/
│   │   │   │   │   ├── 📄 page.tsx
│   │   │   │   │   └── 📁 [partId]/
│   │   │   │   │       └── 📄 page.tsx
│   │   │   │   └── 📁 assemblies/
│   │   │   │       ├── 📄 page.tsx
│   │   │   │       └── 📁 [assemblyId]/
│   │   │   │           └── 📄 page.tsx
│   │   │   │
│   │   │   ├── 📁 service/         # Service department
│   │   │   │   ├── 📄 page.tsx
│   │   │   │   ├── 📁 parts/
│   │   │   │   │   └── 📄 page.tsx
│   │   │   │   └── 📁 orders/
│   │   │   │       ├── 📄 page.tsx
│   │   │   │       └── 📁 [serviceOrderId]/
│   │   │   │           └── 📄 page.tsx
│   │   │   │
│   │   │   └── 📁 admin/           # Admin functions
│   │   │       ├── 📄 page.tsx
│   │   │       ├── 📁 users/
│   │   │       │   ├── 📄 page.tsx
│   │   │       │   └── 📁 [userId]/
│   │   │       │       └── 📄 page.tsx
│   │   │       ├── 📁 settings/
│   │   │       │   └── 📄 page.tsx
│   │   │       └── 📁 qc-templates/
│   │   │           ├── 📄 page.tsx
│   │   │           └── 📁 [templateId]/
│   │   │               └── 📄 page.tsx
│   │   │
│   │   └── 📁 api/                 # API routes
│   │       ├── 📁 auth/
│   │       │   ├── 📄 [...nextauth].ts
│   │       │   ├── 📁 login/
│   │       │   │   └── 📄 route.ts
│   │       │   └── 📁 logout/
│   │       │       └── 📄 route.ts
│   │       ├── 📁 orders/
│   │       │   ├── 📄 route.ts
│   │       │   └── 📁 [orderId]/
│   │       │       ├── 📄 route.ts
│   │       │       ├── 📁 bom/
│   │       │       │   └── 📄 route.ts
│   │       │       ├── 📁 status/
│   │       │       │   └── 📄 route.ts
│   │       │       └── 📁 documents/
│   │       │           └── 📄 route.ts
│   │       ├── 📁 inventory/
│   │       │   ├── 📁 parts/
│   │       │   │   ├── 📄 route.ts
│   │       │   │   └── 📁 [partId]/
│   │       │   │       └── 📄 route.ts
│   │       │   └── 📁 assemblies/
│   │       │       ├── 📄 route.ts
│   │       │       └── 📁 [assemblyId]/
│   │       │           └── 📄 route.ts
│   │       ├── 📁 qc/
│   │       │   ├── 📁 templates/
│   │       │   │   └── 📄 route.ts
│   │       │   └── 📁 results/
│   │       │       └── 📄 route.ts
│   │       ├── 📁 service/
│   │       │   ├── 📁 parts/
│   │       │   │   └── 📄 route.ts
│   │       │   └── 📁 orders/
│   │       │       └── 📄 route.ts
│   │       ├── 📁 admin/
│   │       │   ├── 📁 users/
│   │       │   │   └── 📄 route.ts
│   │       │   └── 📁 settings/
│   │       │       └── 📄 route.ts
│   │       ├── 📁 files/
│   │       │   ├── 📁 upload/
│   │       │   │   └── 📄 route.ts
│   │       │   └── 📁 download/
│   │       │       └── 📄 route.ts
│   │       └── 📁 webhooks/
│   │           └── 📄 route.ts
│   │
│   ├── 📁 components/              # React components
│   │   ├── 📁 ui/                  # ShadCN base components
│   │   │   ├── 📄 button.tsx
│   │   │   ├── 📄 input.tsx
│   │   │   ├── 📄 form.tsx
│   │   │   ├── 📄 dialog.tsx
│   │   │   ├── 📄 table.tsx
│   │   │   ├── 📄 card.tsx
│   │   │   ├── 📄 badge.tsx
│   │   │   ├── 📄 tabs.tsx
│   │   │   ├── 📄 toast.tsx
│   │   │   ├── 📄 dropdown-menu.tsx
│   │   │   ├── 📄 popover.tsx
│   │   │   ├── 📄 tooltip.tsx
│   │   │   ├── 📄 select.tsx
│   │   │   ├── 📄 checkbox.tsx
│   │   │   ├── 📄 radio-group.tsx
│   │   │   ├── 📄 textarea.tsx
│   │   │   ├── 📄 label.tsx
│   │   │   ├── 📄 separator.tsx
│   │   │   ├── 📄 skeleton.tsx
│   │   │   └── 📄 progress.tsx
│   │   │
│   │   ├── 📁 layout/              # Layout components
│   │   │   ├── 📄 header.tsx
│   │   │   ├── 📄 sidebar.tsx
│   │   │   ├── 📄 navigation.tsx
│   │   │   ├── 📄 breadcrumbs.tsx
│   │   │   ├── 📄 page-header.tsx
│   │   │   └── 📄 footer.tsx
│   │   │
│   │   ├── 📁 auth/                # Authentication components
│   │   │   ├── 📄 login-form.tsx
│   │   │   ├── 📄 logout-button.tsx
│   │   │   ├── 📄 protected-route.tsx
│   │   │   └── 📄 role-guard.tsx
│   │   │
│   │   ├── 📁 orders/              # Order-related components
│   │   │   ├── 📄 order-list.tsx
│   │   │   ├── 📄 order-card.tsx
│   │   │   ├── 📄 order-detail.tsx
│   │   │   ├── 📄 order-status-badge.tsx
│   │   │   ├── 📄 status-timeline.tsx
│   │   │   ├── 📁 creation/
│   │   │   │   ├── 📄 order-wizard.tsx
│   │   │   │   ├── 📄 step-navigation.tsx
│   │   │   │   ├── 📄 customer-info-step.tsx
│   │   │   │   ├── 📄 sink-selection-step.tsx
│   │   │   │   ├── 📄 sink-configuration-step.tsx
│   │   │   │   ├── 📄 accessories-step.tsx
│   │   │   │   ├── 📄 review-step.tsx
│   │   │   │   ├── 📄 progress-indicator.tsx
│   │   │   │   └── 📄 configuration-form.tsx
│   │   │   ├── 📁 bom/
│   │   │   │   ├── 📄 bom-viewer.tsx
│   │   │   │   ├── 📄 bom-tree.tsx
│   │   │   │   ├── 📄 bom-item.tsx
│   │   │   │   ├── 📄 bom-export.tsx
│   │   │   │   └── 📄 bom-summary.tsx
│   │   │   └── 📁 filters/
│   │   │       ├── 📄 order-filters.tsx
│   │   │       ├── 📄 status-filter.tsx
│   │   │       ├── 📄 date-range-filter.tsx
│   │   │       └── 📄 search-filter.tsx
│   │   │
│   │   ├── 📁 qc/                  # Quality Control components
│   │   │   ├── 📄 qc-form.tsx
│   │   │   ├── 📄 qc-checklist.tsx
│   │   │   ├── 📄 qc-item.tsx
│   │   │   ├── 📄 qc-signature.tsx
│   │   │   ├── 📄 qc-photo-upload.tsx
│   │   │   ├── 📄 qc-results-viewer.tsx
│   │   │   ├── 📄 pre-qc-form.tsx
│   │   │   ├── 📄 final-qc-form.tsx
│   │   │   └── 📄 qc-template-builder.tsx
│   │   │
│   │   ├── 📁 assembly/             # Assembly components
│   │   │   ├── 📄 task-list.tsx
│   │   │   ├── 📄 task-card.tsx
│   │   │   ├── 📄 task-detail.tsx
│   │   │   ├── 📄 work-instruction.tsx
│   │   │   ├── 📄 progress-tracker.tsx
│   │   │   ├── 📄 tool-list.tsx
│   │   │   ├── 📄 parts-list.tsx
│   │   │   ├── 📄 testing-form.tsx
│   │   │   ├── 📄 packaging-checklist.tsx
│   │   │   └── 📄 time-tracker.tsx
│   │   │
│   │   ├── 📁 service/              # Service department components
│   │   │   ├── 📄 service-parts-catalog.tsx
│   │   │   ├── 📄 parts-search.tsx
│   │   │   ├── 📄 shopping-cart.tsx
│   │   │   ├── 📄 cart-item.tsx
│   │   │   ├── 📄 service-order-form.tsx
│   │   │   └── 📄 service-order-list.tsx
│   │   │
│   │   ├── 📁 inventory/           # Inventory components
│   │   │   ├── 📄 parts-table.tsx
│   │   │   ├── 📄 assembly-table.tsx
│   │   │   ├── 📄 part-detail.tsx
│   │   │   ├── 📄 assembly-detail.tsx
│   │   │   ├── 📄 component-tree.tsx
│   │   │   └── 📄 qr-code-generator.tsx
│   │   │
│   │   ├── 📁 admin/               # Admin components
│   │   │   ├── 📄 user-management.tsx
│   │   │   ├── 📄 user-form.tsx
│   │   │   ├── 📄 user-table.tsx
│   │   │   ├── 📄 data-import.tsx
│   │   │   ├── 📄 bulk-operations.tsx
│   │   │   └── 📄 system-settings.tsx
│   │   │
│   │   ├── 📁 dashboards/          # Role-specific dashboards
│   │   │   ├── 📄 production-coordinator-dashboard.tsx
│   │   │   ├── 📄 procurement-dashboard.tsx
│   │   │   ├── 📄 qc-dashboard.tsx
│   │   │   ├── 📄 assembler-dashboard.tsx
│   │   │   ├── 📄 service-dashboard.tsx
│   │   │   └── 📄 admin-dashboard.tsx
│   │   │
│   │   ├── 📁 shared/              # Shared utility components
│   │   │   ├── 📄 data-table.tsx
│   │   │   ├── 📄 file-upload.tsx
│   │   │   ├── 📄 image-viewer.tsx
│   │   │   ├── 📄 pdf-viewer.tsx
│   │   │   ├── 📄 notification-center.tsx
│   │   │   ├── 📄 loading-spinner.tsx
│   │   │   ├── 📄 error-boundary.tsx
│   │   │   ├── 📄 confirmation-dialog.tsx
│   │   │   ├── 📄 export-button.tsx
│   │   │   ├── 📄 print-button.tsx
│   │   │   ├── 📄 pagination.tsx
│   │   │   ├── 📄 search-input.tsx
│   │   │   ├── 📄 date-picker.tsx
│   │   │   ├── 📄 multi-select.tsx
│   │   │   └── 📄 theme-provider.tsx
│   │   │
│   │   └── 📁 forms/               # Form components
│   │       ├── 📄 form-field.tsx
│   │       ├── 📄 form-section.tsx
│   │       ├── 📄 form-wizard.tsx
│   │       ├── 📄 dynamic-form.tsx
│   │       ├── 📄 validation-message.tsx
│   │       └── 📄 form-actions.tsx
│   │
│   ├── 📁 lib/                     # Utilities and configurations
│   │   ├── 📄 auth.ts              # Authentication configuration
│   │   ├── 📄 db.ts                # Database connection
│   │   ├── 📄 utils.ts             # General utilities
│   │   ├── 📄 constants.ts         # Application constants
│   │   ├── 📄 env.ts               # Environment validation
│   │   ├── 📁 validations/         # Zod validation schemas
│   │   │   ├── 📄 auth.ts
│   │   │   ├── 📄 order.ts
│   │   │   ├── 📄 user.ts
│   │   │   ├── 📄 qc.ts
│   │   │   ├── 📄 assembly.ts
│   │   │   └── 📄 service.ts
│   │   ├── 📁 api/                 # API utilities
│   │   │   ├── 📄 client.ts
│   │   │   ├── 📄 endpoints.ts
│   │   │   ├── 📄 types.ts
│   │   │   └── 📄 hooks.ts
│   │   ├── 📁 bom/                 # BOM generation logic
│   │   │   ├── 📄 generator.ts
│   │   │   ├── 📄 rules.ts
│   │   │   ├── 📄 mapper.ts
│   │   │   └── 📄 validator.ts
│   │   ├── 📁 email/               # Email utilities
│   │   │   ├── 📄 client.ts
│   │   │   ├── 📄 templates.ts
│   │   │   └── 📄 notifications.ts
│   │   ├── 📁 export/              # Export utilities
│   │   │   ├── 📄 csv.ts
│   │   │   ├── 📄 pdf.ts
│   │   │   └── 📄 excel.ts
│   │   ├── 📁 storage/             # File storage
│   │   │   ├── 📄 client.ts
│   │   │   ├── 📄 upload.ts
│   │   │   └── 📄 download.ts
│   │   └── 📁 monitoring/          # Monitoring utilities
│   │       ├── 📄 logger.ts
│   │       ├── 📄 metrics.ts
│   │       └── 📄 alerts.ts
│   │
│   ├── 📁 hooks/                   # Custom React hooks
│   │   ├── 📄 use-auth.ts          # Authentication hook
│   │   ├── 📄 use-orders.ts        # Orders data hook
│   │   ├── 📄 use-bom.ts           # BOM data hook
│   │   ├── 📄 use-qc.ts            # QC data hook
│   │   ├── 📄 use-assembly.ts      # Assembly data hook
│   │   ├── 📄 use-service.ts       # Service data hook
│   │   ├── 📄 use-inventory.ts     # Inventory data hook
│   │   ├── 📄 use-users.ts         # Users data hook
│   │   ├── 📄 use-debounce.ts      # Debounce utility
│   │   ├── 📄 use-local-storage.ts # Local storage hook
│   │   ├── 📄 use-form-wizard.ts   # Form wizard hook
│   │   ├── 📄 use-file-upload.ts   # File upload hook
│   │   ├── 📄 use-notifications.ts # Notifications hook
│   │   └── 📄 use-permissions.ts   # Permissions hook
│   │
│   ├── 📁 store/                   # State management
│   │   ├── 📄 index.ts             # Store configuration
│   │   ├── 📄 auth-store.ts        # Authentication state
│   │   ├── 📄 order-store.ts       # Order state
│   │   ├── 📄 ui-store.ts          # UI state
│   │   ├── 📄 notification-store.ts # Notifications state
│   │   ├── 📄 form-store.ts        # Form state
│   │   └── 📄 theme-store.ts       # Theme state
│   │
│   └── 📁 types/                   # TypeScript type definitions
│       ├── 📄 index.ts             # Main type exports
│       ├── 📄 auth.ts              # Authentication types
│       ├── 📄 order.ts             # Order types
│       ├── 📄 bom.ts               # BOM types
│       ├── 📄 qc.ts                # Quality Control types
│       ├── 📄 assembly.ts          # Assembly types
│       ├── 📄 service.ts           # Service types
│       ├── 📄 inventory.ts         # Inventory types
│       ├── 📄 user.ts              # User types
│       ├── 📄 api.ts               # API types
│       ├── 📄 database.ts          # Database types
│       └── 📄 ui.ts                # UI component types
│
├── 📁 prisma/                      # Database schema and migrations
│   ├── 📄 schema.prisma            # Prisma schema
│   ├── 📁 migrations/              # Database migrations
│   ├── 📁 seed/                    # Database seeding
│   │   ├── 📄 index.ts
│   │   ├── 📄 users.ts
│   │   ├── 📄 parts.ts
│   │   ├── 📄 assemblies.ts
│   │   └── 📄 categories.ts
│   └── 📁 data/                    # Reference data
│       ├── 📄 parts.json
│       ├── 📄 assemblies.json
│       └── 📄 categories.json
│
├── 📁 public/                      # Static assets
│   ├── 📁 images/                  # Image assets
│   │   ├── 📁 logos/
│   │   ├── 📁 icons/
│   │   ├── 📁 products/
│   │   └── 📁 placeholders/
│   ├── 📁 documents/               # Static documents
│   ├── 📁 fonts/                   # Custom fonts
│   └── 📄 favicon.ico              # Favicon
│
├── 📁 docs/                        # Documentation
│   ├── 📄 README.md
│   ├── 📄 DEPLOYMENT.md
│   ├── 📄 DEVELOPMENT.md
│   ├── 📄 API.md
│   └── 📁 diagrams/
│
├── 📁 tests/                       # Test files
│   ├── 📁 __mocks__/               # Test mocks
│   ├── 📁 unit/                    # Unit tests
│   ├── 📁 integration/             # Integration tests
│   ├── 📁 e2e/                     # End-to-end tests
│   ├── 📁 fixtures/                # Test fixtures
│   ├── 📁 utils/                   # Test utilities
│   └── 📄 setup.ts                 # Test setup
│
└── 📁 scripts/                     # Build and deployment scripts
    ├── 📄 build.sh                 # Build script
    ├── 📄 deploy.sh                # Deployment script
    ├── 📄 db-migrate.sh            # Database migration
    ├── 📄 db-seed.sh               # Database seeding
    └── 📄 generate-types.sh        # Type generation
```

## 3. Core Component Architecture

### 3.1 Layout Components Structure

#### Root Layout (`src/app/layout.tsx`)
```typescript
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "min-h-screen bg-background antialiased")}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <SessionProvider>
            <div className="relative flex min-h-screen flex-col">
              <Toaster />
              <NotificationCenter />
              {children}
            </div>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### Dashboard Layout (`src/app/dashboard/layout.tsx`)
```typescript
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
```

### 3.2 Component Design Patterns

#### Compound Component Pattern
```typescript
// Order Wizard compound component
export const OrderWizard = {
  Root: OrderWizardRoot,
  Navigation: StepNavigation,
  Step: WizardStep,
  Actions: WizardActions,
  Progress: ProgressIndicator,
};

// Usage
<OrderWizard.Root>
  <OrderWizard.Progress currentStep={currentStep} totalSteps={5} />
  <OrderWizard.Navigation steps={steps} currentStep={currentStep} />
  <OrderWizard.Step>
    <CustomerInfoForm />
  </OrderWizard.Step>
  <OrderWizard.Actions onNext={handleNext} onPrev={handlePrev} />
</OrderWizard.Root>
```

#### Render Props Pattern
```typescript
// DataTable with render props
interface DataTableProps<T> {
  data: T[];
  loading?: boolean;
  children: (data: T[], loading: boolean) => React.ReactNode;
}

export function DataTable<T>({ data, loading = false, children }: DataTableProps<T>) {
  return (
    <div className="rounded-md border">
      {children(data, loading)}
    </div>
  );
}

// Usage
<DataTable data={orders} loading={isLoading}>
  {(orders, loading) => (
    loading ? <OrdersSkeleton /> : <OrdersTable orders={orders} />
  )}
</DataTable>
```

#### Factory Pattern for Forms
```typescript
// Form factory for different entity types
export class FormFactory {
  static createOrderForm(step: OrderStep) {
    switch (step) {
      case 'customer-info':
        return CustomerInfoForm;
      case 'sink-selection':
        return SinkSelectionForm;
      case 'sink-configuration':
        return SinkConfigurationForm;
      case 'accessories':
        return AccessoriesForm;
      case 'review':
        return ReviewForm;
      default:
        throw new Error(`Unknown form step: ${step}`);
    }
  }

  static createQCForm(type: QCFormType) {
    switch (type) {
      case 'PRE_QC':
        return PreQCForm;
      case 'FINAL_QC':
        return FinalQCForm;
      case 'IN_PROCESS':
        return InProcessQCForm;
      default:
        throw new Error(`Unknown QC form type: ${type}`);
    }
  }
}
```

## 4. State Management Architecture

### 4.1 Zustand Store Structure

#### Auth Store (`src/store/auth-store.ts`)
```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  permissions: string[];
  
  // Actions
  setUser: (user: User) => void;
  clearUser: () => void;
  hasPermission: (permission: string) => boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      user: null,
      isAuthenticated: false,
      permissions: [],

      setUser: (user) => set((state) => {
        state.user = user;
        state.isAuthenticated = true;
        state.permissions = getUserPermissions(user.role);
      }),

      clearUser: () => set((state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.permissions = [];
      }),

      hasPermission: (permission) => {
        const { permissions } = get();
        return permissions.includes(permission) || permissions.includes('*');
      },

      login: async (credentials) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });

        if (response.ok) {
          const { user } = await response.json();
          get().setUser(user);
        } else {
          throw new Error('Login failed');
        }
      },

      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        get().clearUser();
      },
    })),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
```

#### Order Store (`src/store/order-store.ts`)
```typescript
interface OrderState {
  // State
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
  filters: OrderFilters;
  pagination: PaginationState;

  // Actions
  fetchOrders: (params?: FetchOrdersParams) => Promise<void>;
  fetchOrder: (id: string) => Promise<void>;
  createOrder: (orderData: CreateOrderData) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus, notes?: string) => Promise<void>;
  setFilters: (filters: Partial<OrderFilters>) => void;
  clearError: () => void;
}

export const useOrderStore = create<OrderState>()(
  immer((set, get) => ({
    orders: [],
    currentOrder: null,
    loading: false,
    error: null,
    filters: {
      status: null,
      customer: '',
      dateRange: null,
    },
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
    },

    fetchOrders: async (params = {}) => {
      set((state) => { state.loading = true; state.error = null; });
      
      try {
        const queryParams = new URLSearchParams({
          page: params.page?.toString() || get().pagination.page.toString(),
          limit: params.limit?.toString() || get().pagination.limit.toString(),
          ...get().filters,
          ...params,
        });

        const response = await fetch(`/api/orders?${queryParams}`);
        const data = await response.json();

        if (data.success) {
          set((state) => {
            state.orders = data.data;
            state.pagination = data.metadata.pagination;
            state.loading = false;
          });
        } else {
          throw new Error(data.error.message);
        }
      } catch (error) {
        set((state) => {
          state.error = error.message;
          state.loading = false;
        });
      }
    },

    createOrder: async (orderData) => {
      set((state) => { state.loading = true; state.error = null; });

      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });

        const data = await response.json();

        if (data.success) {
          const newOrder = data.data;
          set((state) => {
            state.orders.unshift(newOrder);
            state.loading = false;
          });
          return newOrder;
        } else {
          throw new Error(data.error.message);
        }
      } catch (error) {
        set((state) => {
          state.error = error.message;
          state.loading = false;
        });
        throw error;
      }
    },

    // ... other actions
  }))
);
```

### 4.2 Custom Hooks Architecture

#### Data Fetching Hook (`src/hooks/use-orders.ts`)
```typescript
export function useOrders(params?: UseOrdersParams) {
  const { 
    fetchOrders, 
    orders, 
    loading, 
    error, 
    pagination 
  } = useOrderStore();

  const {
    page = 1,
    limit = 10,
    status,
    customer,
    autoFetch = true,
  } = params || {};

  // Fetch orders on mount or when params change
  useEffect(() => {
    if (autoFetch) {
      fetchOrders({ page, limit, status, customer });
    }
  }, [page, limit, status, customer, autoFetch, fetchOrders]);

  // Refetch function
  const refetch = useCallback(() => {
    fetchOrders({ page, limit, status, customer });
  }, [page, limit, status, customer, fetchOrders]);

  // Mutation helpers
  const { mutate: createOrder, isLoading: isCreating } = useMutation({
    mutationFn: useOrderStore.getState().createOrder,
    onSuccess: () => {
      refetch();
      toast.success('Order created successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    orders,
    loading,
    error,
    pagination,
    refetch,
    createOrder,
    isCreating,
  };
}
```

#### Form Wizard Hook (`src/hooks/use-form-wizard.ts`)
```typescript
interface UseFormWizardProps<T> {
  steps: WizardStep<T>[];
  initialData?: Partial<T>;
  onComplete?: (data: T) => Promise<void> | void;
  validation?: Record<string, z.ZodSchema>;
}

export function useFormWizard<T>({
  steps,
  initialData = {},
  onComplete,
  validation = {},
}: UseFormWizardProps<T>) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Partial<T>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepInfo = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const validateStep = useCallback((stepKey: string, stepData: any) => {
    const schema = validation[stepKey];
    if (!schema) return { success: true, data: stepData };

    try {
      const validatedData = schema.parse(stepData);
      setErrors((prev) => ({ ...prev, [stepKey]: '' }));
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(e => e.message).join(', ');
        setErrors((prev) => ({ ...prev, [stepKey]: errorMessage }));
      }
      return { success: false, error };
    }
  }, [validation]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  }, [steps.length]);

  const nextStep = useCallback(() => {
    if (!isLastStep) {
      const stepValidation = validateStep(currentStepInfo.key, data);
      if (stepValidation.success) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [currentStep, data, validateStep, currentStepInfo, isLastStep]);

  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const updateData = useCallback((stepData: Partial<T>) => {
    setData((prev) => ({ ...prev, ...stepData }));
  }, []);

  const submitForm = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Validate all steps
      let allValid = true;
      for (const step of steps) {
        const stepValidation = validateStep(step.key, data);
        if (!stepValidation.success) {
          allValid = false;
        }
      }

      if (allValid && onComplete) {
        await onComplete(data as T);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [data, steps, validateStep, onComplete]);

  return {
    currentStep,
    currentStepInfo,
    data,
    errors,
    isSubmitting,
    isFirstStep,
    isLastStep,
    goToStep,
    nextStep,
    prevStep,
    updateData,
    submitForm,
    validateStep,
  };
}
```

## 5. API Layer Architecture

### 5.1 API Route Structure

#### Order API Route (`src/app/api/orders/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { orderSchema } from '@/lib/validations/order';
import { generateBOM } from '@/lib/bom/generator';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_001', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const customer = searchParams.get('customer');

    // Build query based on user role
    const where = buildOrderQuery(session.user.role, {
      status,
      customer,
      userId: session.user.id,
    });

    const [orders, total] = await Promise.all([
      db.productionOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          currentAssignee: {
            select: { id: true, fullName: true, role: true }
          },
          _count: {
            select: { documents: true }
          }
        }
      }),
      db.productionOrder.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      metadata: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user, 'orders:create')) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_002', message: 'Insufficient permissions' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = orderSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VAL_001', 
            message: 'Validation error',
            details: validationResult.error.flatten()
          } 
        },
        { status: 400 }
      );
    }

    const orderData = validationResult.data;

    // Create order with transaction
    const result = await db.$transaction(async (tx) => {
      // Create main order
      const order = await tx.productionOrder.create({
        data: {
          poNumber: orderData.customerInfo.poNumber,
          buildNumber: orderData.sinkSelection.buildNumbers[0],
          customerName: orderData.customerInfo.customerName,
          projectName: orderData.customerInfo.projectName,
          salesPerson: orderData.customerInfo.salesPerson,
          wantDate: new Date(orderData.customerInfo.wantDate),
          orderLanguage: orderData.customerInfo.documentLanguage,
          notes: orderData.customerInfo.notes,
          
          // Sink configuration
          sinkFamily: orderData.sinkSelection.sinkFamily,
          sinkModel: orderData.sinkConfigurations[0].sinkBody.sinkModel,
          sinkWidth: orderData.sinkConfigurations[0].sinkBody.dimensions.width,
          sinkLength: orderData.sinkConfigurations[0].sinkBody.dimensions.length,
          legsType: orderData.sinkConfigurations[0].sinkBody.legsType,
          legsModel: orderData.sinkConfigurations[0].sinkBody.legsModel,
          feetType: orderData.sinkConfigurations[0].sinkBody.feetType,
          workflowDirection: orderData.sinkConfigurations[0].sinkBody.workflowDirection,
          
          // Pegboard
          hasPegboard: orderData.sinkConfigurations[0].sinkBody.pegboard.enabled,
          pegboardColor: orderData.sinkConfigurations[0].sinkBody.pegboard.color,
          pegboardType: orderData.sinkConfigurations[0].sinkBody.pegboard.type,
          
          orderStatus: 'ORDER_CREATED'
        }
      });

      // Create basin configurations
      for (const basin of orderData.sinkConfigurations[0].basinConfigurations) {
        await tx.basinConfiguration.create({
          data: {
            orderId: order.id,
            basinIndex: basin.basinIndex,
            basinType: basin.basinType,
            basinWidth: basin.basinSize.dimensions.width,
            basinLength: basin.basinSize.dimensions.length,
            basinDepth: basin.basinSize.dimensions.depth,
            isCustomSize: basin.basinSize.type === 'CUSTOM',
            hasPTrapDrain: basin.addons.includes('P_TRAP_DISINFECTION_DRAIN_UNIT'),
            hasBasinLight: basin.addons.includes('BASIN_LIGHT')
          }
        });
      }

      // Generate and save BOM
      const bomData = generateBOM(orderData.sinkConfigurations[0]);
      const bom = await tx.billOfMaterials.create({
        data: {
          orderId: order.id,
          generatedBy: session.user.id,
          status: 'DRAFT'
        }
      });

      // Save BOM items
      for (const item of bomData.items) {
        await tx.bOMItem.create({
          data: {
            bomId: bom.id,
            itemType: item.type,
            itemId: item.itemId,
            parentItemId: item.parentId ? findBOMItemId(item.parentId) : null,
            quantity: item.quantity,
            level: item.level,
            sequenceOrder: item.sequenceOrder,
            isCustomPart: item.isCustomPart || false,
            customPartSpec: item.customPartSpec || null
          }
        });
      }

      // Update order with BOM reference
      await tx.productionOrder.update({
        where: { id: order.id },
        data: { bomId: bom.id }
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          entityType: 'ProductionOrder',
          entityId: order.id,
          newValues: order
        }
      });

      return { order, bom };
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: result.order.id,
        poNumber: result.order.poNumber,
        status: result.order.orderStatus,
        bomGenerated: true,
        createdAt: result.order.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
```

### 5.2 API Client Layer

#### API Client (`src/lib/api/client.ts`)
```typescript
import { getSession } from 'next-auth/react';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string = '/api/v1') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const session = await getSession();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(session?.user?.accessToken && {
          Authorization: `Bearer ${session.user.accessToken}`
        }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new APIError(data.error?.message || 'Request failed', response.status, data.error?.code);
    }

    return data;
  }

  // Orders API
  async getOrders(params?: GetOrdersParams): Promise<APIResponse<Order[]>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.customer) searchParams.set('customer', params.customer);

    return this.request(`/orders?${searchParams}`);
  }

  async getOrder(id: string): Promise<APIResponse<Order>> {
    return this.request(`/orders/${id}`);
  }

  async createOrder(orderData: CreateOrderData): Promise<APIResponse<{ orderId: string }>> {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async updateOrderStatus(
    id: string, 
    status: OrderStatus, 
    notes?: string
  ): Promise<APIResponse<{ orderId: string }>> {
    return this.request(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  // BOM API
  async getBOM(orderId: string): Promise<APIResponse<BOM>> {
    return this.request(`/orders/${orderId}/bom`);
  }

  async regenerateBOM(orderId: string): Promise<APIResponse<{ bomId: string }>> {
    return this.request(`/orders/${orderId}/bom/regenerate`, {
      method: 'POST',
    });
  }

  // QC API
  async getQCTemplates(type?: QCFormType): Promise<APIResponse<QCTemplate[]>> {
    const params = type ? `?type=${type}` : '';
    return this.request(`/qc/templates${params}`);
  }

  async submitQCResult(qcData: QCResultData): Promise<APIResponse<{ qcResultId: string }>> {
    return this.request('/qc/results', {
      method: 'POST',
      body: JSON.stringify(qcData),
    });
  }

  // File upload
  async uploadFile(file: File, orderId: string, documentType: string): Promise<APIResponse<{ fileId: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderId', orderId);
    formData.append('documentType', documentType);

    return this.request('/files/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Remove Content-Type to let browser set it with boundary
    });
  }
}

export const apiClient = new APIClient();

// Error handling
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

## 6. Database Integration

### 6.1 Prisma Configuration

#### Schema Definition (`prisma/schema.prisma`)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User Management
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  fullName     String
  initials     String
  role         UserRole
  isActive     Boolean  @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  assignedOrders     ProductionOrder[] @relation("AssignedOrders")
  performedQC        QCResult[]
  serviceOrders      ServiceOrder[]
  auditLogs          AuditLog[]
  uploadedDocuments  Document[]

  @@map("users")
}

// Order Management
model ProductionOrder {
  id               String           @id @default(cuid())
  poNumber         String
  buildNumber      String
  customerName     String
  projectName      String?
  salesPerson      String
  wantDate         DateTime
  orderLanguage    DocumentLanguage @default(EN)
  notes            String?
  
  // Sink Configuration
  sinkFamily       SinkFamily
  sinkModel        String
  sinkWidth        Int
  sinkLength       Int
  legsType         LegsType
  legsModel        String
  feetType         FeetType
  workflowDirection WorkflowDirection
  
  // Pegboard Configuration
  hasPegboard      Boolean          @default(false)
  pegboardColor    PegboardColor?
  pegboardType     PegboardType?
  pegboardSizeType PegboardSizeType?
  pegboardWidth    Int?
  pegboardLength   Int?
  
  // Order Status
  orderStatus      OrderStatus      @default(ORDER_CREATED)
  currentAssigneeId String?
  bomId            String?
  
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  // Relations
  currentAssignee  User?            @relation("AssignedOrders", fields: [currentAssigneeId], references: [id])
  bom              BillOfMaterials? @relation(fields: [bomId], references: [id])
  basins           BasinConfiguration[]
  faucets          FaucetConfiguration[]
  sprayers         SprayerConfiguration[]
  accessories      OrderAccessory[]
  statusHistory    OrderStatusHistory[]
  documents        OrderDocument[]
  qcResults        QCResult[]
  taskLists        TaskList[]
  testingForms     TestingForm[]
  packagingChecklists PackagingChecklist[]
  auditLogs        AuditLog[]       @relation("OrderAuditLogs")

  @@unique([poNumber, buildNumber])
  @@map("production_orders")
}
```

### 6.2 Database Service Layer

#### Order Service (`src/lib/services/order-service.ts`)
```typescript
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export class OrderService {
  async findMany(params: FindOrdersParams) {
    const {
      page = 1,
      limit = 10,
      status,
      customer,
      userRole,
      userId,
    } = params;

    const where: Prisma.ProductionOrderWhereInput = {
      ...(status && { orderStatus: status }),
      ...(customer && { 
        customerName: { 
          contains: customer, 
          mode: 'insensitive' 
        } 
      }),
      ...this.buildRoleBasedFilter(userRole, userId),
    };

    const [orders, total] = await Promise.all([
      db.productionOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          currentAssignee: {
            select: { id: true, fullName: true, role: true }
          },
          _count: {
            select: { 
              documents: true,
              qcResults: true,
              statusHistory: true
            }
          }
        }
      }),
      db.productionOrder.count({ where })
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findById(id: string, userRole?: UserRole) {
    const order = await db.productionOrder.findUnique({
      where: { id },
      include: {
        currentAssignee: true,
        bom: {
          include: {
            items: {
              orderBy: [
                { level: 'asc' },
                { sequenceOrder: 'asc' }
              ]
            }
          }
        },
        basins: {
          orderBy: { basinIndex: 'asc' }
        },
        faucets: true,
        sprayers: true,
        accessories: true,
        statusHistory: {
          include: {
            user: {
              select: { id: true, fullName: true, role: true }
            }
          },
          orderBy: { timestamp: 'desc' }
        },
        documents: {
          include: {
            document: true
          }
        },
        qcResults: {
          include: {
            template: true,
            performedBy: {
              select: { id: true, fullName: true, initials: true }
            },
            itemResults: {
              include: {
                checklistItem: true
              }
            }
          },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Role-based filtering of sensitive data
    if (userRole && !this.canAccessOrder(order, userRole)) {
      throw new Error('Insufficient permissions');
    }

    return order;
  }

  async create(orderData: CreateOrderInput, userId: string) {
    return db.$transaction(async (tx) => {
      // Create main order
      const order = await tx.productionOrder.create({
        data: {
          poNumber: orderData.customerInfo.poNumber,
          buildNumber: orderData.sinkSelection.buildNumbers[0],
          customerName: orderData.customerInfo.customerName,
          projectName: orderData.customerInfo.projectName,
          salesPerson: orderData.customerInfo.salesPerson,
          wantDate: orderData.customerInfo.wantDate,
          orderLanguage: orderData.customerInfo.documentLanguage,
          notes: orderData.customerInfo.notes,
          
          // Sink configuration
          sinkFamily: orderData.sinkSelection.sinkFamily,
          sinkModel: orderData.sinkConfigurations[0].sinkBody.sinkModel,
          sinkWidth: orderData.sinkConfigurations[0].sinkBody.dimensions.width,
          sinkLength: orderData.sinkConfigurations[0].sinkBody.dimensions.length,
          legsType: orderData.sinkConfigurations[0].sinkBody.legsType,
          legsModel: orderData.sinkConfigurations[0].sinkBody.legsModel,
          feetType: orderData.sinkConfigurations[0].sinkBody.feetType,
          workflowDirection: orderData.sinkConfigurations[0].sinkBody.workflowDirection,
          
          // Pegboard
          hasPegboard: orderData.sinkConfigurations[0].sinkBody.pegboard.enabled,
          pegboardColor: orderData.sinkConfigurations[0].sinkBody.pegboard.color,
          pegboardType: orderData.sinkConfigurations[0].sinkBody.pegboard.type,
        }
      });

      // Create related entities
      await this.createBasinConfigurations(tx, order.id, orderData.sinkConfigurations[0].basinConfigurations);
      await this.createFaucetConfigurations(tx, order.id, orderData.sinkConfigurations[0].faucetConfigurations);
      await this.createSprayerConfigurations(tx, order.id, orderData.sinkConfigurations[0].sprayerConfigurations);
      await this.createAccessories(tx, order.id, orderData.accessories);

      // Generate and save BOM
      const bom = await this.generateAndSaveBOM(tx, order.id, orderData.sinkConfigurations[0], userId);

      // Update order with BOM reference
      await tx.productionOrder.update({
        where: { id: order.id },
        data: { bomId: bom.id }
      });

      // Create audit log
      await this.createAuditLog(tx, userId, 'CREATE', 'ProductionOrder', order.id, null, order);

      return order;
    });
  }

  async updateStatus(
    orderId: string, 
    newStatus: OrderStatus, 
    userId: string, 
    notes?: string,
    assigneeId?: string
  ) {
    return db.$transaction(async (tx) => {
      const currentOrder = await tx.productionOrder.findUnique({
        where: { id: orderId }
      });

      if (!currentOrder) {
        throw new Error('Order not found');
      }

      // Update order
      const updatedOrder = await tx.productionOrder.update({
        where: { id: orderId },
        data: {
          orderStatus: newStatus,
          ...(assigneeId && { currentAssigneeId: assigneeId }),
          updatedAt: new Date()
        }
      });

      // Create status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          userId,
          action: 'STATUS_UPDATE',
          oldStatus: currentOrder.orderStatus,
          newStatus,
          notes,
          timestamp: new Date()
        }
      });

      // Create notifications for relevant users
      await this.createStatusChangeNotifications(tx, updatedOrder, newStatus);

      // Create audit log
      await this.createAuditLog(
        tx, 
        userId, 
        'UPDATE', 
        'ProductionOrder', 
        orderId, 
        { orderStatus: currentOrder.orderStatus }, 
        { orderStatus: newStatus }
      );

      return updatedOrder;
    });
  }

  private buildRoleBasedFilter(userRole?: UserRole, userId?: string): Prisma.ProductionOrderWhereInput {
    switch (userRole) {
      case 'ASSEMBLER':
        return {
          OR: [
            { orderStatus: 'READY_FOR_PRODUCTION' },
            { currentAssigneeId: userId }
          ]
        };
      case 'QC_PERSON':
        return {
          orderStatus: {
            in: ['READY_FOR_PRE_QC', 'READY_FOR_FINAL_QC']
          }
        };
      case 'PROCUREMENT_SPECIALIST':
        return {
          orderStatus: {
            in: ['ORDER_CREATED', 'PARTS_SENT']
          }
        };
      case 'SERVICE_DEPARTMENT':
        return {}; // Service department has limited order access
      default:
        return {}; // Admin and Production Coordinator see all
    }
  }

  private canAccessOrder(order: any, userRole: UserRole): boolean {
    // Implement role-based order access logic
    switch (userRole) {
      case 'SERVICE_DEPARTMENT':
        return false; // Service department cannot access production orders
      default:
        return true;
    }
  }

  // Helper methods for creating related entities
  private async createBasinConfigurations(
    tx: Prisma.TransactionClient, 
    orderId: string, 
    basins: BasinConfigurationInput[]
  ) {
    for (const basin of basins) {
      await tx.basinConfiguration.create({
        data: {
          orderId,
          basinIndex: basin.basinIndex,
          basinType: basin.basinType,
          basinWidth: basin.basinSize.dimensions.width,
          basinLength: basin.basinSize.dimensions.length,
          basinDepth: basin.basinSize.dimensions.depth,
          isCustomSize: basin.basinSize.type === 'CUSTOM',
          hasPTrapDrain: basin.addons.includes('P_TRAP_DISINFECTION_DRAIN_UNIT'),
          hasBasinLight: basin.addons.includes('BASIN_LIGHT')
        }
      });
    }
  }

  // ... other helper methods
}

export const orderService = new OrderService();
```

## 7. Component Organization Patterns

### 7.1 Feature-Based Components

#### Order Creation Components Structure
```typescript
// src/components/orders/creation/order-wizard.tsx
interface OrderWizardProps {
  onComplete: (orderData: CreateOrderData) => Promise<void>;
  initialData?: Partial<CreateOrderData>;
}

export function OrderWizard({ onComplete, initialData = {} }: OrderWizardProps) {
  const {
    currentStep,
    currentStepInfo,
    data,
    errors,
    isSubmitting,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    updateData,
    submitForm,
  } = useFormWizard<CreateOrderData>({
    steps: ORDER_WIZARD_STEPS,
    initialData,
    onComplete,
    validation: ORDER_VALIDATION_SCHEMAS,
  });

  const StepComponent = useMemo(() => {
    return FormFactory.createOrderForm(currentStepInfo.key);
  }, [currentStepInfo.key]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Create Production Order</CardTitle>
          <ProgressIndicator 
            currentStep={currentStep + 1} 
            totalSteps={ORDER_WIZARD_STEPS.length} 
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <StepNavigation 
          steps={ORDER_WIZARD_STEPS}
          currentStep={currentStep}
          onStepClick={(step) => goToStep(step)}
          errors={errors}
        />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="mt-6"
          >
            <StepComponent
              data={data[currentStepInfo.key] || {}}
              onDataChange={(stepData) => updateData({ [currentStepInfo.key]: stepData })}
              error={errors[currentStepInfo.key]}
            />
          </motion.div>
        </AnimatePresence>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={isFirstStep || isSubmitting}
        >
          Previous
        </Button>
        
        {isLastStep ? (
          <Button
            onClick={submitForm}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Order'
            )}
          </Button>
        ) : (
          <Button
            onClick={nextStep}
            disabled={isSubmitting}
          >
            Next
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

### 7.2 Reusable UI Patterns

#### DataTable Component
```typescript
// src/components/shared/data-table.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  filtering?: FilteringState;
  onFilteringChange?: (filtering: FilteringState) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  onRowClick?: (row: T) => void;
  actions?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  filtering,
  onFilteringChange,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  actions,
  className,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange: onFilteringChange,
    onRowSelectionChange,
    state: {
      pagination,
      sorting,
      columnFilters: filtering,
      rowSelection,
    },
  });

  return (
    <div className={cn("space-y-4", className)}>
      {actions && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search..."
              value={(table.getColumn("search")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("search")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoadingSkeleton columnCount={columns.length} rowCount={5} />
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <DataTablePagination 
          table={table} 
          pagination={pagination}
          onPaginationChange={onPaginationChange}
        />
      )}
    </div>
  );
}
```

## 8. Testing Architecture

### 8.1 Testing File Organization
```
tests/
├── __mocks__/
│   ├── next-auth.ts
│   ├── prisma.ts
│   └── file-upload.ts
├── setup.ts
├── utils/
│   ├── test-helpers.ts
│   ├── mock-data.ts
│   └── render-helpers.tsx
├── unit/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── utils/
├── integration/
│   ├── api/
│   ├── database/
│   └── services/
└── e2e/
    ├── auth/
    ├── orders/
    ├── qc/
    └── assembly/
```

### 8.2 Component Testing Patterns

#### Component Test Example
```typescript
// tests/unit/components/orders/order-wizard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderWizard } from '@/components/orders/creation/order-wizard';
import { TestWrapper } from '@/tests/utils/render-helpers';
import { mockOrderData } from '@/tests/utils/mock-data';

describe('OrderWizard', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders first step correctly', () => {
    render(
      <TestWrapper>
        <OrderWizard onComplete={mockOnComplete} />
      </TestWrapper>
    );

    expect(screen.getByText('Customer & Order Information')).toBeInTheDocument();
    expect(screen.getByLabelText('PO Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Customer Name')).toBeInTheDocument();
  });

  it('validates required fields before proceeding', async () => {
    render(
      <TestWrapper>
        <OrderWizard onComplete={mockOnComplete} />
      </TestWrapper>
    );

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('PO Number is required')).toBeInTheDocument();
    });
  });

  it('progresses through all steps successfully', async () => {
    render(
      <TestWrapper>
        <OrderWizard onComplete={mockOnComplete} initialData={mockOrderData} />
      </TestWrapper>
    );

    // Step 1: Customer Info
    expect(screen.getByText('Customer & Order Information')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));

    // Step 2: Sink Selection
    await waitFor(() => {
      expect(screen.getByText('Sink Selection & Quantity')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Next'));

    // Step 3: Configuration
    await waitFor(() => {
      expect(screen.getByText('Sink Configuration')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Next'));

    // Step 4: Accessories
    await waitFor(() => {
      expect(screen.getByText('Add-on Accessories')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Next'));

    // Step 5: Review
    await waitFor(() => {
      expect(screen.getByText('Review and Submit')).toBeInTheDocument();
    });

    // Submit
    fireEvent.click(screen.getByText('Create Order'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
        customerInfo: expect.any(Object),
        sinkSelection: expect.any(Object),
      }));
    });
  });
});
```

---

*This code structure documentation provides a comprehensive blueprint for organizing and implementing the Torvan Medical CleanStation Production Workflow system. It emphasizes maintainability, scalability, and developer experience while following modern React and Next.js best practices.*