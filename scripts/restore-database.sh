#!/bin/bash

# Database Restore Script for CleanStation Application
# Restores a PostgreSQL database backup created by backup-database.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 CleanStation Database Restore Tool${NC}"
echo -e "${BLUE}====================================${NC}"

# Configuration (can be overridden by environment variables)
DB_NAME=${DB_NAME:-"torvan-db"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_PASSWORD=${DB_PASSWORD:-"postgres"}

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: No backup file specified${NC}"
    echo -e "${YELLOW}Usage: $0 <backup_file.sql.gz> [options]${NC}"
    echo -e "${YELLOW}Example: $0 ./database-backups/torvan-db_backup_20240629_143000.sql.gz${NC}"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo -e "  --db-name=NAME     Database name (default: torvan-db)"
    echo -e "  --db-user=USER     Database user (default: postgres)"
    echo -e "  --db-host=HOST     Database host (default: localhost)"
    echo -e "  --db-port=PORT     Database port (default: 5432)"
    echo -e "  --db-password=PASS Database password (default: postgres)"
    echo -e "  --skip-verification Skip post-restore verification"
    echo -e "  --force            Skip confirmation prompts"
    exit 1
fi

BACKUP_FILE="$1"
shift

# Parse additional arguments
SKIP_VERIFICATION=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --db-name=*)
            DB_NAME="${1#*=}"
            shift
            ;;
        --db-user=*)
            DB_USER="${1#*=}"
            shift
            ;;
        --db-host=*)
            DB_HOST="${1#*=}"
            shift
            ;;
        --db-port=*)
            DB_PORT="${1#*=}"
            shift
            ;;
        --db-password=*)
            DB_PASSWORD="${1#*=}"
            shift
            ;;
        --skip-verification)
            SKIP_VERIFICATION=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate backup file
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Restore Configuration:${NC}"
echo -e "${BLUE}   Backup File: $BACKUP_FILE${NC}"
echo -e "${BLUE}   Database: $DB_NAME${NC}"
echo -e "${BLUE}   Host: $DB_HOST:$DB_PORT${NC}"
echo -e "${BLUE}   User: $DB_USER${NC}"

# Check file extension and determine if it's compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    COMPRESSED=true
    echo -e "${YELLOW}📦 Detected compressed backup file${NC}"
elif [[ "$BACKUP_FILE" == *.sql ]]; then
    COMPRESSED=false
    echo -e "${YELLOW}📄 Detected uncompressed SQL file${NC}"
else
    echo -e "${RED}❌ Error: Unsupported file format. Expected .sql or .sql.gz${NC}"
    exit 1
fi

# Check required tools
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

if ! command -v createdb &> /dev/null; then
    echo -e "${RED}❌ Error: createdb not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

if [ "$COMPRESSED" = true ] && ! command -v gunzip &> /dev/null; then
    echo -e "${RED}❌ Error: gunzip not found. Please install gzip tools.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"

# Test PostgreSQL connection
echo -e "${YELLOW}🔍 Testing PostgreSQL connection...${NC}"
export PGPASSWORD="$DB_PASSWORD"

if ! psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
    echo -e "${RED}❌ Error: Cannot connect to PostgreSQL server.${NC}"
    echo -e "${RED}   Please check:${NC}"
    echo -e "${RED}   - PostgreSQL is running${NC}"
    echo -e "${RED}   - Connection settings are correct${NC}"
    echo -e "${RED}   - User credentials are valid${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL connection successful${NC}"

# Check if database exists and warn about overwrite
DB_EXISTS=false
if psql -h "$DB_HOST" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    DB_EXISTS=true
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' already exists${NC}"
    
    if [ "$FORCE" = false ]; then
        echo -e "${RED}❌ This will completely replace the existing database!${NC}"
        echo -e "${YELLOW}   All current data will be lost.${NC}"
        read -p "Are you sure you want to continue? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            echo -e "${BLUE}Operation cancelled by user${NC}"
            exit 0
        fi
    else
        echo -e "${YELLOW}   Force mode enabled - proceeding with restore${NC}"
    fi
fi

