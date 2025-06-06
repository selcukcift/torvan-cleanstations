# Deployment Planning Document
## Torvan Medical CleanStation Production Workflow Digitalization

**Version:** 1.0  
**Date:** June 2, 2025  
**Document Type:** Deployment Planning Document  
**Target Platform:** Vercel (Primary) / AWS (Alternative)

---

## 1. Deployment Overview

### 1.1 Deployment Strategy
- **Blue-Green Deployment:** Zero-downtime deployments with instant rollback capability
- **Progressive Rollout:** Gradual user migration from legacy system
- **Environment Promotion:** Development → Staging → UAT → Production
- **Feature Flags:** Controlled feature rollouts and A/B testing
- **Database Migrations:** Automated, reversible schema changes

### 1.2 Deployment Environments
```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                   │
│  ├── Web Application (Vercel)                             │
│  ├── Database (Vercel Postgres / AWS RDS)                │
│  ├── File Storage (Vercel Blob / AWS S3)                 │
│  ├── CDN (Vercel Edge / CloudFront)                      │
│  └── Monitoring (Vercel Analytics / DataDog)             │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      UAT Environment                       │
│  ├── Web Application (Vercel Preview)                    │
│  ├── Database (Dedicated UAT DB)                         │
│  ├── File Storage (Staging Bucket)                       │
│  └── Test Data (Production-like dataset)                 │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Staging Environment                     │
│  ├── Web Application (Vercel Preview)                    │
│  ├── Database (Staging DB)                               │
│  ├── File Storage (Staging Bucket)                       │
│  └── Integration Testing                                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                 Development Environment                    │
│  ├── Local Development (Docker Compose)                  │
│  ├── Feature Branches (Vercel Preview)                   │
│  ├── Database (Local PostgreSQL)                         │
│  └── Mock Services                                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Deployment Timeline
```
Phase 1: Infrastructure Setup (Week 1-2)
├── Cloud provider setup
├── Domain configuration
├── SSL certificate setup
├── Database provisioning
└── CI/CD pipeline configuration

Phase 2: Staging Deployment (Week 3)
├── Staging environment deployment
├── Database migration testing
├── Integration testing
└── Performance testing

Phase 3: UAT Deployment (Week 4)
├── UAT environment setup
├── User acceptance testing
├── Training environment preparation
└── Documentation finalization

Phase 4: Production Deployment (Week 5)
├── Production infrastructure setup
├── Data migration planning
├── Go-live preparation
└── Production deployment

Phase 5: Post-Deployment (Week 6)
├── Monitoring setup
├── User training
├── Legacy system transition
└── Performance optimization
```

## 2. Infrastructure Architecture

### 2.1 Vercel Deployment (Primary)

#### Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["iad1"],
  "functions": {
    "app/api/orders/route.ts": {
      "maxDuration": 30
    },
    "app/api/bom/generate/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/backup",
      "schedule": "0 1 * * *"
    }
  ]
}
```

#### Environment Variables Configuration
```bash
# Database
DATABASE_URL="postgresql://username:password@hostname:5432/database"
DATABASE_URL_NON_POOLING="postgresql://username:password@hostname:5432/database"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"

# File Storage
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"

# Email
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@torvanmedical.com"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
VERCEL_ANALYTICS_ID="your-analytics-id"

# Feature Flags
NEXT_PUBLIC_ENABLE_QC_TEMPLATES=true
NEXT_PUBLIC_ENABLE_SERVICE_ORDERS=true
NEXT_PUBLIC_ENABLE_ADVANCED_REPORTING=false

# API Keys
NEXT_PUBLIC_API_BASE_URL="https://your-domain.com/api/v1"
```

#### Next.js Configuration (`next.config.js`)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: ['vercel-blob.com', 'your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://your-domain.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'next-auth.session-token',
          },
        ],
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@prisma/client': '@prisma/client/index-browser',
      };
    }
    return config;
  },
};

