# Home PostgreSQL Setup Guide

This guide will help you recreate your complete Clean Stations database on your home PostgreSQL server.

## 🗄️ Current Database Summary

Your current database contains:
- **284 parts** and **334 assemblies** (including 154 pegboard kits)
- **6 users** with different roles (admin, production coordinator, QC person, etc.)
- **15 orders** including the working Order D14774586
- **4 QC templates** with 149 checklist items
- **Complete configurations** for all orders (basins, faucets, accessories)
- **Work instructions, task templates, and test procedures**
- **All schema migrations** and proper relationships

## 📋 Prerequisites

1. **PostgreSQL installed** on your home machine
2. **Node.js** (v18 or higher)
3. **Git** for cloning the repository

## 🚀 Step-by-Step Setup

### 1. Copy Project Files
```bash
# Copy the entire Clean-stations folder to your home machine
# Make sure to include the database-export.json file in the scripts folder
```

### 2. Install Dependencies
```bash
cd Clean-stations
npm install
```

### 3. Set Up PostgreSQL Database
```bash
# Create a new database
createdb clean_stations_home

# Or using psql:
psql -U postgres
CREATE DATABASE clean_stations_home;
\q
```

### 4. Configure Environment
Create a `.env` file (or copy from `.env.example`):

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/clean_stations_home"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Application
NODE_ENV="development"
```

### 5. Run Database Migrations
```bash
# Generate Prisma client
npx prisma generate

# Apply all database schema migrations
npx prisma migrate deploy

# Verify the schema
npx prisma db pull
```

### 6. Import All Data
```bash
# This will recreate ALL your data exactly as it was
node scripts/import-database-setup.js
```

### 7. Reset User Passwords (Important!)
```bash
# User passwords are not exported for security
# You'll need to reset them or create new ones
node scripts/create-test-users.js
```

### 8. Start the Application
```bash
npm run dev
```

## 🔧 Verification Steps

After setup, verify everything works:

1. **Check Database Connection**:
   ```bash
   npx prisma studio
   # Opens database browser at http://localhost:5555
   ```

2. **Test Login**:
   - Go to http://localhost:3000
   - Login with admin credentials

3. **Test Order D14774586**:
   - Navigate to orders
   - Open Order D14774586
   - Verify BOM generation works
   - Check procurement tab shows legs and casters

4. **Test QC Templates**:
   - Go to admin → QC Templates
   - Verify all 4 templates are present

## 📊 What Gets Imported

The import script will recreate:

- ✅ **6 users** (passwords need to be reset)
- ✅ **6 categories** and **46 subcategories**
- ✅ **284 parts** and **334 assemblies**
- ✅ **761 assembly components** (part relationships)
- ✅ **4 QC templates** with **149 checklist items**
- ✅ **Work instructions** and **task templates**
- ✅ **Test procedure templates**
- ✅ **All 15 orders** with complete configurations
- ✅ **Inventory items** and sample data

## 🔐 Default User Accounts

After import, reset passwords for these users:
- `admin` (ADMIN role)
- `prod_coord` (PRODUCTION_COORDINATOR)
- `qc_person` (QC_PERSON)
- `procurement` (PROCUREMENT_SPECIALIST)
- `assembler` (ASSEMBLER)
- `service` (SERVICE_DEPARTMENT)

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull
```

### Migration Issues
```bash
# Reset and reapply migrations
npx prisma migrate reset
npx prisma migrate deploy
```

### Data Import Issues
```bash
# Check if export file exists
ls -la scripts/database-export.json

# Re-run import with verbose logging
node scripts/import-database-setup.js
```

### Application Issues
```bash
# Clear Next.js cache
rm -rf .next

# Regenerate Prisma client
npx prisma generate

# Restart dev server
npm run dev
```

## 📱 Testing Your Setup

1. **Order Creation**: Create a new order and verify BOM generation
2. **QC Workflow**: Test QC template functionality
3. **Procurement**: Test the legs/casters procurement workflow
4. **User Roles**: Test different user role permissions

## 📝 Notes

- The exported data is from your current working system
- Order D14774586 has been fixed with real part numbers
- Procurement workflow for legs and casters works correctly
- All QC templates and workflows are functional
- The schema is completely up to date

## 🔄 Keeping Data in Sync

To sync data between home and work:
1. Run `node scripts/export-database-setup.js` on source system
2. Copy `database-export.json` to target system
3. Run `node scripts/import-database-setup.js` on target system

## 📞 Support

If you encounter issues:
1. Check the console logs
2. Verify database connection
3. Ensure all migrations are applied
4. Check that the export file exists and is valid JSON

Your home setup will be identical to your current working system!