# Backup existing database if it exists
if [ "$DB_EXISTS" = true ]; then
    echo -e "${YELLOW}💾 Creating backup of existing database...${NC}"
    EXISTING_BACKUP="./database-backups/pre-restore-backup-$(date +"%Y%m%d_%H%M%S").sql.gz"
    mkdir -p ./database-backups
    
    if pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" | gzip > "$EXISTING_BACKUP"; then
        echo -e "${GREEN}✅ Existing database backed up to: $EXISTING_BACKUP${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to backup existing database, but continuing...${NC}"
    fi
fi

# Restore database
echo -e "${YELLOW}🔄 Restoring database from backup...${NC}"

if [ "$COMPRESSED" = true ]; then
    echo -e "${BLUE}   Decompressing and restoring...${NC}"
    if gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -U "$DB_USER" -d postgres; then
        echo -e "${GREEN}✅ Database restored successfully${NC}"
    else
        echo -e "${RED}❌ Error: Database restore failed${NC}"
        exit 1
    fi
else
    echo -e "${BLUE}   Restoring from SQL file...${NC}"
    if psql -h "$DB_HOST" -U "$DB_USER" -d postgres -f "$BACKUP_FILE"; then
        echo -e "${GREEN}✅ Database restored successfully${NC}"
    else
        echo -e "${RED}❌ Error: Database restore failed${NC}"
        exit 1
    fi
fi

# Post-restore verification
if [ "$SKIP_VERIFICATION" = false ]; then
    echo -e "${YELLOW}🔍 Verifying restored database...${NC}"
    
    # Check if database exists
    if ! psql -h "$DB_HOST" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        echo -e "${RED}❌ Error: Database '$DB_NAME' not found after restore${NC}"
        exit 1
    fi
    
    # Check if key tables exist
    EXPECTED_TABLES=("Part" "Assembly" "Order" "User" "QCTemplate")
    MISSING_TABLES=()
    
    for table in "${EXPECTED_TABLES[@]}"; do
        if ! psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\dt" | grep -q "$table"; then
            MISSING_TABLES+=("$table")
        fi
    done
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All expected tables found${NC}"
        
        # Count records in key tables
        echo -e "${BLUE}📊 Database statistics:${NC}"
        for table in "${EXPECTED_TABLES[@]}"; do
            COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "0")
            echo -e "${BLUE}   $table: $COUNT records${NC}"
        done
        
    else
        echo -e "${YELLOW}⚠️  Some expected tables are missing: ${MISSING_TABLES[*]}${NC}"
        echo -e "${YELLOW}   This might be normal if the backup is from an earlier schema version${NC}"
    fi
    
    # Check if Prisma migrations table exists
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\dt" | grep -q "_prisma_migrations"; then
        MIGRATION_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM \"_prisma_migrations\"" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ Prisma migrations table found with $MIGRATION_COUNT migrations${NC}"
    else
        echo -e "${YELLOW}⚠️  Prisma migrations table not found${NC}"
        echo -e "${YELLOW}   You may need to run: npx prisma migrate resolve --applied$(NC)"
    fi
fi

# Final instructions
echo -e "\n${GREEN}🎉 Database restore completed successfully!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "${BLUE}   1. Update your .env file with correct DATABASE_URL${NC}"
echo -e "${BLUE}   2. Run: npx prisma generate (to regenerate Prisma client)${NC}"
echo -e "${BLUE}   3. Run: npm install (to install dependencies)${NC}"
echo -e "${BLUE}   4. Run: npm run dev (to start the application)${NC}"

if [ "$SKIP_VERIFICATION" = false ]; then
    echo -e "${BLUE}   5. Verify application functionality${NC}"
fi

echo -e "\n${BLUE}💡 Troubleshooting:${NC}"
echo -e "${BLUE}   - If you see migration errors: npx prisma migrate resolve --applied <migration_name>${NC}"
echo -e "${BLUE}   - If you need to reset migrations: npx prisma migrate reset${NC}"
echo -e "${BLUE}   - For connection issues, check your DATABASE_URL in .env${NC}"

# Cleanup environment variable
unset PGPASSWORD