module.exports = nextConfig;
```

### 2.2 AWS Deployment (Alternative)

#### AWS Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Region                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  VPC (10.0.0.0/16)                 │   │
│  │  ┌─────────────────┐  ┌─────────────────────────┐  │   │
│  │  │  Public Subnet  │  │     Private Subnet      │  │   │
│  │  │  (10.0.1.0/24) │  │     (10.0.2.0/24)      │  │   │
│  │  │                 │  │                         │  │   │
│  │  │ ┌─────────────┐ │  │ ┌─────────────────────┐ │  │   │
│  │  │ │     ALB     │ │  │ │     ECS Fargate     │ │  │   │
│  │  │ └─────────────┘ │  │ │   (Next.js App)     │ │  │   │
│  │  │                 │  │ └─────────────────────┘ │  │   │
│  │  │ ┌─────────────┐ │  │                         │  │   │
│  │  │ │   CloudFront│ │  │ ┌─────────────────────┐ │  │   │
│  │  │ │     CDN     │ │  │ │     RDS PostgreSQL  │ │  │   │
│  │  │ └─────────────┘ │  │ │    (Multi-AZ)       │ │  │   │
│  │  └─────────────────┘  │ └─────────────────────┘ │  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Terraform Configuration
```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "torvan-terraform-state"
    key    = "cleanstation/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "torvan-cleanstation-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support = true
  
  tags = {
    Environment = var.environment
    Project     = "torvan-cleanstation"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "torvan-cleanstation-${var.environment}"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = {
    Environment = var.environment
    Project     = "torvan-cleanstation"
  }
}

# RDS Database
module "rds" {
  source = "terraform-aws-modules/rds/aws"
  
  identifier = "torvan-cleanstation-${var.environment}"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  
  db_name  = "cleanstation"
  username = var.db_username
  password = var.db_password
  port     = 5432
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = module.vpc.database_subnet_group
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  
  monitoring_interval    = 60
  monitoring_role_name   = "rds-monitoring-role"
  create_monitoring_role = true
  
  multi_az               = var.environment == "production"
  deletion_protection    = var.environment == "production"
  
