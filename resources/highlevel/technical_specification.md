# Technical Specification Document
## Torvan Medical CleanStation Production Workflow Digitalization

**Version:** 1.0  
**Date:** June 2, 2025  
**Document Type:** Technical Specification  

---

## 1. System Overview

### 1.1 Architecture Pattern
- **Pattern:** Microservices-oriented monolith with modular structure
- **Frontend:** Next.js 14+ with App Router
- **Backend:** Next.js API Routes with serverless functions
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js with role-based access control

### 1.2 Technology Stack

#### Frontend Technologies
- **Framework:** Next.js 14+ (React 18)
- **UI Library:** ShadCN UI components
- **Styling:** Tailwind CSS 3.4+
- **Animations:** Framer Motion 10+
- **State Management:** Zustand with Immer
- **Form Handling:** React Hook Form with Zod validation
- **Icons:** Lucide React
- **File Upload:** Next.js native file upload with cloud storage

#### Backend Technologies
- **Runtime:** Node.js 18+
- **Database:** PostgreSQL 15+
- **ORM:** Prisma 5+
- **Authentication:** NextAuth.js v4
- **File Storage:** AWS S3 or Vercel Blob
- **PDF Generation:** Puppeteer or React-PDF
- **Email:** Nodemailer or SendGrid

#### DevOps & Deployment
- **Hosting:** Vercel (recommended) or AWS
- **Database Hosting:** Vercel Postgres or AWS RDS
- **CI/CD:** GitHub Actions
- **Monitoring:** Vercel Analytics + Sentry
- **Environment Management:** Vercel Environment Variables

## 2. System Architecture

### 2.1 Application Structure
```
torvan-cleanstation/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/             # Authentication layouts
│   │   ├── dashboard/          # Main application
│   │   ├── api/                # API routes
│   │   └── globals.css         # Global styles
│   ├── components/             # Reusable components
│   │   ├── ui/                 # ShadCN components
│   │   ├── forms/              # Form components
│   │   ├── dashboards/         # Role-specific dashboards
│   │   └── shared/             # Shared components
│   ├── lib/                    # Utilities and configurations
│   │   ├── auth.ts             # Authentication config
│   │   ├── db.ts               # Database connection
│   │   ├── validations/        # Zod schemas
│   │   └── utils/              # Helper functions
│   ├── store/                  # Zustand stores
│   ├── types/                  # TypeScript type definitions
│   └── hooks/                  # Custom React hooks
├── prisma/                     # Database schema and migrations
├── public/                     # Static assets
└── docs/                       # Documentation
```

### 2.2 Data Flow Architecture

#### Request Flow
1. **Client Request** → Next.js Route Handler
2. **Authentication** → NextAuth.js middleware
3. **Authorization** → Role-based access control
4. **Data Processing** → Business logic layer
5. **Database** → Prisma ORM → PostgreSQL
6. **Response** → JSON API response

#### State Management Flow
1. **Server State** → React Query for API calls
2. **Client State** → Zustand stores for UI state
3. **Form State** → React Hook Form for form management
4. **Persistent State** → Local storage for user preferences

## 3. Core Modules Specification

### 3.1 Authentication & Authorization Module

#### Features
- Role-based authentication (6 user roles)
- Session management with JWT
- Protected routes with middleware
- Role-specific redirects

#### Implementation
```typescript
// User roles enum
enum UserRole {
  PRODUCTION_COORDINATOR = 'PRODUCTION_COORDINATOR',
  ADMIN = 'ADMIN',
  PROCUREMENT_SPECIALIST = 'PROCUREMENT_SPECIALIST',
  QC_PERSON = 'QC_PERSON',
  ASSEMBLER = 'ASSEMBLER',
  SERVICE_DEPARTMENT = 'SERVICE_DEPARTMENT'
}

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: ['*'], // Full access
  [UserRole.PRODUCTION_COORDINATOR]: ['orders:create', 'orders:read', 'orders:update_status'],
  // ... other role permissions
}
```

