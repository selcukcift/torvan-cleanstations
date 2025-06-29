#!/bin/bash

# Database Backup Script for CleanStation Application
# Creates a complete backup of the PostgreSQL database with all data and schema

set -e

# Configuration
DB_NAME="torvan-db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="./database-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/torvan-db_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 CleanStation Database Backup Tool${NC}"
echo -e "${BLUE}=====================================${NC}"

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}📁 Creating backup directory: $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_DIR"
fi

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ Error: pg_dump not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Test database connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
if ! PGPASSWORD=postgres psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
    echo -e "${RED}❌ Error: Cannot connect to database. Please check your connection settings.${NC}"
    echo -e "${RED}   Database: $DB_NAME${NC}"
    echo -e "${RED}   Host: $DB_HOST:$DB_PORT${NC}"
    echo -e "${RED}   User: $DB_USER${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Create backup
echo -e "${YELLOW}💾 Creating database backup...${NC}"
echo -e "${BLUE}   Source: ${DB_NAME}@${DB_HOST}:${DB_PORT}${NC}"
echo -e "${BLUE}   Output: ${BACKUP_FILE}${NC}"

PGPASSWORD=postgres pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    --encoding=UTF8 \
    --no-password \
    --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database backup created successfully${NC}"
    
    # Get backup file size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}   File size: $BACKUP_SIZE${NC}"
    
    # Compress the backup
    echo -e "${YELLOW}🗜️  Compressing backup...${NC}"
    gzip "$BACKUP_FILE"
    
    if [ -f "$COMPRESSED_FILE" ]; then
        COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
        echo -e "${GREEN}✅ Backup compressed successfully${NC}"
        echo -e "${GREEN}   Compressed size: $COMPRESSED_SIZE${NC}"
        echo -e "${GREEN}   Final file: $COMPRESSED_FILE${NC}"
        
        # Create a backup info file
        INFO_FILE="${BACKUP_DIR}/backup_info_${TIMESTAMP}.txt"
        cat > "$INFO_FILE" << EOF
CleanStation Database Backup Information
=======================================
Backup Date: $(date)
Database Name: $DB_NAME
Database Host: $DB_HOST:$DB_PORT
Database User: $DB_USER
Original Size: $BACKUP_SIZE
Compressed Size: $COMPRESSED_SIZE
Backup File: $COMPRESSED_FILE
Backup Command: pg_dump --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --dbname=$DB_NAME --clean --if-exists --create --format=plain --encoding=UTF8

Restore Instructions:
1. Ensure PostgreSQL is installed and running on target system
2. Create database user if needed: createuser -s postgres
3. Run restore script: ./scripts/restore-database.sh $COMPRESSED_FILE
   OR manually: gunzip -c $COMPRESSED_FILE | psql -U postgres

Migration Package Contents Needed:
- This backup file ($COMPRESSED_FILE)
- package.json (for dependencies)
- prisma/schema.prisma (for schema validation)
- .env.template (for environment setup)
- All migration files in prisma/migrations/
EOF
        
        echo -e "${GREEN}📋 Backup info saved to: $INFO_FILE${NC}"
        
    else
        echo -e "${RED}❌ Error: Failed to compress backup${NC}"
        exit 1
    fi
    
else
    echo -e "${RED}❌ Error: Database backup failed${NC}"
    exit 1
fi

# Show recent backups
echo -e "\n${BLUE}📁 Recent backups in $BACKUP_DIR:${NC}"
ls -lht "$BACKUP_DIR"/*.gz 2>/dev/null | head -5 || echo "No previous backups found"

# Clean up old backups (keep last 10)
echo -e "\n${YELLOW}🧹 Cleaning up old backups (keeping last 10)...${NC}"
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
    REMOVE_COUNT=$((BACKUP_COUNT - 10))
    ls -t "$BACKUP_DIR"/*.gz | tail -n "$REMOVE_COUNT" | xargs rm -f
    echo -e "${GREEN}   Removed $REMOVE_COUNT old backup(s)${NC}"
else
    echo -e "${GREEN}   No cleanup needed (${BACKUP_COUNT} backups)${NC}"
fi

echo -e "\n${GREEN}🎉 Backup completed successfully!${NC}"
echo -e "${BLUE}📦 Ready for migration to new computer${NC}"
echo -e "${BLUE}   Transfer file: $COMPRESSED_FILE${NC}"
echo -e "${BLUE}   Next steps: Run ./scripts/migrate-to-new-computer.sh for complete migration package${NC}"