  tags = {
    Environment = var.environment
    Project     = "torvan-cleanstation"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "torvan-cleanstation-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnets
  
  enable_deletion_protection = var.environment == "production"
  
  tags = {
    Environment = var.environment
    Project     = "torvan-cleanstation"
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "torvan-cleanstation-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_count
  
  launch_type = "FARGATE"
  
  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = module.vpc.private_subnets
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }
  
  depends_on = [aws_lb_listener.app]
  
  tags = {
    Environment = var.environment
    Project     = "torvan-cleanstation"
  }
}
```

## 3. Database Deployment Strategy

### 3.1 Migration Strategy

#### Database Migration Pipeline
```bash
#!/bin/bash
# scripts/db-migrate.sh

set -e

ENVIRONMENT=${1:-staging}
DRY_RUN=${2:-false}

echo "Starting database migration for environment: $ENVIRONMENT"

# Load environment variables
source .env.$ENVIRONMENT

# Backup current database (production only)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Creating backup before migration..."
    npm run db:backup:create
fi

# Run migration preview
echo "Preview migration changes..."
if [ "$DRY_RUN" = "true" ]; then
    npx prisma migrate diff \
        --from-schema-datamodel prisma/schema.prisma \
        --to-schema-datasource $DATABASE_URL \
        --script
    exit 0
fi

# Execute migration
echo "Executing database migration..."
npx prisma migrate deploy

# Verify migration
echo "Verifying migration..."
npm run db:verify

# Seed initial data (non-production)
if [ "$ENVIRONMENT" != "production" ]; then
    echo "Seeding database..."
    npm run db:seed
fi

echo "Database migration completed successfully!"
```

#### Prisma Migration Configuration
```typescript
// prisma/migrations/deploy.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deployMigration() {
  try {
    console.log('Starting migration deployment...');
    
    // Check current database state
    const migrationStatus = await prisma.$queryRaw`
      SELECT * FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 1
    `;
    
    console.log('Current migration status:', migrationStatus);
    
    // Deploy pending migrations
    await prisma.$executeRaw`
      -- Migration commands will be inserted here by Prisma
    `;
    
    console.log('Migration deployed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deployMigration();
```

### 3.2 Data Seeding Strategy

#### Production Data Seeding
```typescript
// prisma/seed/production.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function seedProduction() {
  console.log('Seeding production database...');
  
  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: await hash('TorvanAdmin2025!', 12),
      fullName: 'System Administrator',
      initials: 'SA',
      role: 'ADMIN',
      isActive: true,
    },
  });
  
  // Create initial production coordinator
  const prodCoordinator = await prisma.user.upsert({
    where: { username: 'sal.coordinator' },
    update: {},
    create: {
      username: 'sal.coordinator',
      passwordHash: await hash('TorvanProd2025!', 12),
      fullName: 'Sal Production Coordinator',
      initials: 'SP',
      role: 'PRODUCTION_COORDINATOR',
      isActive: true,
    },
  });
  
  // Seed parts data from JSON files
  const partsData = JSON.parse(fs.readFileSync('prisma/data/parts.json', 'utf8'));
  const assembliesData = JSON.parse(fs.readFileSync('prisma/data/assemblies.json', 'utf8'));
  const categoriesData = JSON.parse(fs.readFileSync('prisma/data/categories.json', 'utf8'));
  
  // Seed categories
  for (const category of categoriesData) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {},
      create: category,
    });
  }
  
  // Seed parts
  for (const part of partsData) {
    await prisma.part.upsert({
      where: { id: part.id },
      update: {},
      create: part,
    });
  }
  
  // Seed assemblies
  for (const assembly of assembliesData) {
    await prisma.assembly.upsert({
      where: { id: assembly.id },
      update: {},
      create: {
        id: assembly.id,
        name: assembly.name,
        type: assembly.type,
        categoryCode: assembly.categoryCode,
        subcategoryCode: assembly.subcategoryCode,
        canOrder: assembly.canOrder,
        isKit: assembly.isKit,
        status: assembly.status,
        kitComponents: assembly.kitComponents,
      },
    });
  }
  
  // Create QC templates based on CLP.T2.001.V01 document
  const preQCTemplate = await prisma.qCFormTemplate.upsert({
    where: { formName: 'Pre-Production Check MDRD' },
    update: {},
    create: {
      formName: 'Pre-Production Check MDRD',
      formType: 'PRE_QC',
      version: 1,
      description: 'Pre-production quality control checklist for MDRD sinks',
      isActive: true,
    },
  });
  
  // Create Pre-QC checklist items
  const preQCItems = [
    {
      section: 'SECTION 1',
      itemDescription: 'Verify final sink dimensions against drawing and BOM',
      checkType: 'MEASUREMENT',
      isBasinSpecific: false,
      isRequired: true,
      sequenceOrder: 1,
    },
    {
      section: 'SECTION 1',
      itemDescription: 'Confirm final approved drawing and paperwork are attached',
      checkType: 'BOOLEAN',
      isBasinSpecific: false,
      isRequired: true,
      sequenceOrder: 2,
    },
    // ... more checklist items
  ];
  
  for (const item of preQCItems) {
    await prisma.qCChecklistItem.create({
      data: {
        ...item,
        templateId: preQCTemplate.id,
      },
    });
  }
  
  console.log('Production database seeded successfully');
}

seedProduction()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## 4. CI/CD Pipeline Configuration

### 4.1 GitHub Actions Workflow

