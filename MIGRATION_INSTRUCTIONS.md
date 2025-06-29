# CleanStation Database Migration Guide

Complete guide for migrating your CleanStation PostgreSQL database to a new computer.

## 🚀 Quick Start (TL;DR)

1. **On current computer**: Run `./scripts/migrate-to-new-computer.sh`
2. **Transfer** the generated archive to new computer
3. **On new computer**: Extract and run `./setup-new-computer.sh`
4. **Configure** `.env` file and run `npm run dev`

## 📋 Prerequisites

### Current Computer (Source)
- Working CleanStation application with PostgreSQL database
- Git (to ensure all changes are committed)

### New Computer (Target)
- **Node.js** (version 18 or higher)
- **PostgreSQL** (version 13 or higher)
- **Git** (for version control)
- **Basic tools**: tar, gzip (usually pre-installed on Linux/macOS)

## 🔧 Detailed Migration Process

### Phase 1: Preparation (Current Computer)

#### 1. Verify Current Setup
```bash
# Check database connection
npm run test:db

# Ensure all changes are committed
git status
git add -A
git commit -m "Pre-migration checkpoint"
```

#### 2. Create Migration Package
```bash
# Option 1: Full automated migration package
./scripts/migrate-to-new-computer.sh

# Option 2: Database backup only
./scripts/backup-database.sh

# Option 3: Custom migration with options
./scripts/migrate-to-new-computer.sh --include-node-modules --exclude-uploads
```

**Migration package includes:**
- Complete database backup (compressed)
- All source code and configuration files
- Prisma schema and migrations
- Setup and restore scripts
- Detailed instructions

### Phase 2: Transfer

#### Method 1: Archive File (Recommended)
```bash
# The script creates: cleanstation-migration-YYYYMMDD_HHMMSS.tar.gz
# Transfer this single file to your new computer
scp cleanstation-migration-*.tar.gz user@newcomputer:/path/to/destination/
```

#### Method 2: Directory Transfer
```bash
# If archive creation failed, transfer the directory
rsync -av migration-package-*/ user@newcomputer:/path/to/destination/
```

#### Method 3: Cloud Storage
```bash
# Upload to cloud storage (Google Drive, Dropbox, etc.)
# Then download on the new computer
```

### Phase 3: Setup (New Computer)

#### 1. Extract Migration Package
```bash
# If using archive
tar -xzf cleanstation-migration-*.tar.gz
cd migration-package-*/

# If using directory, just cd into it
cd migration-package-*/
```

#### 2. Automated Setup
```bash
# Run the automated setup script
./setup-new-computer.sh
```

**Or follow manual steps below:**

#### 3. Manual Setup Steps

##### Install Dependencies
```bash
npm install
```

##### Setup PostgreSQL Database

**Option A: Using Docker (Recommended)**
```bash
docker run --name torvan-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=torvan-db \
  -p 5432:5432 \
  -d postgres:15
```

**Option B: Local PostgreSQL**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install postgresql postgresql-contrib

# macOS with Homebrew
brew install postgresql
brew services start postgresql

# Create database
sudo -u postgres createuser -s postgres
sudo -u postgres createdb torvan-db
```

##### Configure Environment
```bash
# Copy and edit environment file
cp .env.template .env
nano .env  # or use your preferred editor
```

**Update `.env` with your settings:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/torvan-db?schema=public"
NEXTAUTH_SECRET="your-nextauth-secret"
JWT_SECRET="your-jwt-secret"
# ... other settings
```

##### Restore Database
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Find your backup file
ls *.sql.gz

# Restore database
./scripts/restore-database.sh your-backup-file.sql.gz
```

##### Setup Prisma
```bash
# Generate Prisma client
npx prisma generate

# If you encounter migration issues
npx prisma migrate resolve --applied $(ls prisma/migrations)
```

##### Verify Setup
```bash
# Test database connection
npm run test:db