### 3.2 Order Management Module

#### Core Features
- 5-step order creation wizard
- MDRD sink configuration
- BOM auto-generation
- Order status tracking
- Document management

#### Key Components
- `OrderWizard` - Multi-step form component
- `SinkConfigurator` - Dynamic configuration builder
- `BOMGenerator` - Business logic for BOM creation
- `StatusTracker` - Order lifecycle management

### 3.3 BOM Generation Engine

#### Algorithm Overview
```typescript
interface BOMGenerationRule {
  condition: (config: SinkConfig) => boolean;
  parts: string[];
  assemblies: string[];
  quantity?: number;
}

class BOMGenerator {
  generateBOM(config: SinkConfig): BOMItem[] {
    // 1. Apply base configuration rules
    // 2. Add basin-specific components
    // 3. Include accessory parts
    // 4. Generate custom part numbers
    // 5. Calculate quantities
    // 6. Build hierarchical structure
  }
}
```

### 3.4 Quality Control Module

#### Digital Checklist System
- Template-based QC forms
- Dynamic form generation
- Digital signatures
- Compliance tracking

#### Implementation Strategy
```typescript
interface QCChecklistTemplate {
  id: string;
  name: string;
  type: 'PRE_QC' | 'FINAL_QC' | 'IN_PROCESS';
  sections: QCSection[];
}

interface QCSection {
  name: string;
  items: QCChecklistItem[];
}

interface QCChecklistItem {
  id: string;
  description: string;
  type: 'BOOLEAN' | 'TEXT' | 'MEASUREMENT' | 'N_A_OPTION';
  required: boolean;
  basinSpecific: boolean;
}
```

### 3.5 Assembly Guidance Module

#### Task Management System
- Dynamic task list generation
- Work instruction integration
- Progress tracking
- Tool and parts integration

#### Components
- `TaskList` - Sequential task display
- `WorkInstruction` - Detailed instruction viewer
- `ProgressTracker` - Completion status
- `ResourcePanel` - Parts and tools display

## 4. Database Design Principles

### 4.1 Schema Design
- **Normalization:** 3NF with selective denormalization for performance
- **Relationships:** Foreign keys with proper indexing
- **Constraints:** Data integrity through database constraints
- **Audit Trail:** Timestamp and user tracking for all modifications

### 4.2 Performance Considerations
- **Indexing Strategy:** Composite indexes on frequently queried columns
- **Query Optimization:** Prisma query optimization with `include` and `select`
- **Connection Pooling:** Prisma connection pooling for scalability
- **Caching:** Redis caching for frequently accessed data

### 4.3 Data Validation
- **Schema Level:** Database constraints and triggers
- **Application Level:** Zod validation schemas
- **API Level:** Request/response validation middleware

## 5. API Design Principles

### 5.1 RESTful Design
- **Resource-Based URLs:** `/api/orders`, `/api/parts`, `/api/assemblies`
- **HTTP Methods:** Proper use of GET, POST, PUT, DELETE
- **Status Codes:** Consistent HTTP status code usage
- **Response Format:** Standardized JSON response structure

