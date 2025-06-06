# Torvan Medical CleanStation Implementation Roadmap

**Document Version:** 1.0  
**Date:** 2025-01-05  
**Status:** Active Development Plan  
**Target Completion:** 6-8 weeks from start date

---

## Executive Summary

This roadmap addresses the critical gaps identified in the assessment document (`ASSESSMENT_HIGHLEVEL_VS_IMPLEMENTATION.md`) and provides a structured approach to achieving production readiness for the Torvan Medical CleanStation workflow system.

**Current Implementation Status: 72% Complete**
**Target: Production-ready system with 95%+ feature completion**

### Critical Implementation Areas
1. **API Standardization & Missing Endpoints** (Priority: P0)
2. **Complete Core Workflows** (Priority: P0) 
3. **Comprehensive Testing Implementation** (Priority: P0)
4. **Security & Performance Optimization** (Priority: P1)
5. **Deployment Infrastructure** (Priority: P1)

---

## Phase-Based Implementation Plan

### Phase 1: API Standardization & Foundation (Weeks 1-2)
**Priority Level: P0 - Critical**  
**Estimated Effort: 10 days**

#### 1.1 API Response Standardization
**Effort: 3 days**

```typescript
// Implement standardized response format
interface StandardAPIResponse<T = any> {
  success: boolean
  data: T | null
  error: {
    code: string
    message: string
    details?: any
  } | null
  metadata: {
    timestamp: string
    version: string
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}
```

**Implementation Tasks:**
- [ ] Create `lib/apiResponse.ts` utility for standardized responses
- [ ] Update all existing API routes to use standard format
- [ ] Implement proper error codes and messages
- [ ] Add request/response logging middleware
- [ ] Update frontend API clients to handle new format

**Files to Modify:**
- `lib/api.ts` - Update API clients
- `app/api/**/*.ts` - All API route handlers
- `src/api/**/*.js` - Legacy Node.js handlers (deprecation plan)

#### 1.2 Missing API Endpoints Implementation
**Effort: 4 days**

**Critical Missing Endpoints:**
```typescript
// Inventory Management
GET    /api/v1/inventory/parts
GET    /api/v1/inventory/assemblies
POST   /api/v1/inventory/parts
PUT    /api/v1/inventory/parts/:id
DELETE /api/v1/inventory/parts/:id

// Assembly & Task Management
GET    /api/v1/assembly/tasks
POST   /api/v1/assembly/tasks
PUT    /api/v1/assembly/tasks/:id/status
GET    /api/v1/assembly/work-instructions/:id

// File Management
POST   /api/v1/files/upload
GET    /api/v1/files/:id/download
DELETE /api/v1/files/:id
GET    /api/v1/files/metadata/:id

// Enhanced Service Department
GET    /api/v1/service/parts/browse
POST   /api/v1/service/orders/:id/approve
GET    /api/v1/service/orders/:id/status

// System Administration
GET    /api/v1/admin/users
POST   /api/v1/admin/users
PUT    /api/v1/admin/users/:id/role
GET    /api/v1/admin/system/health
```

**Implementation Priority:**
1. Assembly & Task Management (P0)
2. Enhanced Service Department (P0)
3. File Management improvements (P1)
4. Inventory Management (P1)
5. System Administration (P1)

#### 1.3 API Versioning Strategy
**Effort: 1 day**

- [ ] Implement `/api/v1/` prefix for all new endpoints
- [ ] Create deprecation plan for legacy Node.js routes
- [ ] Add version headers and documentation
- [ ] Update CORS configuration for versioned endpoints

#### 1.4 Error Handling & Validation Enhancement
**Effort: 2 days**

- [ ] Implement comprehensive input validation using Zod
- [ ] Add proper error logging and monitoring
- [ ] Create error code documentation
- [ ] Implement rate limiting middleware

### Phase 2: Complete Core Workflows (Weeks 2-4)
**Priority Level: P0 - Critical**  
**Estimated Effort: 12 days**

#### 2.1 Assembly Task Management System
**Effort: 5 days**

**Current Status: 0% complete - Critical Gap**