# Start development server
npm run dev
```

## 🎯 Verification Checklist

After migration, verify these work correctly:

### Database Verification
- [ ] Database connection successful
- [ ] All tables present with correct data
- [ ] User authentication works
- [ ] Orders data intact
- [ ] QC templates and data preserved
- [ ] File uploads accessible (if migrated)

### Application Verification
- [ ] Application starts without errors (`npm run dev`)
- [ ] Login with existing credentials works
- [ ] Dashboard displays correctly
- [ ] Order creation/viewing works
- [ ] QC interface functions properly
- [ ] All user roles work correctly

### Development Environment
- [ ] TypeScript compilation successful
- [ ] Linting passes (`npm run lint`)
- [ ] Tests run successfully (`npm test`)
- [ ] Build process works (`npm run build`)

## 🚨 Troubleshooting

### Database Issues

#### Connection Problems
```bash
# Check PostgreSQL status
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# Test manual connection
psql -U postgres -d torvan-db -h localhost

# Check if database exists
psql -U postgres -l | grep torvan-db
```

#### Migration Issues
```bash
# If migrations are out of sync
npx prisma migrate status

# Reset and restore (nuclear option)
npx prisma migrate reset --force
./scripts/restore-database.sh your-backup.sql.gz --force
```

#### Permission Issues
```bash
# Fix PostgreSQL permissions
sudo -u postgres psql -c "ALTER USER postgres WITH SUPERUSER;"

# Fix file permissions
chmod -R 755 scripts/
sudo chown -R $USER:$USER .
```

### Application Issues

#### Dependency Problems
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check for security vulnerabilities
npm audit fix
```

#### Environment Issues
```bash
# Verify environment variables
cat .env | grep -v "^#" | grep -v "^$"

# Check required variables
echo $DATABASE_URL
```

#### Build Issues
```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Check TypeScript issues
npx tsc --noEmit
```

### File System Issues

#### Missing Files
```bash
# Check if essential files exist
ls -la package.json prisma/schema.prisma

# Re-extract migration package if needed
tar -xzf ../cleanstation-migration-*.tar.gz --overwrite
```

## 🔄 Common Migration Scenarios

### Scenario 1: Same Operating System
- Straightforward migration using all scripts
- Usually no compatibility issues

### Scenario 2: Different Operating Systems
- May need to adjust file paths in `.env`
- Check for OS-specific dependencies
- Ensure compatible PostgreSQL versions

### Scenario 3: Different PostgreSQL Versions
- Usually backward compatible
- May need to update connection parameters
- Test thoroughly after migration

### Scenario 4: Cloud to Local (or vice versa)
- Update DATABASE_URL for new environment
- Check network connectivity requirements
- Adjust security settings if needed

## 🛡️ Best Practices

### Before Migration
1. **Test current setup** thoroughly
2. **Commit all changes** to version control
3. **Document any custom configurations**
4. **Backup important files** separately

### During Migration
1. **Use automated scripts** when possible
2. **Verify each step** before proceeding
3. **Keep detailed logs** of any errors
4. **Test connections** before proceeding

### After Migration
1. **Run full verification** checklist
2. **Test all user workflows**
3. **Update documentation** if needed
4. **Backup new setup** immediately

## 📞 Support

If you encounter issues not covered in this guide:

1. **Check logs**: Application logs and PostgreSQL logs
2. **Verify environment**: Double-check all environment variables
3. **Test components**: Database connection, application startup, etc.
4. **Refer to project docs**: Check CLAUDE.md for project-specific guidance

## 🔧 Advanced Options

### Custom Database Configuration

If you need different database settings:

```bash
# Custom restore with different settings
./scripts/restore-database.sh backup.sql.gz \
  --db-name=custom-db \
  --db-user=myuser \
  --db-host=myhost \
  --db-port=5433
```

### Selective Migration

```bash
# Create migration package with specific options
./scripts/migrate-to-new-computer.sh \
  --include-node-modules \
  --exclude-uploads
```

### Environment Customization

Create a custom `.env` based on your specific needs:

```env
# Development
NODE_ENV=development
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3005

# Database
DATABASE_URL="postgresql://user:pass@host:port/db?schema=public"

# Authentication
NEXTAUTH_SECRET="your-secret-here"
JWT_SECRET="your-jwt-secret-here"
NEXTAUTH_URL="http://localhost:3005"

# Optional: Clerk Auth (if using)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
```

---

**Happy migrating! 🚀**

Remember: Take your time, verify each step, and don't hesitate to start over if something goes wrong. The migration scripts are designed to be safe and repeatable.