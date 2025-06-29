#!/bin/bash

# Complete Migration Package Creator for CleanStation Application
# Creates a comprehensive migration package for moving to a new computer

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}📦 CleanStation Complete Migration Package Creator${NC}"
echo -e "${PURPLE}=================================================${NC}"

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MIGRATION_DIR="./migration-package-${TIMESTAMP}"
DB_BACKUP_FILE=""
INCLUDE_NODE_MODULES=false
INCLUDE_UPLOADS=true

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --include-node-modules)
            INCLUDE_NODE_MODULES=true
            shift
            ;;
        --exclude-uploads)
            INCLUDE_UPLOADS=false
            shift
            ;;
        --help)
            echo -e "${BLUE}Usage: $0 [options]${NC}"
            echo -e "${BLUE}Options:${NC}"
            echo -e "  --include-node-modules  Include node_modules in migration package"
            echo -e "  --exclude-uploads       Exclude uploads/files from migration package"
            echo -e "  --help                  Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🔧 Configuration:${NC}"
echo -e "${BLUE}   Migration Directory: $MIGRATION_DIR${NC}"
echo -e "${BLUE}   Include node_modules: $([ "$INCLUDE_NODE_MODULES" = true ] && echo "Yes" || echo "No")${NC}"
echo -e "${BLUE}   Include uploads: $([ "$INCLUDE_UPLOADS" = true ] && echo "Yes" || echo "No")${NC}"

# Create migration directory
echo -e "\n${YELLOW}📁 Creating migration package directory...${NC}"
mkdir -p "$MIGRATION_DIR"