**Database Schema Extensions:**
```prisma
model WorkInstruction {
  id          String @id @default(cuid())
  title       String
  description String?
  steps       WorkInstructionStep[]
  assemblyId  String?
  assembly    Assembly? @relation(fields: [assemblyId], references: [id])
  version     String @default("1.0")
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model WorkInstructionStep {
  id                String @id @default(cuid())
  workInstructionId String
  workInstruction   WorkInstruction @relation(fields: [workInstructionId], references: [id])
  stepNumber        Int
  title             String
  description       String
  estimatedMinutes  Int?
  requiredTools     Tool[]
  images            String[] // File paths
  videos            String[] // File paths
  checkpoints       String[] // Validation points
}

model Task {
  id                String @id @default(cuid())
  orderId           String
  order             Order @relation(fields: [orderId], references: [id])
  workInstructionId String?
  workInstruction   WorkInstruction? @relation(fields: [workInstructionId], references: [id])
  title             String
  description       String?
  status            TaskStatus @default(PENDING)
  priority          TaskPriority @default(MEDIUM)
  assignedToId      String?
  assignedTo        User? @relation("TaskAssignee", fields: [assignedToId], references: [id])
  estimatedMinutes  Int?
  actualMinutes     Int?
  startedAt         DateTime?
  completedAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  dependencies      TaskDependency[] @relation("TaskDependencies")
  dependents        TaskDependency[] @relation("DependentTasks")
  tools             TaskTool[]
  notes             TaskNote[]
}

model TaskDependency {
  id           String @id @default(cuid())
  taskId       String
  task         Task @relation("TaskDependencies", fields: [taskId], references: [id])
  dependsOnId  String
  dependsOn    Task @relation("DependentTasks", fields: [dependsOnId], references: [id])
  createdAt    DateTime @default(now())
  @@unique([taskId, dependsOnId])
}

model Tool {
  id          String @id @default(cuid())
  name        String
  description String?
  category    String
  isActive    Boolean @default(true)
  tasks       TaskTool[]
}

model TaskTool {
  id     String @id @default(cuid())
  taskId String
  task   Task @relation(fields: [taskId], references: [id])
  toolId String
  tool   Tool @relation(fields: [toolId], references: [id])
  @@unique([taskId, toolId])
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  BLOCKED
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

**Components to Implement:**
- [ ] `components/assembly/TaskManagement.tsx` - Main task dashboard
- [ ] `components/assembly/WorkInstructionViewer.tsx` - Step-by-step instructions
- [ ] `components/assembly/TaskTimer.tsx` - Time tracking component
- [ ] `components/assembly/TaskDependencyGraph.tsx` - Visual task dependencies
- [ ] `components/assembly/ToolRequirements.tsx` - Required tools display

**API Endpoints:**
- [ ] Task CRUD operations
- [ ] Task status updates with validation
- [ ] Work instruction management
- [ ] Task assignment and scheduling
- [ ] Time tracking and reporting

#### 2.2 Service Department Enhancement
**Effort: 3 days**

**Current Status: 33% complete**

**Components to Enhance:**
- [ ] `components/service/ServicePartsBrowser.tsx` - Enhanced filtering and search
- [ ] `components/service/ServiceOrderApproval.tsx` - Approval workflow
- [ ] `components/service/ServiceOrderTracking.tsx` - Status tracking
- [ ] `components/service/ServiceMetrics.tsx` - Department analytics

**Missing Features:**
- [ ] Service parts inventory integration
- [ ] Approval workflow with notifications
- [ ] Service order priority management
- [ ] Integration with procurement workflow

#### 2.3 Admin Functions Completion
**Effort: 2 days**

**Current Status: 33% complete**

**Components to Implement:**
- [ ] `components/admin/UserManagement.tsx` - User CRUD operations
- [ ] `components/admin/SystemConfiguration.tsx` - System settings
- [ ] `components/admin/DataImportExport.tsx` - Bulk operations
- [ ] `components/admin/AuditLog.tsx` - System audit trail

#### 2.4 Notification System Implementation  
**Effort: 2 days**

**Current Status: 0% complete - Critical Missing Feature**

**Database Schema:**
```prisma
model SystemNotification {
  id        String @id @default(cuid())
  userId    String?
  user      User? @relation(fields: [userId], references: [id])
  type      NotificationType
  title     String
  message   String
  data      Json? // Additional context data
  isRead    Boolean @default(false)
  priority  NotificationPriority @default(NORMAL)
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum NotificationType {
  ORDER_STATUS_CHANGE
  TASK_ASSIGNMENT
  QC_APPROVAL_REQUIRED
  ASSEMBLY_MILESTONE
  SERVICE_REQUEST
  SYSTEM_ALERT
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

**Components:**
- [ ] `components/notifications/NotificationCenter.tsx`
- [ ] `components/notifications/NotificationSettings.tsx`
- [ ] Real-time notification system using WebSockets or Server-Sent Events

### Phase 3: Comprehensive Testing Implementation (Weeks 3-5)
**Priority Level: P0 - Critical for Production**  
**Estimated Effort: 10 days**

#### 3.1 Unit Testing Suite
**Effort: 4 days**
**Target Coverage: 80%+**

**Priority Test Areas:**
```typescript
// BOM Generation - Critical Business Logic
__tests__/
├── services/
│   ├── bomService.test.ts           // ✓ BOM generation logic
│   ├── configuratorService.test.ts  // ✓ Sink configuration
│   └── accessoriesService.test.ts   // ✓ Accessories management
├── components/
│   ├── order/
│   │   ├── OrderWizard.test.tsx     // ✓ Multi-step form
│   │   ├── BOMDisplay.test.tsx      // ✓ BOM rendering
│   │   └── ConfigurationStep.test.tsx
│   └── qc/
│       └── QCFormInterface.test.tsx // ✓ QC validation
└── lib/
    ├── auth.test.ts                 // ✓ Authentication utilities
    └── api.test.ts                  // ✓ API client functions
```

**Testing Strategy:**
- [ ] Mock external dependencies (database, APIs)
- [ ] Test critical business logic (BOM generation, pricing)
- [ ] Validate form submissions and data transformations
- [ ] Test error handling and edge cases

#### 3.2 Integration Testing
**Effort: 3 days**

**Critical Integration Points:**
- [ ] Order creation → BOM generation flow
- [ ] QC form submission → Order status updates
- [ ] User authentication → Role-based access
- [ ] File upload → Storage and retrieval
- [ ] Database migrations and schema validation

#### 3.3 End-to-End Testing Enhancement
**Effort: 2 days**

**Current E2E Tests to Enhance:**
- [ ] `e2e/order-creation.spec.ts` - Complete order workflow
- [ ] `e2e/role-based-access.spec.ts` - All user roles
- [ ] `e2e/bom-preview.spec.ts` - BOM generation scenarios
- [ ] **New:** `e2e/assembly-workflow.spec.ts` - Task management
- [ ] **New:** `e2e/service-department.spec.ts` - Service orders
- [ ] **New:** `e2e/admin-functions.spec.ts` - Admin operations

#### 3.4 Performance Testing
**Effort: 1 day**

**Performance Benchmarks:**
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] BOM generation < 2 seconds for complex configurations
- [ ] File upload handling for large files (>10MB)
- [ ] Concurrent user load testing (50+ users)

### Phase 4: Security & Performance Optimization (Weeks 5-6)
**Priority Level: P1 - Production Requirements**  
**Estimated Effort: 8 days**

#### 4.1 Security Hardening
**Effort: 4 days**

**Security Implementation Checklist:**
- [ ] **Security Headers** - Implement comprehensive headers
  ```typescript
  // middleware.ts enhancements
  const securityHeaders = {
    'X-DNS-Prefetch-Control': 'off',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  }
  ```

- [ ] **Input Validation** - Comprehensive Zod schemas
  ```typescript
  // lib/validationSchemas.ts
  export const orderValidation = z.object({
    customerInfo: customerInfoSchema,
    sinkSelection: sinkSelectionSchema,
    configurations: z.record(configurationSchema),
    accessories: z.record(z.array(accessorySchema))
  })
  ```

- [ ] **Rate Limiting** - API protection
  ```typescript
  // lib/rateLimiting.ts
  const rateLimiter = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false
  }
  ```

- [ ] **Authentication Security**
  - Session timeout management
  - Failed login attempt tracking
  - Password complexity requirements
  - CSRF protection

- [ ] **Data Protection**
  - Sensitive data encryption at rest
  - Secure file upload validation
  - SQL injection prevention
  - XSS protection

#### 4.2 Performance Optimization
**Effort: 4 days**

**Critical Performance Areas:**
- [ ] **Database Query Optimization**
  ```prisma
  // Add strategic indexes
  @@index([status, createdAt])
  @@index([userId, isRead])  
  @@index([orderId, type])
  ```

- [ ] **Caching Strategy Implementation**
  ```typescript
  // lib/cache.ts
  interface CacheConfig {
    parts: { ttl: 3600 }, // 1 hour
    assemblies: { ttl: 3600 },
    userSessions: { ttl: 1800 }, // 30 minutes
    bomPreviews: { ttl: 300 } // 5 minutes
  }
  ```

- [ ] **Frontend Optimization**
  - Component lazy loading
  - Image optimization
  - Bundle size reduction
  - Code splitting implementation

- [ ] **API Response Optimization**
  - Pagination for large datasets
  - Response compression
  - Selective field loading
  - Background processing for heavy operations

### Phase 5: Deployment Infrastructure & Monitoring (Weeks 6-8)
**Priority Level: P1 - Production Readiness**  
**Estimated Effort: 10 days**

#### 5.1 Environment Configuration
**Effort: 2 days**

**Environment Setup:**
```typescript
// environments/
├── development.env
├── staging.env
├── uat.env
└── production.env

// Required environment variables
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
JWT_SECRET=
UPLOADS_DIR=
REDIS_URL= // For caching
SMTP_CONFIG= // For notifications
FILE_STORAGE_CONFIG= // S3 or similar
MONITORING_API_KEY=
```

#### 5.2 CI/CD Pipeline Implementation
**Effort: 3 days**

**GitHub Actions Workflow:**
```yaml
# .github/workflows/production-deploy.yml
name: Production Deployment
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run Tests
        run: |
          npm test
          npm run test:e2e
          npm run test:performance
  
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Security Audit
        run: npm audit
      - name: Dependency Check
        run: npm run security:check
  
  deploy:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: npm run deploy:production
```

#### 5.3 Monitoring & Observability
**Effort: 3 days**

**Monitoring Stack:**
```typescript
// lib/monitoring.ts
interface MonitoringConfig {
  errorTracking: 'Sentry' // Error tracking and alerts
  performance: 'Vercel Analytics' // Frontend performance
  uptime: 'Custom health checks' // System availability
  logs: 'Structured logging' // Application logs
  metrics: 'Business metrics tracking' // KPIs
}
```

**Health Check Endpoints:**
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    fileStorage: await checkFileStorage(),
    externalAPIs: await checkExternalDependencies()
  }
  
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks
  })
}
```

#### 5.4 Backup & Recovery Procedures
**Effort: 2 days**

**Backup Strategy:**
- [ ] Automated database backups (daily)
- [ ] File storage backups (weekly)
- [ ] Configuration backups
- [ ] Disaster recovery testing procedures
- [ ] Data migration tools and procedures

---

## Implementation Guidelines

### Development Standards

#### Code Quality Standards
```typescript
// .eslintrc.js - Strict linting rules
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

