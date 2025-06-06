# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start both frontend (Next.js on :3005) and backend (Node.js on :3001) concurrently
- `npm run dev:frontend` - Start only Next.js frontend on port 3005
- `npm run dev:backend` - Start only Node.js backend on port 3001
- `npm run build` - Build Next.js application for production
- `npm run lint` - Run ESLint with Next.js configuration
- `npm test` - Run Jest unit tests

### Database Operations
- `npm run prisma:generate` - Generate Prisma client after schema changes
- `npm run prisma:migrate` - Create and apply database migrations
- `npm run prisma:seed` - **COMPREHENSIVE SEEDING** - Runs ALL seeding in sequence:
  1. Core data (parts, assemblies, users, categories)
  2. QC Templates (4 templates, 150+ checklist items)
  3. Enhanced features (work instructions, tools, inventory)
  4. Pegboard kit verification (138 kit combinations)

### Production
- `npm start` - Start both frontend and backend in production mode

## Architecture Overview

This is a **hybrid Next.js + Node.js application** for Torvan Medical CleanStation workflow management with a unique dual-backend architecture:

### Backend Architecture
1. **Plain Node.js Server** (`src/server.js` on port 3001)
   - Handles legacy API routes and core business logic
   - No Express.js - uses native Node.js HTTP server
   - Custom routing system in `src/lib/router.js`
   - Serves: configurator, BOM generation, accessories, parts/assemblies data
   - Note: Many routes are deprecated in favor of Next.js API routes

2. **Next.js API Routes** (`app/api/**` on port 3005)
   - Handles modern features: authentication, orders, QC system, file uploads
   - Uses Next.js 15 App Router
   - Integrated with Prisma for database operations
   - Preferred for new feature development

### Frontend
- **Next.js 15** with App Router (`app/` directory)
- **ShadCN UI** components in `components/ui/`
- **Tailwind CSS** for styling
- **Zustand** for order creation state (`stores/orderCreateStore.ts`)
- **React Hook Form** with Zod validation
- **NextAuth.js** for authentication and session management

### Database
- **PostgreSQL** with **Prisma ORM**
- Schema: `prisma/schema.prisma` (9 migrations applied)
- Current data: **284 parts**, **318 assemblies** (including 138 pegboard kits), **6 users**
- Main models: User, Order, Part, Assembly, QcFormTemplate, OrderQcResult, ServiceOrder
- Enhanced features: WorkInstruction, Task, InventoryItem, SystemNotification, AuditLog

## Authentication System

Uses **NextAuth.js** with credentials provider:

```typescript
// Client-side session access
import { useSession } from 'next-auth/react';
const { data: session, status } = useSession();

// Server-side auth utility  
import { getAuthUser } from '@/lib/auth';
const user = await getAuthUser(); // No request parameter needed
```

**Key Files:**
- `app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `lib/authOptions.ts` - Centralized auth options
- `lib/auth.ts` - Server-side auth utilities
- `components/Providers.tsx` - SessionProvider wrapper

## API Client Pattern

The application uses two different API clients based on the target backend:

```typescript
// For Node.js backend (port 3001) - legacy routes
import { plainNodeApiClient } from '@/lib/api';

// For Next.js API routes (port 3005) - preferred for new features
import { nextJsApiClient } from '@/lib/api';
```

## Key Business Logic Locations

### Product Configuration
- **Service**: `src/services/configuratorService.js` - Dynamic sink configuration logic
- **Service**: `src/services/accessoriesService.js` - Accessories catalog management
- **Legacy**: `sink-config.js`, `accessories.js` - Original configurator logic

### Order Management
- **Store**: `stores/orderCreateStore.ts` - Order creation state (Zustand + Immer)
- **Components**: `components/order/` - Order wizard components
- **API**: `app/api/orders/` - Order CRUD operations

### BOM Generation
- **Service**: `src/services/bomService.js` - Bill of Materials generation logic with sink length validation (min 48")
- **API**: `app/api/orders/[orderId]/bom/` - BOM export functionality
- **Preview API**: `app/api/orders/preview-bom/` - BOM preview before order submission
- **Components**: `components/order/BOMViewer.tsx` - Unified BOM display with quantity aggregation
- **Debug Helper**: `components/debug/BOMDebugHelper.tsx` - Real-time BOM preview during configuration
- **Legacy**: `bom-generator.js` - Original BOM logic

### Quality Control System
- **Models**: QcFormTemplate, OrderQcResult in Prisma schema
- **API**: `app/api/orders/[orderId]/qc/` - QC form management
- **Components**: `components/qc/` - QC form interfaces
- **Admin API**: `app/api/admin/qc-templates/` - Template management

### Service Orders
- **Models**: ServiceOrder, ServiceOrderItem in Prisma schema
- **API**: `app/api/service-orders/` - Service order management
- **Components**: `components/service/` - Service order interfaces
- **Parts API**: `app/api/service-parts/` - Service parts catalog

### Assembly & Task Management
- **Models**: WorkInstruction, Task, TaskDependency in Prisma schema
- **API**: `app/api/v1/assembly/` - Assembly task management
- **Components**: `components/assembly/` - Task management, work instructions, tool requirements
- **Features**: Task dependencies, time tracking, tool requirements, work instruction steps

## Database Setup

1. Ensure PostgreSQL is running
2. Create database: `createdb torvan-db`
3. Copy environment file: `cp .env.local.example .env.local`
4. Configure `DATABASE_URL` in `.env.local`
5. Run migrations: `npm run prisma:migrate`
6. Generate client: `npm run prisma:generate`
7. Seed data: `npm run prisma:seed`

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js signing secret
- `NEXTAUTH_URL` - NextAuth.js base URL (http://localhost:3005 for development)

Optional:
- `NODE_ENV` - Environment (development/production)
- `PORT` - Backend server port (default: 3001)
- `CORS_ORIGINS` - Allowed CORS origins
- `UPLOADS_DIR` - File upload directory
- `NEXT_PUBLIC_API_URL` - Frontend API URL
- `JWT_SECRET` - Legacy JWT secret (still used by Node.js backend)

## Role-Based Access

System roles with hierarchical permissions:
- `ADMIN` - Full system access
- `PRODUCTION_COORDINATOR` - Order and production management
- `PROCUREMENT_SPECIALIST` - Parts and procurement
- `QC_PERSON` - Quality control operations
- `ASSEMBLER` - Production and assembly
- `SERVICE_DEPARTMENT` - Service and maintenance

## Development Patterns

### Adding New Features
1. **Prefer Next.js API routes** over Node.js backend for new endpoints
2. Use TypeScript for all new code
3. Follow existing patterns in similar files
4. Include proper error handling and validation

### Database Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run prisma:migrate` (creates migration)
3. Run `npm run prisma:generate` (updates client)
4. Update seed script if needed

