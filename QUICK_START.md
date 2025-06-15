# Clean Stations - Quick Start Guide

This guide helps you set up the Clean Stations application on any PostgreSQL database.

## 🚀 Quick Setup (Any PostgreSQL Instance)

### 1. Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL database (local or remote)
- Git

### 2. Clone and Install

```bash
git clone <repository-url>
cd Clean-stations
npm install
```

### 3. Database Configuration

1. **Create your database** (if it doesn't exist):
   ```sql
   CREATE DATABASE your_database_name;
   ```

2. **Copy environment template**:
   ```bash
   cp .env.template .env.local
   ```

3. **Update .env.local** with your database credentials:
   ```bash
   # Edit .env.local
   DATABASE_URL="postgresql://username:password@host:port/database_name?schema=public"
   ```

### 4. Automated Setup

Run the setup script:
```bash
./setup-database.sh
```

This will:
- ✅ Generate Prisma client
- ✅ Create database tables
- ✅ Seed all data (284 parts, 334 assemblies, 6 users, 4 QC templates)
- ✅ Verify everything is working

### 5. Start the Application

```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3005
- **Backend API**: http://localhost:3001

## 🔧 Manual Setup (Alternative)

If the automated script doesn't work:

```bash
# 1. Generate Prisma client
npm run prisma:generate

# 2. Create database tables
npx prisma db push --accept-data-loss

# 3. Seed data
npm run prisma:seed

# 4. Start application
npm run dev
```

## 📊 Database Contents After Setup

Your database will contain:
- **6 Categories** with subcategories
- **284 Parts** with specifications
- **334 Assemblies** (including 154 pegboard kit combinations)
- **6 Users** with different roles
- **4 QC Templates** with 150+ checklist items

## 🏗️ Architecture Overview

- **Frontend**: Next.js 15 on port 3005
- **Backend**: Node.js API on port 3001  
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT

## 🔑 Default Users

After seeding, you can login with these test users:

| Username | Role | Password |
|----------|------|----------|
| admin | ADMIN | (check seed script) |
| production | PRODUCTION_COORDINATOR | (check seed script) |
| qc | QC_PERSON | (check seed script) |

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull --print
```

### Schema Sync Issues
```bash
# Force sync schema
npx prisma db push --accept-data-loss
```

### Seeding Failures
```bash
# Clear and re-seed
npx prisma migrate reset --force
```

### Port Conflicts
Update ports in `.env.local`:
```bash
PORT=3002  # Backend port
NEXT_PUBLIC_API_URL=http://localhost:3006  # If frontend port changes
```

## 📁 Important Files

- `prisma/schema.prisma` - Database schema
- `scripts/seed.js` - Data seeding script
- `.env.local` - Your environment configuration
- `setup-database.sh` - Automated setup script

## 🔄 Working Across Environments

1. **Save your .env.local** - This contains your specific database settings
2. **Use the setup script** - `./setup-database.sh` works on any PostgreSQL instance
3. **Schema is version controlled** - Prisma schema and migrations are in Git
4. **Data is portable** - Seeding script recreates all necessary data

Your codebase is now fully portable across different PostgreSQL instances! 🎉