# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Torvan Medical CleanStation Production Workflow Application** - A comprehensive medical device manufacturing workflow management system for CleanStation reprocessing sinks. This Next.js application digitizes the entire production process from order creation to shipping, including BOM generation, assembly tasks, quality control, and service department operations.

## Build & Development Commands

- `npm run dev`: Start development server on port 3005
- `npm run build`: Build Next.js application for production
- `npm run start`: Start production server on port 3005
- `npm run lint`: Run ESLint checks
- `npm run test`: Run Jest unit tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Generate test coverage report
- `npm run test:unit`: Run unit tests only (components, stores, lib)
- `npm run test:integration`: Run API integration tests
- `npm run test:e2e`: Run Playwright end-to-end tests
- `npm run test:e2e:ui`: Run E2E tests with UI
- `npm run test:all`: Run all test suites

## Database Commands

- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:migrate`: Run database migrations
- `npm run prisma:seed`: Run basic database seeding
- `npm run prisma:seed:all`: Run comprehensive database seeding
- `npm run db:reset`: Reset database and run full seeding

## Architecture Overview

This is a **Next.js 15** application with a **hybrid architecture**:

### Frontend Layer
- **Next.js App Router** with TypeScript
- **ShadCN UI** components with Tailwind CSS
- **Zustand + Immer** for state management
- **NextAuth.js** for authentication with role-based access
- **React Hook Form + Zod** for form validation

### API Layer
- **Next.js API Routes** (primary)
- **Legacy Node.js server** (being phased out, port 3001)
- **Prisma ORM** for database operations
- **Role-based middleware** (`getAuthUser()`)

### Database
- **PostgreSQL** with complex schema (35+ models, 961 lines)
- **9 database migrations** with comprehensive seeding
- **Medical device manufacturing domain models**

## Key Domain Models

The application manages medical device manufacturing with these core entities:
- **Orders**: Production orders with customer info and configurations
- **Parts & Assemblies**: Hierarchical BOM structure
- **QC Templates & Tasks**: Quality control workflows
- **Users**: Role-based access (Admin, Production Coordinator, QC Person, Assembler, Procurement Specialist, Service Department)
- **Work Instructions**: Assembly guidance and task management
- **Service Orders**: Separate module for service department parts ordering

## Role-Based User Types

1. **Production Coordinator**: Creates orders, manages workflow
2. **Admin**: Full system access and user management
3. **QC Person**: Quality control tasks and approvals
4. **Assembler**: Assembly tasks and work instructions
5. **Procurement Specialist**: Parts sourcing and outsourcing
6. **Service Department**: Service parts ordering

## Important File Locations

- **API Routes**: `app/api/` (Next.js) and `src/api/` (legacy Node.js)
- **Components**: `components/` organized by domain (order, qc, assembly, etc.)
- **Database Schema**: `prisma/schema.prisma`
- **Authentication**: `lib/auth.ts` and `lib/authOptions.ts`
- **Business Logic**: `lib/` services (BOM, configurator, notifications)
- **State Management**: `stores/` (Zustand stores)
- **Seeding Scripts**: `scripts/` (comprehensive database setup)

## Testing Strategy

- **Unit Tests**: Jest + React Testing Library for components and utilities
- **Integration Tests**: API endpoint testing with Next.js test helpers
- **E2E Tests**: Playwright for complete workflow testing
- **Coverage**: Comprehensive coverage tracking for core business logic

## Development Workflow

1. **Database First**: Always run migrations and seeding after pulling changes
2. **Environment Setup**: Copy `.env.template` to `.env.local` and configure PostgreSQL
3. **Type Safety**: TypeScript strict mode - all new code must be typed
4. **Testing**: Run relevant tests before committing changes
5. **Code Style**: Follow existing patterns, use ShadCN components, maintain domain separation

## Key Integration Points

- **BOM Generation**: Complex hierarchical assembly logic in `lib/bomService.ts`
- **Order Workflow**: Multi-step wizard with state management
- **QC Integration**: Template-based quality control with photo uploads
- **File Management**: Document uploads for work instructions and QC
- **Notifications**: Email service integration for workflow updates

## Production Considerations

- **Port Configuration**: Frontend runs on 3005, legacy backend on 3001
- **Database**: PostgreSQL with proper connection pooling
- **File Storage**: Local filesystem for development, cloud storage for production
- **Security**: NextAuth sessions, role-based route protection, CSRF protection
- **Compliance**: ISO 13485:2016 medical device manufacturing standards

## Common Development Tasks

- **Adding New API Endpoints**: Use Next.js API routes in `app/api/`
- **Database Changes**: Create migrations with `npx prisma migrate dev`
- **New Components**: Follow ShadCN patterns, add to appropriate domain folder
- **User Role Changes**: Update auth middleware and role checks
- **QC Template Updates**: Modify `components/qc/` and related API routes