# Step 1: Create database backup
echo -e "\n${YELLOW}💾 Step 1: Creating database backup...${NC}"
if [ -f "./scripts/backup-database.sh" ]; then
    ./scripts/backup-database.sh
    
    # Find the most recent backup
    LATEST_BACKUP=$(ls -t ./database-backups/*.gz 2>/dev/null | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        DB_BACKUP_FILE=$(basename "$LATEST_BACKUP")
        cp "$LATEST_BACKUP" "$MIGRATION_DIR/"
        echo -e "${GREEN}✅ Database backup copied: $DB_BACKUP_FILE${NC}"
    else
        echo -e "${RED}❌ No database backup found${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Backup script not found. Please ensure backup-database.sh exists${NC}"
    exit 1
fi

# Step 2: Copy essential project files
echo -e "\n${YELLOW}📋 Step 2: Copying essential project files...${NC}"

# Core configuration files
echo -e "${BLUE}   Copying configuration files...${NC}"
ESSENTIAL_FILES=(
    "package.json"
    "package-lock.json"
    "next.config.js"
    ".env.template"
    "tailwind.config.js"
    "tsconfig.json"
    "jest.config.js"
    "playwright.config.ts"
    ".gitignore"
    ".eslintrc.json"
    "CLAUDE.md"
    "README.md"
)

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$MIGRATION_DIR/"
        echo -e "${GREEN}     ✓ $file${NC}"
    else
        echo -e "${YELLOW}     ⚠ $file (not found)${NC}"
    fi
done

# Step 3: Copy Prisma files
echo -e "\n${BLUE}   Copying Prisma configuration...${NC}"
if [ -d "prisma" ]; then
    cp -r prisma "$MIGRATION_DIR/"
    echo -e "${GREEN}     ✓ prisma/ directory${NC}"
else
    echo -e "${RED}     ❌ prisma/ directory not found${NC}"
    exit 1
fi

# Step 4: Copy source code
echo -e "\n${BLUE}   Copying source code...${NC}"
SOURCE_DIRECTORIES=(
    "app"
    "components"
    "lib"
    "stores"
    "types"
    "styles"
    "public"
)

for dir in "${SOURCE_DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$MIGRATION_DIR/"
        echo -e "${GREEN}     ✓ $dir/${NC}"
    else
        echo -e "${YELLOW}     ⚠ $dir/ (not found)${NC}"
    fi
done

# Step 5: Copy scripts
echo -e "\n${BLUE}   Copying scripts...${NC}"
if [ -d "scripts" ]; then
    cp -r scripts "$MIGRATION_DIR/"
    echo -e "${GREEN}     ✓ scripts/ directory${NC}"
else
    echo -e "${YELLOW}     ⚠ scripts/ directory (not found)${NC}"
fi

# Step 6: Copy test files
echo -e "\n${BLUE}   Copying test files...${NC}"
TEST_DIRECTORIES=(
    "tests"
    "__tests__"
    "test"
    "e2e"
)

for dir in "${TEST_DIRECTORIES[@]}"; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$MIGRATION_DIR/"
        echo -e "${GREEN}     ✓ $dir/${NC}"
    fi
done

# Step 7: Copy uploads/files (optional)
if [ "$INCLUDE_UPLOADS" = true ]; then
    echo -e "\n${BLUE}   Copying uploads and files...${NC}"
    UPLOAD_DIRECTORIES=(
        "uploads"
        "public/uploads"
        "files"
        "documents"
    )
    
    for dir in "${UPLOAD_DIRECTORIES[@]}"; do
        if [ -d "$dir" ]; then
            cp -r "$dir" "$MIGRATION_DIR/"
            echo -e "${GREEN}     ✓ $dir/${NC}"
        fi
    done
fi

# Step 8: Copy node_modules (optional)
if [ "$INCLUDE_NODE_MODULES" = true ]; then
    echo -e "\n${BLUE}   Copying node_modules...${NC}"
    if [ -d "node_modules" ]; then
        echo -e "${YELLOW}     This may take several minutes...${NC}"
        cp -r node_modules "$MIGRATION_DIR/"
        echo -e "${GREEN}     ✓ node_modules/${NC}"
    else
        echo -e "${YELLOW}     ⚠ node_modules/ (not found)${NC}"
    fi
fi

# Step 9: Create migration instructions
echo -e "\n${YELLOW}📝 Step 3: Creating migration instructions...${NC}"
cat > "$MIGRATION_DIR/MIGRATION_INSTRUCTIONS.md" << 'EOF'
# CleanStation Migration Instructions

## Prerequisites

Before starting, ensure the new computer has:

1. **Node.js** (version 18 or higher)
   ```bash
   node --version
   npm --version
   ```

2. **PostgreSQL** (version 13 or higher)
   ```bash
   psql --version
   ```

3. **Git** (for version control)
   ```bash
   git --version
   ```

## Migration Steps

### 1. Extract Migration Package

```bash
# If you received a compressed package
tar -xzf migration-package-*.tar.gz
cd migration-package-*
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install
```

### 3. Setup PostgreSQL Database

#### Option A: Using Docker (Recommended)
```bash
# Start PostgreSQL with Docker
docker run --name torvan-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=torvan-db \
  -p 5432:5432 \
  -d postgres:15
```

#### Option B: Local PostgreSQL Installation
```bash
# Create database and user
sudo -u postgres createuser -s postgres
sudo -u postgres createdb torvan-db
```

### 4. Configure Environment

```bash
# Copy environment template
cp .env.template .env

# Edit .env file with your settings
nano .env
```

**Important**: Update the `DATABASE_URL` in your `.env` file:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/torvan-db?schema=public"
```

### 5. Restore Database

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Restore the database backup
./scripts/restore-database.sh [BACKUP_FILE_NAME].sql.gz
```

### 6. Setup Prisma

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations (if needed)
npx prisma migrate deploy
```

### 7. Verify Installation

```bash
# Test database connection
npm run test:db

# Run development server
npm run dev
```

The application should now be running at `http://localhost:3005`

### 8. Final Verification

1. **Login Test**: Try logging in with existing credentials
2. **Database Test**: Check if your data is present
3. **Functionality Test**: Test key features like order creation, QC, etc.

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection manually
psql -U postgres -d torvan-db -h localhost
```

### Migration Issues
```bash
# Reset migrations if needed
npx prisma migrate reset --force

# Re-run database restore
./scripts/restore-database.sh [BACKUP_FILE].sql.gz --force
```

### Permission Issues
```bash
# Fix script permissions
chmod +x scripts/*.sh

# Fix file ownership (if needed)
sudo chown -R $USER:$USER .
```

### Missing Dependencies
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Post-Migration Checklist

- [ ] Database restored successfully
- [ ] Application starts without errors
- [ ] Can login with existing credentials
- [ ] All data is present and correct
- [ ] File uploads work (if applicable)
- [ ] Email notifications work (if configured)
- [ ] All user roles and permissions work correctly

## Support

If you encounter issues:

1. Check the console logs: `npm run dev`
2. Check database logs: `docker logs torvan-postgres` (if using Docker)
3. Verify environment variables in `.env`
4. Ensure all dependencies are installed: `npm list`

For additional help, refer to the project's CLAUDE.md file or documentation.
EOF

# Step 10: Create setup script for new computer
echo -e "\n${BLUE}   Creating automated setup script...${NC}"
cat > "$MIGRATION_DIR/setup-new-computer.sh" << EOF
#!/bin/bash

# Automated setup script for CleanStation migration
set -e

echo "🚀 CleanStation Migration Setup"
echo "==============================="

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=\$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "\$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version \$NODE_VERSION is too old. Please install Node.js 18+."
    exit 1
fi

echo "✅ Node.js \$(node --version) found"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL first."
    exit 1
fi

echo "✅ PostgreSQL \$(psql --version | cut -d' ' -f3) found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment
if [ ! -f ".env" ]; then
    echo "🔧 Setting up environment file..."
    cp .env.template .env
    echo "⚠️  Please edit .env file with your database settings before continuing."
    read -p "Press Enter after you've configured .env file..."
fi

# Generate Prisma client
echo "🏗️  Generating Prisma client..."
npx prisma generate

# Find backup file
BACKUP_FILE=\$(ls *.sql.gz 2>/dev/null | head -n1)
if [ -z "\$BACKUP_FILE" ]; then
    echo "❌ No database backup file found (*.sql.gz)"
    exit 1
fi

echo "💾 Found backup file: \$BACKUP_FILE"

# Restore database
echo "🔄 Restoring database..."
chmod +x scripts/*.sh
./scripts/restore-database.sh "\$BACKUP_FILE"

echo "🎉 Setup completed successfully!"
echo "🚀 You can now start the application with: npm run dev"
EOF

chmod +x "$MIGRATION_DIR/setup-new-computer.sh"

# Step 11: Create package info file
echo -e "\n${BLUE}   Creating package info file...${NC}"
cat > "$MIGRATION_DIR/PACKAGE_INFO.txt" << EOF
CleanStation Migration Package
=============================

Package Created: $(date)
Package Creator: $(whoami)@$(hostname)
Package Version: $TIMESTAMP

Contents:
- Database backup: $DB_BACKUP_FILE
- Complete source code
- Prisma schema and migrations
- Configuration files
- Setup scripts
- Migration instructions

Quick Start:
1. Run: ./setup-new-computer.sh
2. Edit: .env (configure database connection)
3. Run: npm run dev

For detailed instructions, see MIGRATION_INSTRUCTIONS.md
EOF

# Step 12: Create compressed archive (optional)
echo -e "\n${YELLOW}📦 Step 4: Creating compressed archive...${NC}"
ARCHIVE_NAME="cleanstation-migration-${TIMESTAMP}.tar.gz"

echo -e "${BLUE}   Compressing migration package...${NC}"
tar -czf "$ARCHIVE_NAME" -C . "$(basename "$MIGRATION_DIR")"

if [ -f "$ARCHIVE_NAME" ]; then
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_NAME" | cut -f1)
    echo -e "${GREEN}✅ Archive created: $ARCHIVE_NAME (${ARCHIVE_SIZE})${NC}"
else
    echo -e "${RED}❌ Failed to create archive${NC}"
fi

# Final summary
echo -e "\n${GREEN}🎉 Migration package created successfully!${NC}"
echo -e "${PURPLE}=================================================${NC}"
echo -e "${BLUE}📦 Package Directory: $MIGRATION_DIR${NC}"
echo -e "${BLUE}📦 Archive File: $ARCHIVE_NAME${NC}"
echo -e "${BLUE}💾 Database Backup: $DB_BACKUP_FILE${NC}"

echo -e "\n${YELLOW}📋 What to transfer to new computer:${NC}"
if [ -f "$ARCHIVE_NAME" ]; then
    echo -e "${GREEN}   Option 1 (Recommended): Transfer the archive file${NC}"
    echo -e "${GREEN}     → $ARCHIVE_NAME${NC}"
    echo -e "${BLUE}     → Extract with: tar -xzf $ARCHIVE_NAME${NC}"
else
    echo -e "${GREEN}   Transfer the entire directory:${NC}"
    echo -e "${GREEN}     → $MIGRATION_DIR${NC}"
fi

echo -e "\n${YELLOW}🚀 On the new computer:${NC}"
echo -e "${BLUE}   1. Extract/copy the migration package${NC}"
echo -e "${BLUE}   2. Run: ./setup-new-computer.sh${NC}"
echo -e "${BLUE}   3. Configure .env file${NC}"
echo -e "${BLUE}   4. Start application: npm run dev${NC}"

echo -e "\n${PURPLE}✨ Happy coding on your new computer! ✨${NC}"
EOF