#### TypeScript Requirements
- [ ] Strict mode enabled
- [ ] No `any` types (use proper interfaces)
- [ ] Comprehensive type definitions
- [ ] JSDoc comments for complex functions

#### Component Architecture
- [ ] Single Responsibility Principle
- [ ] Proper prop typing with interfaces
- [ ] Error boundaries for critical components
- [ ] Accessibility compliance (WCAG 2.1)

#### Database Best Practices
- [ ] Proper foreign key constraints
- [ ] Strategic indexing for performance
- [ ] Data validation at schema level
- [ ] Audit trail implementation

### Testing Requirements

#### Coverage Targets
- **Unit Tests:** 80%+ coverage
- **Integration Tests:** All critical user flows
- **E2E Tests:** Complete business workflows
- **Performance Tests:** All major operations

#### Test Quality Standards
- [ ] Meaningful test descriptions
- [ ] Proper mocking strategies
- [ ] Edge case coverage
- [ ] Performance regression tests

### Security Standards

#### Authentication & Authorization
- [ ] Role-based access control (RBAC)
- [ ] Session management
- [ ] Password security
- [ ] API authentication

#### Data Protection
- [ ] Input sanitization
- [ ] Output encoding
- [ ] Secure data transmission
- [ ] Privacy compliance

---

