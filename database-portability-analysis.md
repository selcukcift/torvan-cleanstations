# Database Portability Analysis for Clean Stations

## Executive Summary
The Clean Stations database can be easily regenerated on a different computer. The project uses a well-structured approach with PostgreSQL, Prisma ORM, migration files, and comprehensive seed scripts.

## Current Database Setup

### 1. Database Technology Stack
- **Database**: PostgreSQL (any version, but tested with 14+)
- **ORM**: Prisma (v6.8.2)
- **Migration Tool**: Prisma Migrate
- **Language**: TypeScript/JavaScript

### 2. Schema Management
The database schema is fully defined in `/prisma/schema.prisma` with:
- 56 models (tables)
- 14 enums
- Complete relationships and constraints
- Proper indexes

### 3. Migration History
The project has a complete migration history in `/prisma/migrations/`:
- `20250531235152_init` - Initial schema
- `20250601015552_add_user_authentication` - User auth
- `20250601113956_add_order_management_models` - Orders
- `20250602001555_add_qc_system_complete` - QC system
- `20250602175255_add_service_orders` - Service orders
- `20250605131341_add_enhanced_features` - Enhanced features
- `20250605135225_add_advanced_database_features` - Advanced features
- `20250605195249_add_sink_configuration` - Sink config
- `20250606164501_add_custom_basin_dimensions` - Custom dimensions
- `20250611000000_add_order_comments_and_notifications` - Comments/notifications

### 4. Seed Data
Comprehensive seeding system in `/scripts/`:
- **Main seed script**: `seed-all.js` - Orchestrates all seeding
- **Core data**: `seed.js` - Parts, assemblies, categories, users
- **QC templates**: `seedQcTemplates.js` - Quality control templates
- **Enhanced models**: `seed-enhanced-models.js` - Advanced features
- **Test data**: Various scripts for creating test orders and data

Data sources in `/resources/`:
- `parts.json` - 284 parts
- `assemblies.json` - 334 assemblies
- `categories.json` - Categories and subcategories

## Environment Configuration

### Required Environment Variables
```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/database-name"

# Other required variables (see .env.example for full list)
```

### No Hard-Coded Database References
The codebase properly uses environment variables for all database connections. No hard-coded PostgreSQL URLs were found in the source code.

## Steps to Regenerate Database on New Computer

### 1. Prerequisites
```bash
# Install PostgreSQL (if not already installed)
# Install Node.js 18+ and npm
# Clone the repository
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb clean-stations-db

# Or using psql
psql -U postgres -c "CREATE DATABASE \"clean-stations-db\";"
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your database credentials
# Example:
DATABASE_URL="postgresql://postgres:password@localhost:5432/clean-stations-db"
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Generate Prisma Client
```bash
npm run prisma:generate
```

### 6. Run Migrations
```bash
# This creates all tables and relationships
npx prisma migrate deploy

# Or to reset and recreate everything
npx prisma migrate reset
```

### 7. Seed the Database
```bash
# Run comprehensive seeding (recommended)
npm run prisma:seed:all

# Or run individual seed scripts
npm run prisma:seed  # Core data only
```

### 8. Verify Installation
```bash
# Check database connection
node test-db-connection.js

# Verify data was seeded
node scripts/verify-db.js
```

## Automated Setup Script

A setup script exists at `setup-database.sh` that automates the entire process:
```bash
chmod +x setup-database.sh
./setup-database.sh
```

This script:
1. Generates Prisma client
2. Pushes schema to database
3. Runs comprehensive seeding
4. Verifies the setup

## Data Included in Seeding

After seeding, the database will contain:
- **Users**: 6 users (one for each role)
  - admin/admin123
  - coordinator/coordinator123
  - procurement/procure123
  - qc/qc123
  - assembler/assemble123
  - service/service123
- **Parts**: 284 parts
- **Assemblies**: 334 assemblies (including 154 pegboard kits)
- **Categories**: Complete category hierarchy
- **QC Templates**: 4 templates with 150+ checklist items
- **Work Instructions**: Task templates and procedures
- **Test Procedures**: Testing frameworks
- **Sample Data**: Example orders, notifications, etc.

## Potential Issues and Solutions

### 1. PostgreSQL Version Compatibility
- **Issue**: Different PostgreSQL versions
- **Solution**: The schema uses standard PostgreSQL features compatible with v12+

### 2. Operating System Differences
- **Issue**: Path separators, line endings
- **Solution**: Code uses Node.js path module for cross-platform compatibility

### 3. Permission Issues
- **Issue**: Database user permissions
- **Solution**: Ensure database user has CREATE, ALTER, DROP privileges

### 4. Port Conflicts
- **Issue**: PostgreSQL not on default port 5432
- **Solution**: Update DATABASE_URL in .env.local with correct port

## Backup and Restore Alternative

For existing data migration:
```bash
# On source computer
pg_dump -U postgres clean-stations-db > backup.sql

# On target computer
psql -U postgres -d clean-stations-db < backup.sql
```

## Recommendations

1. **Use Migration Approach**: The Prisma migration approach is recommended as it ensures schema consistency and includes all constraints and indexes.

2. **Always Seed After Fresh Install**: The seed scripts ensure all required reference data is present.

3. **Environment Variables**: Never commit .env.local files. Always use .env.example as a template.

4. **Version Control**: The migration files are in version control, ensuring reproducible database structure.

5. **Test After Setup**: Always run the verification scripts to ensure proper setup.

## Conclusion

The Clean Stations database is highly portable and can be easily regenerated on any computer with PostgreSQL installed. The combination of:
- Prisma schema definition
- Migration files
- Comprehensive seed scripts
- Environment-based configuration

Makes the database setup straightforward and reproducible. No manual SQL scripts or hard-coded values are required.