#### Main Deployment Workflow (`.github/workflows/deploy.yml`)
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - uat
          - production

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma client
        run: npx prisma generate
      
      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
      
      - name: Seed test database
        run: npm run db:seed:test
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma client
        run: npx prisma generate
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_API_BASE_URL: ${{ secrets.NEXT_PUBLIC_API_BASE_URL }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: .next/

  deploy-staging:
    if: github.ref == 'refs/heads/main' || github.event.inputs.environment == 'staging'
    needs: [test, build]
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--env .env.staging'
          scope: ${{ secrets.VERCEL_TEAM_SCOPE }}
      
      - name: Run database migrations (Staging)
        run: |
          npm ci
          npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
      
      - name: Run E2E tests against staging
        run: npm run test:e2e
        env:
          BASE_URL: ${{ steps.deploy.outputs.preview-url }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      
      - name: Notify deployment success
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: 'Staging deployment successful!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  deploy-production:
    if: github.event.inputs.environment == 'production'
    needs: [test, build, deploy-staging]
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Create database backup
        run: |
          npm ci
          npm run db:backup:create
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
          BACKUP_STORAGE_URL: ${{ secrets.BACKUP_STORAGE_URL }}
      
      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod --env .env.production'
          scope: ${{ secrets.VERCEL_TEAM_SCOPE }}
      
      - name: Run database migrations (Production)
        run: |
          npm ci
          npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
      
      - name: Warm up application
        run: |
          curl -f ${{ secrets.PRODUCTION_URL }}/api/health || exit 1
          curl -f ${{ secrets.PRODUCTION_URL }}/dashboard || exit 1
      
      - name: Run smoke tests
        run: npm run test:smoke
        env:
          BASE_URL: ${{ secrets.PRODUCTION_URL }}
      
      - name: Notify deployment success
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: 'Production deployment successful! 🚀'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

  rollback:
    if: failure()
    needs: [deploy-production]
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Rollback deployment
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--rollback'
      
      - name: Restore database backup
        run: |
          npm ci
          npm run db:backup:restore
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
          BACKUP_STORAGE_URL: ${{ secrets.BACKUP_STORAGE_URL }}
      
      - name: Notify rollback
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: 'Production deployment failed - rolled back! ⚠️'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 4.2 Database Backup and Recovery

#### Backup Script
```bash
#!/bin/bash
# scripts/db-backup.sh

set -e

ENVIRONMENT=${1:-production}
BACKUP_TYPE=${2:-full}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Load environment variables
source .env.$ENVIRONMENT

BACKUP_FILENAME="torvan_cleanstation_${ENVIRONMENT}_${BACKUP_TYPE}_${TIMESTAMP}.sql"

echo "Creating $BACKUP_TYPE backup for $ENVIRONMENT environment..."

# Create database backup
if [ "$BACKUP_TYPE" = "schema" ]; then
    pg_dump --schema-only \
            --no-owner \
            --no-privileges \
            "$DATABASE_URL" \
            > "backups/$BACKUP_FILENAME"
else
    pg_dump --no-owner \
            --no-privileges \
            --exclude-table=_prisma_migrations \
            "$DATABASE_URL" \
            > "backups/$BACKUP_FILENAME"
fi

# Compress backup
gzip "backups/$BACKUP_FILENAME"
COMPRESSED_FILENAME="${BACKUP_FILENAME}.gz"

echo "Backup created: backups/$COMPRESSED_FILENAME"

# Upload to cloud storage (AWS S3 or Vercel Blob)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Uploading backup to cloud storage..."
    
    # Upload to AWS S3
    aws s3 cp "backups/$COMPRESSED_FILENAME" \
        "s3://torvan-backups/database/$COMPRESSED_FILENAME" \
        --storage-class STANDARD_IA
    
    # Or upload to Vercel Blob
    # node scripts/upload-backup.js "backups/$COMPRESSED_FILENAME"
    
    echo "Backup uploaded successfully"
fi

# Clean up old local backups (keep last 7 days)
find backups/ -name "*.gz" -mtime +7 -delete

echo "Backup process completed"
```

#### Recovery Script
```bash
#!/bin/bash
# scripts/db-restore.sh

set -e

BACKUP_FILE=$1
ENVIRONMENT=${2:-staging}

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file> [environment]"
    exit 1
fi

# Load environment variables
source .env.$ENVIRONMENT

echo "Restoring database from backup: $BACKUP_FILE"

# Download backup from cloud storage if needed
if [[ $BACKUP_FILE =~ ^s3:// ]]; then
    LOCAL_BACKUP="backups/$(basename $BACKUP_FILE)"
    aws s3 cp "$BACKUP_FILE" "$LOCAL_BACKUP"
    BACKUP_FILE="$LOCAL_BACKUP"
fi

# Decompress if needed
if [[ $BACKUP_FILE =~ \.gz$ ]]; then
    gunzip -c "$BACKUP_FILE" > "${BACKUP_FILE%.gz}"
    BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

# Create confirmation prompt for production
if [ "$ENVIRONMENT" = "production" ]; then
    echo "WARNING: You are about to restore the PRODUCTION database!"
    echo "This will overwrite all current data."
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo "Restore cancelled"
        exit 1
    fi
fi

# Restore database
echo "Restoring database..."
psql "$DATABASE_URL" < "$BACKUP_FILE"

# Run migrations to ensure schema is up to date
echo "Running migrations..."
npx prisma migrate deploy

echo "Database restore completed successfully"
```

## 5. Monitoring and Observability

### 5.1 Application Monitoring

#### Vercel Analytics Setup
```typescript
// src/lib/monitoring/analytics.ts
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export function MonitoringProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  );
}

// Usage in layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MonitoringProviders>
          {children}
        </MonitoringProviders>
      </body>
    </html>
  );
}
```

#### Error Monitoring with Sentry
```typescript
// src/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  
  // Set sampling rate for profiling
  profilesSampleRate: 1.0,
  
  // Capture unhandled promise rejections
  captureUnhandledRejections: true,
  
  beforeSend(event) {
    // Filter out specific errors
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.type === 'ChunkLoadError') {
        return null; // Don't send chunk load errors
      }
    }
    return event;
  },
});

// Custom error boundary
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2 className="text-xl font-semibold mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">
            We're sorry, but something unexpected happened.
          </p>
          <button
            onClick={resetError}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try again
          </button>
        </div>
      )}
      showDialog
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
```

#### Performance Monitoring
```typescript
// src/lib/monitoring/performance.ts
import { NextWebVitalsMetric } from 'next/app';

export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Web Vital:', metric);
  }
  
  // Send to analytics service
  if (typeof window !== 'undefined') {
    // Send to Vercel Analytics
    window.va?.track('Web Vitals', {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      label: metric.label,
    });
    
    // Send to custom analytics
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    }).catch((error) => {
      console.error('Failed to send web vitals:', error);
    });
  }
}

// Health check endpoint
// src/app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    // Check external service connectivity
    const checks = {
      database: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV,
    };
    
    return Response.json(checks, { status: 200 });
  } catch (error) {
    return Response.json(
      { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
```

### 5.2 Infrastructure Monitoring

#### Uptime Monitoring Configuration
```javascript
// monitoring/uptime-monitor.js
const monitors = [
  {
    name: 'Torvan CleanStation - Main App',
    url: 'https://cleanstation.torvanmedical.com',
    method: 'GET',
    expectedStatus: 200,
    timeout: 30000,
    interval: 60000, // 1 minute
  },
  {
    name: 'Torvan CleanStation - API Health',
    url: 'https://cleanstation.torvanmedical.com/api/health',
    method: 'GET',
    expectedStatus: 200,
    timeout: 10000,
    interval: 120000, // 2 minutes
  },
  {
    name: 'Torvan CleanStation - Database',
    url: 'https://cleanstation.torvanmedical.com/api/health/database',
    method: 'GET',
    expectedStatus: 200,
    timeout: 15000,
    interval: 300000, // 5 minutes
  },
];

module.exports = { monitors };
```

#### Alerting Configuration
```yaml
# monitoring/alerts.yml
alerts:
  - name: Application Down
    condition: http_status != 200
    duration: 2m
    channels:
      - slack
      - email
    message: "🚨 Torvan CleanStation application is down"
    
  - name: High Response Time
    condition: response_time > 5000ms
    duration: 5m
    channels:
      - slack
    message: "⚠️ High response time detected"
    
  - name: Database Connection Error
    condition: database_healthy != true
    duration: 1m
    channels:
      - slack
      - email
      - pagerduty
    message: "🔥 Database connection issue"
    
  - name: High Error Rate
    condition: error_rate > 5%
    duration: 5m
    channels:
      - slack
    message: "📈 High error rate detected"

channels:
  slack:
    webhook_url: "${SLACK_WEBHOOK_URL}"
    channel: "#alerts"
    
  email:
    smtp_server: "${SMTP_SERVER}"
    recipients:
      - "devops@torvanmedical.com"
      - "sal@torvanmedical.com"
      
  pagerduty:
    service_key: "${PAGERDUTY_SERVICE_KEY}"
```

## 6. Security and Compliance

### 6.1 Security Configuration

#### Security Headers
```typescript
// next.config.js security headers
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https:",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    },
  ];
}
```

#### Environment Security
```bash
# .env.production (secure configuration)
NODE_ENV=production

# Database (use connection pooling in production)
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require&connection_limit=10"

# Authentication (secure secret generation)
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://cleanstation.torvanmedical.com"

# File uploads (restricted file types)
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/webp,application/pdf"
MAX_FILE_SIZE=10485760 # 10MB

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900 # 15 minutes

# CORS configuration
ALLOWED_ORIGINS="https://cleanstation.torvanmedical.com"

# Audit logging
AUDIT_LOG_RETENTION_DAYS=2555 # 7 years for compliance
```

### 6.2 ISO 13485:2016 Compliance

#### Audit Trail Implementation
```typescript
// src/lib/audit/audit-logger.ts
interface AuditEntry {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: any;
  newValues?: any;
  reasonCode?: string;
  comments?: string;
}

export class AuditLogger {
  async logAction(entry: AuditEntry) {
    try {
      await db.auditLog.create({
        data: {
          ...entry,
          timestamp: new Date(),
          sessionId: await this.getCurrentSessionId(),
          complianceLevel: this.determineComplianceLevel(entry.entityType),
        },
      });
      
      // For critical operations, also log to external service
      if (this.isCriticalOperation(entry.action, entry.entityType)) {
        await this.logToExternalService(entry);
      }
    } catch (error) {
      // Audit logging failure is critical
      console.error('CRITICAL: Audit logging failed', error);
      await this.sendAlertToCompliance(entry, error);
    }
  }
  
  private determineComplianceLevel(entityType: string): string {
    const criticalEntities = [
      'ProductionOrder',
      'QCResult', 
      'User',
      'BillOfMaterials'
    ];
    
    return criticalEntities.includes(entityType) ? 'HIGH' : 'MEDIUM';
  }
  
  private isCriticalOperation(action: string, entityType: string): boolean {
    const criticalActions = ['DELETE', 'STATUS_CHANGE', 'QC_APPROVAL'];
    const criticalEntities = ['ProductionOrder', 'QCResult'];
    
    return criticalActions.includes(action) && criticalEntities.includes(entityType);
  }
}

// Middleware for automatic audit logging
export function withAuditLogging(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    const startTime = Date.now();
    
    try {
      const result = await handler(req, res);
      
      // Log successful operations
      if (req.method !== 'GET') {
        await auditLogger.logAction({
          userId: session?.user?.id || 'anonymous',
          action: `${req.method}_${req.url}`,
          entityType: extractEntityType(req.url),
          entityId: extractEntityId(req.url) || 'unknown',
          timestamp: new Date(),
          ipAddress: req.headers['x-forwarded-for'] as string || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          responseTime: Date.now() - startTime,
        });
      }
      
      return result;
    } catch (error) {
      // Log failed operations
      await auditLogger.logAction({
        userId: session?.user?.id || 'anonymous',
        action: `${req.method}_${req.url}_ERROR`,
        entityType: extractEntityType(req.url),
        entityId: 'error',
        timestamp: new Date(),
        ipAddress: req.headers['x-forwarded-for'] as string,
        userAgent: req.headers['user-agent'],
        comments: error.message,
      });
      
      throw error;
    }
  };
}
```

## 7. Rollback Strategy

### 7.1 Application Rollback

#### Automated Rollback Script
```bash
#!/bin/bash
# scripts/rollback.sh

set -e

ENVIRONMENT=${1:-production}
ROLLBACK_TYPE=${2:-application} # application, database, full
ROLLBACK_TARGET=${3:-previous} # previous, specific version

echo "Starting rollback for $ENVIRONMENT environment..."
echo "Rollback type: $ROLLBACK_TYPE"
echo "Rollback target: $ROLLBACK_TARGET"

# Load environment configuration
source .env.$ENVIRONMENT

case $ROLLBACK_TYPE in
  "application")
    echo "Rolling back application deployment..."
    
    # Rollback Vercel deployment
    vercel rollback --scope=$VERCEL_TEAM_SCOPE --token=$VERCEL_TOKEN
    
    # Verify rollback
    sleep 30
    curl -f "$PRODUCTION_URL/api/health" || {
      echo "Health check failed after rollback"
      exit 1
    }
    
    echo "Application rollback completed successfully"
    ;;
    
  "database")
    echo "Rolling back database changes..."
    
    # Find the backup to restore
    if [ "$ROLLBACK_TARGET" = "previous" ]; then
      BACKUP_FILE=$(ls -t backups/*.gz | head -n 2 | tail -n 1)
    else
      BACKUP_FILE="backups/$ROLLBACK_TARGET"
    fi
    
    # Restore database
    ./scripts/db-restore.sh "$BACKUP_FILE" "$ENVIRONMENT"
    
    echo "Database rollback completed successfully"
    ;;
    
  "full")
    echo "Performing full rollback..."
    
    # First rollback database
    ./scripts/rollback.sh "$ENVIRONMENT" database "$ROLLBACK_TARGET"
    
    # Then rollback application
    ./scripts/rollback.sh "$ENVIRONMENT" application "$ROLLBACK_TARGET"
    
    echo "Full rollback completed successfully"
    ;;
    
  *)
    echo "Invalid rollback type: $ROLLBACK_TYPE"
    echo "Valid types: application, database, full"
    exit 1
    ;;
esac

# Send notification
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-type: application/json' \
  --data "{
    \"text\": \"🔄 Rollback completed for $ENVIRONMENT environment\",
    \"blocks\": [
      {
        \"type\": \"section\",
        \"text\": {
          \"type\": \"mrkdwn\",
          \"text\": \"*Rollback Summary*\n• Environment: $ENVIRONMENT\n• Type: $ROLLBACK_TYPE\n• Target: $ROLLBACK_TARGET\n• Status: ✅ Completed\"
        }
      }
    ]
  }"

echo "Rollback process completed successfully!"
```

### 7.2 Data Recovery Procedures

#### Point-in-Time Recovery
```sql
-- Point-in-time recovery script (PostgreSQL)
-- This script should be executed by DBA in case of data corruption

-- Step 1: Stop application (prevent new writes)
-- Step 2: Create current state backup
SELECT pg_start_backup('emergency_recovery');

-- Step 3: Restore from base backup + WAL files up to specific time
-- (This would be done at filesystem level)

-- Step 4: Recovery to specific timestamp
SELECT pg_stop_backup();

-- Step 5: Verify data integrity
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Step 6: Validate critical business data
SELECT COUNT(*) as order_count FROM "ProductionOrder";
SELECT COUNT(*) as user_count FROM "User" WHERE "isActive" = true;
SELECT COUNT(*) as qc_results FROM "QCResult";

-- Step 7: Check for any data inconsistencies
SELECT 
  po.id,
  po."poNumber",
  po."orderStatus",
  bom.id as bom_id
FROM "ProductionOrder" po
LEFT JOIN "BillOfMaterials" bom ON po."bomId" = bom.id
WHERE po."bomId" IS NOT NULL AND bom.id IS NULL;
```

## 8. Go-Live Checklist

### 8.1 Pre-Deployment Checklist

#### Technical Readiness
- [ ] **Infrastructure Setup**
  - [ ] Production environment provisioned
  - [ ] Database configured and optimized
  - [ ] SSL certificates installed
  - [ ] CDN configured
  - [ ] Monitoring and alerting active
  - [ ] Backup systems tested

- [ ] **Application Readiness**
  - [ ] All acceptance criteria met
  - [ ] Performance benchmarks achieved
  - [ ] Security scan completed
  - [ ] Load testing passed
  - [ ] Browser compatibility verified
  - [ ] Mobile responsiveness confirmed

- [ ] **Data Migration**
  - [ ] Data migration scripts tested
  - [ ] Data validation procedures verified
  - [ ] Rollback procedures tested
  - [ ] Data integrity checks completed

- [ ] **Security and Compliance**
  - [ ] Security audit completed
  - [ ] ISO 13485:2016 compliance verified
  - [ ] Audit logging functional
  - [ ] Access controls configured
  - [ ] Password policies enforced

#### Operational Readiness
- [ ] **Support and Documentation**
  - [ ] User manuals completed
  - [ ] Admin documentation updated
  - [ ] Training materials prepared
  - [ ] Support procedures documented
  - [ ] Troubleshooting guides created

- [ ] **User Training**
  - [ ] Admin users trained
  - [ ] Production coordinators trained
  - [ ] QC personnel trained
  - [ ] Assemblers trained
  - [ ] Service department trained

- [ ] **Communication**
  - [ ] Stakeholders notified
  - [ ] Go-live timeline communicated
  - [ ] Support contacts distributed
  - [ ] Escalation procedures shared

### 8.2 Go-Live Execution Plan

#### Day of Deployment
```
Time    | Activity                        | Owner           | Duration
--------|--------------------------------|-----------------|----------
08:00   | Final backup creation          | DevOps          | 30 min
08:30   | Legacy system maintenance mode | Ops Team        | 15 min
08:45   | Production deployment          | DevOps          | 45 min
09:30   | Database migration             | DevOps/DBA      | 30 min
10:00   | Smoke testing                  | QA Team         | 30 min
10:30   | User acceptance validation     | Business Users  | 60 min
11:30   | Go/No-Go decision             | Project Manager | 15 min
11:45   | Legacy system shutdown         | Ops Team        | 15 min
12:00   | Production traffic cutover     | DevOps          | 15 min
12:15   | Monitoring validation          | DevOps          | 30 min
12:45   | User communication             | Project Manager | 15 min
13:00   | Live support begins            | Support Team    | Ongoing
```

#### Post Go-Live Monitoring (First 48 Hours)
- [ ] **Hour 1-4: Critical Monitoring**
  - [ ] Application availability
  - [ ] Database performance
  - [ ] User login success rate
  - [ ] Error rates and patterns
  - [ ] Key workflow completion

- [ ] **Hour 4-24: Extended Monitoring**
  - [ ] Performance metrics
  - [ ] User adoption rates
  - [ ] Feature usage analytics
  - [ ] Support ticket volume
  - [ ] System resource utilization

- [ ] **Hour 24-48: Stabilization**
  - [ ] Performance optimization
  - [ ] Issue resolution
  - [ ] User feedback collection
  - [ ] Process refinements
  - [ ] Documentation updates

### 8.3 Success Criteria

#### Technical Success Metrics
- **Availability:** > 99.9% uptime
- **Performance:** < 2 second page load times
- **Error Rate:** < 0.1% application errors
- **User Satisfaction:** > 4/5 rating in first week
- **Data Integrity:** 100% data migration accuracy

#### Business Success Metrics
- **User Adoption:** > 80% of target users active within first week
- **Workflow Completion:** > 95% of orders progress through system
- **Training Effectiveness:** > 90% of users complete basic tasks independently
- **Support Load:** < 5 support tickets per day after first week
- **Process Efficiency:** 20% improvement in order processing time

---

*This deployment planning document provides a comprehensive roadmap for successfully deploying the Torvan Medical CleanStation Production Workflow system to production. Regular reviews and updates should be made based on actual deployment experiences and changing requirements.*