## Risk Assessment & Mitigation

### High-Priority Risks

#### RISK-001: BOM Generation Complexity
**Risk Level: HIGH**  
**Mitigation:**
- [ ] Comprehensive unit testing for all BOM scenarios
- [ ] Integration testing with real-world configurations
- [ ] Fallback mechanisms for complex configurations
- [ ] Debug tools and logging for troubleshooting

#### RISK-002: Data Migration Complexity
**Risk Level: HIGH**  
**Mitigation:**
- [ ] Create comprehensive migration scripts
- [ ] Test migrations on production-like data
- [ ] Rollback procedures for failed migrations
- [ ] Data validation and verification tools

#### RISK-003: Performance Under Load
**Risk Level: MEDIUM**  
**Mitigation:**
- [ ] Load testing with realistic user scenarios
- [ ] Database query optimization
- [ ] Caching implementation
- [ ] Horizontal scaling capabilities

#### RISK-004: Security Vulnerabilities
**Risk Level: HIGH**  
**Mitigation:**
- [ ] Security audit before production
- [ ] Penetration testing
- [ ] Regular dependency updates
- [ ] Security monitoring and alerting

### Project Timeline Risks

#### Resource Availability
- **Risk:** Developer availability constraints
- **Mitigation:** Prioritize P0 features, defer P1 features if needed