### Component Development
- Use ShadCN UI components from `components/ui/`
- Follow React Hook Form patterns for forms
- Use Zod schemas for validation (see `lib/qcValidationSchemas.ts`)
- Implement proper TypeScript types
- Always add unique `key` props for mapped React elements

### State Management
- Use Zustand stores with Immer for complex state (see `stores/orderCreateStore.ts`)
- Use NextAuth session for authentication state
- Keep API calls in components or custom hooks
- Use optimistic updates where appropriate

### Authentication Patterns
- Use `useSession()` hook for client-side auth checks
- Use `getAuthUser()` utility for server-side API routes
- Wrap apps with `<SessionProvider>` in layout
- Implement route protection with session status checks

## Important Implementation Notes

### Configurator Assembly IDs
The configurator service uses specific assembly IDs that must match the database:
- **Legs**: `T2-DL27-KIT`, `T2-DL14-KIT`, `T2-LC1-KIT`, `T2-DL27-FH-KIT`, `T2-DL14-FH-KIT`
- **Feet**: `T2-LEVELING-CASTOR-475`, `T2-SEISMIC-FEET`

If legs/feet don't appear in configurator, verify these assembly IDs exist in database.

### Pegboard Kit System (138 Combinations)
The system includes 138 pegboard kit combinations following the pattern:
- **Pattern**: `T2-ADW-PB-{size}-{color}-{type}-KIT`
- **Sizes**: 8 options (3436, 4836, 6036, 7236, 8436, 9636, 10836, 12036)
- **Colors**: 8 options (GREEN, BLACK, YELLOW, GREY, RED, BLUE, ORANGE, WHITE)
- **Types**: 2 options (PERF, SOLID)
- **Total**: 8 × 8 × 2 = 128 combinations + 10 existing accessories

### Sink Length Validation
- **Minimum length**: 48 inches (enforced in both frontend and backend)
- **Frontend**: Real-time validation in `components/order/ConfigurationStep.tsx`
- **Backend**: Validation in `src/services/bomService.js` with clear error messages
- **Sink body assembly ranges**: 48-60", 61-72", 73-120"

### BOM Preview Integration
The BOM preview in ReviewStep uses the same `generateBOMForOrder` service as actual order creation, ensuring accuracy. Preview endpoint: `POST /api/orders/preview-bom`

### BOM Quantity Aggregation
The BOMViewer component automatically aggregates duplicate items (e.g., P-trap components appearing in multiple basins) and displays combined quantities with source context.

### Environment Loading
Node.js backend loads environment files in precedence order:
1. `.env.local` (highest priority)
2. `.env.development` 
3. `.env` (lowest priority)

### Testing & Quality Assurance
- **Unit Tests**: Jest with React Testing Library (`__tests__/` directories)
- **Integration Tests**: API and database integration tests
- **E2E Tests**: Playwright tests in `e2e/` directory
- **QC Templates**: 4 comprehensive QC templates with 150+ checklist items
- **Test Commands**: `npm test`, `npm run test:e2e`, `npm run test:coverage`

### Rate Limiting & Security
- **Middleware**: `middleware.ts` with differentiated rate limits
- **API Protection**: 200 requests/min general, 1000/min auth endpoints, 20/min BOM preview
- **Authentication**: NextAuth.js with secure session management
- **Role-based access**: 6 user roles with hierarchical permissions

### Data Management
- **Seeding**: Comprehensive seeding with verification (284 parts, 318 assemblies, 138 pegboard kits)
- **Migrations**: 9 database migrations tracking schema evolution
- **Inventory**: Full inventory management with transactions and audit logging
- **File Uploads**: Secure file upload system with metadata tracking

### Legacy Code Notes
Several files contain legacy frontend logic preserved for reference:
- `app.js` - Original vanilla JS configurator
- `sink-config.js` - Sink configuration logic
- `accessories.js` - Accessories management
- `bom-generator.js` - BOM generation
- `index.html`, `styles.css` - Legacy UI

<!-- Revision updated: Major codebase update with pegboard kits, validation, and comprehensive features on 2025-01-06 -->