### 5.2 Error Handling
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    pagination?: PaginationInfo;
    timestamp: string;
  };
}
```

### 5.3 Security Measures
- **Authentication:** JWT token validation on all protected routes
- **Authorization:** Role-based access control middleware
- **Input Validation:** Zod schema validation for all inputs
- **Rate Limiting:** API rate limiting to prevent abuse
- **CORS:** Proper CORS configuration

## 6. UI/UX Technical Implementation

### 6.1 Design System
- **Component Library:** ShadCN UI with custom theme
- **Design Tokens:** Tailwind CSS configuration
- **Typography:** Consistent font scales and weights
- **Color Palette:** Professional color scheme with accessibility compliance

### 6.2 Responsive Design
- **Breakpoints:** Mobile-first responsive design
- **Grid System:** CSS Grid and Flexbox layouts
- **Component Adaptation:** Responsive component variants

### 6.3 Animation Framework
```typescript
// Framer Motion variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};
```

## 7. Performance Requirements

### 7.1 Frontend Performance
- **Initial Load:** < 3 seconds for first contentful paint
- **Route Transitions:** < 500ms for client-side navigation
- **Form Interactions:** < 100ms response time
- **Bundle Size:** < 1MB initial JavaScript bundle

### 7.2 Backend Performance
- **API Response Time:** < 500ms for standard requests
- **Database Queries:** < 100ms for indexed queries
- **File Upload:** Support for files up to 10MB
- **Concurrent Users:** Support for 100+ concurrent users

### 7.3 Optimization Strategies
- **Code Splitting:** Dynamic imports for route-based splitting
- **Image Optimization:** Next.js Image component with WebP format
- **Caching:** Browser caching and CDN implementation
- **Database Optimization:** Query optimization and indexing

## 8. Security Requirements

### 8.1 Authentication Security
- **Password Policy:** Minimum 8 characters with complexity requirements
- **Session Management:** Secure JWT tokens with expiration
- **Multi-Factor Authentication:** Optional 2FA implementation
- **Account Lockout:** Brute force protection

### 8.2 Data Security
- **Encryption:** Data encryption at rest and in transit
- **Input Validation:** Comprehensive input sanitization
- **SQL Injection Prevention:** Parameterized queries through Prisma
- **XSS Protection:** Content Security Policy implementation

### 8.3 Access Control
- **Role-Based Permissions:** Granular permission system
- **Route Protection:** Server-side route authorization
- **API Security:** Token-based API authentication
- **Audit Logging:** Comprehensive action logging

## 9. Scalability Considerations

### 9.1 Horizontal Scaling
- **Stateless Design:** Stateless API design for horizontal scaling
- **Database Scaling:** Read replicas and connection pooling
- **CDN Integration:** Static asset delivery through CDN
- **Load Balancing:** Application load balancing capability

### 9.2 Vertical Scaling
- **Resource Optimization:** Efficient memory and CPU usage
- **Database Optimization:** Query performance and indexing
- **Caching Strategy:** Multi-level caching implementation
- **Background Jobs:** Async processing for heavy operations

## 10. Integration Points

### 10.1 File Management
- **Upload Handling:** Secure file upload with validation
- **Storage:** Cloud storage integration (AWS S3/Vercel Blob)
- **Document Processing:** PDF generation and processing
- **Image Handling:** Image optimization and thumbnails

### 10.2 Export Capabilities
- **PDF Export:** Order summaries and BOM exports
- **CSV Export:** Data export for external systems
- **QR Code Generation:** Dynamic QR code creation
- **Print Formatting:** Print-optimized layouts

### 10.3 External Integrations
- **Email Notifications:** Automated email system
- **Audit Compliance:** ISO 13485:2016 compliance features
- **Backup Systems:** Automated data backup
- **Monitoring:** Application performance monitoring

## 11. Development Standards

### 11.1 Code Quality
- **TypeScript:** Strict type checking enabled
- **ESLint:** Code linting with custom rules
- **Prettier:** Consistent code formatting
- **Testing:** Unit and integration test coverage

### 11.2 Documentation
- **API Documentation:** OpenAPI/Swagger documentation
- **Component Documentation:** Storybook component library
- **Code Comments:** Comprehensive inline documentation
- **README Files:** Module-specific documentation

### 11.3 Version Control
- **Git Flow:** Feature branch workflow
- **Commit Standards:** Conventional commit messages
- **Code Review:** Mandatory peer review process
- **Release Management:** Semantic versioning

---

*This technical specification serves as the blueprint for implementing the Torvan Medical CleanStation Production Workflow Digitalization system. All implementation decisions should align with these specifications while maintaining flexibility for iterative improvements.*