#### Scope Creep
- **Risk:** Additional feature requests during implementation
- **Mitigation:** Strict change control process, clear phase boundaries

#### Integration Complexity
- **Risk:** Legacy system integration issues
- **Mitigation:** Maintain dual backend during transition period

---

## Success Metrics & Acceptance Criteria

### Technical Metrics
- [ ] **Test Coverage:** ≥80% unit test coverage
- [ ] **Performance:** Page load times <3s, API responses <500ms
- [ ] **Security:** Zero critical vulnerabilities
- [ ] **Reliability:** 99.9% uptime target

### Business Metrics
- [ ] **Feature Completion:** 95%+ of specified user stories
- [ ] **User Acceptance:** Positive feedback from all user roles
- [ ] **Workflow Efficiency:** 50%+ reduction in manual processes
- [ ] **Data Accuracy:** 99%+ BOM generation accuracy

### Production Readiness Checklist
- [ ] All P0 features implemented and tested
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested
- [ ] User training materials prepared
- [ ] Support procedures documented

---

## Implementation Schedule

### Week 1-2: Foundation (Phase 1)
- **Days 1-3:** API standardization
- **Days 4-7:** Missing endpoint implementation
- **Days 8-10:** Error handling and validation

### Week 3-4: Core Workflows (Phase 2)
- **Days 11-15:** Assembly task management
- **Days 16-18:** Service department enhancement
- **Days 19-20:** Admin functions completion
- **Days 21-22:** Notification system

### Week 5: Testing Implementation (Phase 3)
- **Days 23-26:** Unit testing suite
- **Days 27-29:** Integration testing
- **Day 30:** Performance testing

### Week 6: Security & Performance (Phase 4)
- **Days 31-34:** Security hardening
- **Days 35-38:** Performance optimization

### Week 7-8: Deployment & Monitoring (Phase 5)
- **Days 39-40:** Environment configuration
- **Days 41-43:** CI/CD pipeline
- **Days 44-46:** Monitoring setup
- **Days 47-48:** Backup procedures

### Buffer Period
- **Days 49-56:** Bug fixes, optimization, documentation

---

## Important Notes

### BOM Debug Helper & BOM Viewer Protection
**CRITICAL:** The current `BOMDebugHelper.tsx` and `BOMViewer.tsx` implementations are working correctly and should **NOT** be modified during this implementation. These components represent stable, tested functionality that supports the core business requirements.

**Protected Components:**
- `components/debug/BOMDebugHelper.tsx` - ✅ Do not modify
- `components/order/BOMViewer.tsx` - ✅ Do not modify
- `src/services/bomService.js` - ⚠️ Extend only, do not break existing functionality

### Legacy System Considerations
- Maintain compatibility with existing Node.js backend during transition
- Preserve all existing BOM generation logic
- Ensure no disruption to current order creation workflow

### Compliance Requirements
- ISO 13485:2016 compliance for medical device manufacturing
- Audit trail requirements for all critical operations
- Data retention and backup requirements

---

**Document Control:**
- **Next Review Date:** Weekly during implementation
- **Owner:** Development Team Lead
- **Stakeholders:** Project Manager, QA Lead, DevOps Engineer
- **Version History:** Track all changes to implementation plan

This roadmap serves as the definitive guide for achieving production readiness while preserving the integrity of existing working components and maintaining focus on the highest priority business requirements.