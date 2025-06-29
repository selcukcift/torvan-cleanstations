#!/bin/bash

# Database Migration Verification Script for CleanStation Application
# Comprehensive verification of database migration and application setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🔍 CleanStation Migration Verification Tool${NC}"
echo -e "${PURPLE}===========================================${NC}"

# Configuration
DB_NAME=${DB_NAME:-"torvan-db"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}

# Load environment if .env exists
if [ -f ".env" ]; then
    echo -e "${BLUE}📄 Loading environment from .env file...${NC}"
    set -a
    source .env
    set +a
    
    # Extract database details from DATABASE_URL if available
    if [ -n "$DATABASE_URL" ]; then
        # Parse DATABASE_URL: postgresql://user:pass@host:port/dbname
        if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/([^?]+) ]]; then
            DB_USER="${BASH_REMATCH[1]}"
            DB_PASSWORD="${BASH_REMATCH[2]}"
            DB_HOST="${BASH_REMATCH[3]}"
            DB_PORT="${BASH_REMATCH[4]}"
            DB_NAME="${BASH_REMATCH[5]}"
        fi
    fi
fi

# Parse arguments
VERBOSE=false
SKIP_APP_TESTS=false
QUICK_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --skip-app-tests)
            SKIP_APP_TESTS=true
            shift
            ;;
        --quick)
            QUICK_CHECK=true
            shift
            ;;
        --help)
            echo -e "${BLUE}Usage: $0 [options]${NC}"
            echo -e "${BLUE}Options:${NC}"
            echo -e "  --verbose          Show detailed output"
            echo -e "  --skip-app-tests   Skip application-level tests"
            echo -e "  --quick            Run only essential checks"
            echo -e "  --help             Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🔧 Verification Configuration:${NC}"
echo -e "${BLUE}   Database: $DB_NAME@$DB_HOST:$DB_PORT${NC}"
echo -e "${BLUE}   User: $DB_USER${NC}"
echo -e "${BLUE}   Verbose: $([ "$VERBOSE" = true ] && echo "Yes" || echo "No")${NC}"
echo -e "${BLUE}   Quick Check: $([ "$QUICK_CHECK" = true ] && echo "Yes" || echo "No")${NC}"

# Verification results tracking
declare -A RESULTS
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Helper functions
log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${CYAN}   $1${NC}"
    fi
}

check_result() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case $result in
        "PASS")
            echo -e "${GREEN}✅ $test_name${NC}"
            [ -n "$message" ] && log_verbose "$message"
            RESULTS["$test_name"]="PASS"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            ;;
        "FAIL")
            echo -e "${RED}❌ $test_name${NC}"
            [ -n "$message" ] && echo -e "${RED}   $message${NC}"
            RESULTS["$test_name"]="FAIL"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  $test_name${NC}"
            [ -n "$message" ] && echo -e "${YELLOW}   $message${NC}"
            RESULTS["$test_name"]="WARN"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            ;;
    esac
}

# Test database connection
test_database_connection() {
    echo -e "\n${PURPLE}🗄️  Database Connection Tests${NC}"
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        check_result "PostgreSQL Client" "FAIL" "psql command not found. Please install PostgreSQL client tools."
        return
    fi
    
    check_result "PostgreSQL Client" "PASS" "psql command available"
    
    # Test connection
    export PGPASSWORD="${DB_PASSWORD:-postgres}"
    
    if psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
        check_result "PostgreSQL Connection" "PASS" "Successfully connected to PostgreSQL server"
    else
        check_result "PostgreSQL Connection" "FAIL" "Cannot connect to PostgreSQL server at $DB_HOST:$DB_PORT"
        unset PGPASSWORD
        return
    fi
    
    # Check if target database exists
    if psql -h "$DB_HOST" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        check_result "Target Database" "PASS" "Database '$DB_NAME' exists"
    else
        check_result "Target Database" "FAIL" "Database '$DB_NAME' does not exist"
        unset PGPASSWORD
        return
    fi
    
    unset PGPASSWORD
}

# Test database schema
test_database_schema() {
    echo -e "\n${PURPLE}📊 Database Schema Tests${NC}"
    
    export PGPASSWORD="${DB_PASSWORD:-postgres}"
    
    # Expected core tables from CleanStation
    EXPECTED_TABLES=(
        "User"
        "Order"
        "Part"
        "Assembly"
        "AssemblyComponent"
        "QCTemplate"
        "QCTask"
        "InventoryItem"
        "ServiceOrder"
        "TaskTemplate"
        "_prisma_migrations"
    )
    
    MISSING_TABLES=()
    FOUND_TABLES=()
    
    for table in "${EXPECTED_TABLES[@]}"; do
        if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\dt" 2>/dev/null | grep -q "\"$table\""; then
            FOUND_TABLES+=("$table")
            log_verbose "Found table: $table"
        else
            MISSING_TABLES+=("$table")
        fi
    done
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
        check_result "Core Tables" "PASS" "All ${#EXPECTED_TABLES[@]} expected tables found"
    elif [ ${#MISSING_TABLES[@]} -le 2 ]; then
        check_result "Core Tables" "WARN" "Missing ${#MISSING_TABLES[@]} tables: ${MISSING_TABLES[*]}"
    else
        check_result "Core Tables" "FAIL" "Missing ${#MISSING_TABLES[@]} tables: ${MISSING_TABLES[*]}"
    fi
    
    # Check Prisma migrations
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\dt" 2>/dev/null | grep -q "_prisma_migrations"; then
        MIGRATION_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM \"_prisma_migrations\"" 2>/dev/null || echo "0")
        if [ "$MIGRATION_COUNT" -gt 0 ]; then
            check_result "Prisma Migrations" "PASS" "$MIGRATION_COUNT migrations found"
        else
            check_result "Prisma Migrations" "WARN" "Migrations table exists but is empty"
        fi
    else
        check_result "Prisma Migrations" "FAIL" "Prisma migrations table not found"
    fi
    
    unset PGPASSWORD
}

# Test data integrity
test_data_integrity() {
    echo -e "\n${PURPLE}🔢 Data Integrity Tests${NC}"
    
    if [ "$QUICK_CHECK" = true ]; then
        echo -e "${YELLOW}   Skipping data integrity tests in quick mode${NC}"
        return
    fi
    
    export PGPASSWORD="${DB_PASSWORD:-postgres}"
    
    # Count records in key tables
    TABLES_TO_CHECK=("User" "Order" "Part" "Assembly" "QCTemplate")
    
    for table in "${TABLES_TO_CHECK[@]}"; do
        if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "\dt" 2>/dev/null | grep -q "\"$table\""; then
            COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "ERROR")
            
            if [ "$COUNT" = "ERROR" ]; then
                check_result "$table Data" "FAIL" "Error counting records in $table"
            elif [ "$COUNT" -gt 0 ]; then
                check_result "$table Data" "PASS" "$COUNT records found"
            else
                check_result "$table Data" "WARN" "Table exists but is empty"
            fi
        fi
    done
    
    # Check for essential admin user
    ADMIN_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM \"User\" WHERE role = 'ADMIN'" 2>/dev/null || echo "0")
    
    if [ "$ADMIN_COUNT" -gt 0 ]; then
        check_result "Admin Users" "PASS" "$ADMIN_COUNT admin user(s) found"
    else
        check_result "Admin Users" "WARN" "No admin users found - you may need to create one"
    fi
    
    unset PGPASSWORD
}

# Test application environment
test_application_environment() {
    echo -e "\n${PURPLE}🚀 Application Environment Tests${NC}"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            check_result "Node.js Version" "PASS" "Node.js $(node --version) is compatible"
        else
            check_result "Node.js Version" "WARN" "Node.js v$NODE_VERSION may be too old (recommend 18+)"
        fi
    else
        check_result "Node.js Version" "FAIL" "Node.js not found"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        check_result "NPM" "PASS" "npm $(npm --version) available"
    else
        check_result "NPM" "FAIL" "npm not found"
    fi
    
    # Check essential files
    ESSENTIAL_FILES=("package.json" "next.config.js" "prisma/schema.prisma")
    
    for file in "${ESSENTIAL_FILES[@]}"; do
        if [ -f "$file" ]; then
            check_result "File: $file" "PASS" "File exists"
        else
            check_result "File: $file" "FAIL" "File missing"
        fi
    done
    
    # Check .env file
    if [ -f ".env" ]; then
        check_result "Environment File" "PASS" ".env file exists"
        
        # Check required environment variables
        REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "JWT_SECRET")
        
        for var in "${REQUIRED_VARS[@]}"; do
            if grep -q "^$var=" .env 2>/dev/null; then
                check_result "Env Var: $var" "PASS" "Variable is set"
            else
                check_result "Env Var: $var" "WARN" "Variable not found in .env"
            fi
        done
        
    else
        check_result "Environment File" "FAIL" ".env file missing"
    fi
    
    # Check node_modules
    if [ -d "node_modules" ]; then
        check_result "Dependencies" "PASS" "node_modules directory exists"
        
        # Check specific dependencies
        KEY_DEPS=("next" "prisma" "@prisma/client" "react")
        
        for dep in "${KEY_DEPS[@]}"; do
            if [ -d "node_modules/$dep" ]; then
                log_verbose "Found dependency: $dep"
            else
                check_result "Dependency: $dep" "WARN" "May need to run npm install"
                break
            fi
        done
        
    else
        check_result "Dependencies" "FAIL" "node_modules not found - run npm install"
    fi
}

# Test Prisma setup
test_prisma_setup() {
    echo -e "\n${PURPLE}🔧 Prisma Setup Tests${NC}"
    
    # Check if Prisma CLI is available
    if command -v prisma &> /dev/null || npx prisma --version &> /dev/null; then
        check_result "Prisma CLI" "PASS" "Prisma CLI available"
    else
        check_result "Prisma CLI" "FAIL" "Prisma CLI not found"
        return
    fi
    
    # Check Prisma client generation
    if [ -d "node_modules/.prisma" ] || [ -d "prisma/generated" ]; then
        check_result "Prisma Client" "PASS" "Prisma client appears to be generated"
    else
        check_result "Prisma Client" "WARN" "Prisma client may need generation - run: npx prisma generate"
    fi
    
    # Test Prisma connection (if not quick check)
    if [ "$QUICK_CHECK" = false ] && [ "$SKIP_APP_TESTS" = false ]; then
        if timeout 10 npx prisma db pull --preview-feature --schema=prisma/schema.prisma 2>/dev/null; then
            check_result "Prisma Connection" "PASS" "Prisma can connect to database"
        else
            check_result "Prisma Connection" "WARN" "Prisma connection test timed out or failed"
        fi
    fi
}

# Test application startup (optional)
test_application_startup() {
    if [ "$SKIP_APP_TESTS" = true ]; then
        echo -e "\n${YELLOW}⏭️  Skipping application startup tests${NC}"
        return
    fi
    
    echo -e "\n${PURPLE}🏃 Application Startup Tests${NC}"
    
    # Check if we can build the application
    if [ "$QUICK_CHECK" = false ]; then
        echo -e "${BLUE}   Testing Next.js build...${NC}"
        if timeout 60 npm run build > /tmp/build.log 2>&1; then
            check_result "Application Build" "PASS" "Next.js build successful"
        else
            check_result "Application Build" "FAIL" "Build failed - check npm run build"
            log_verbose "Build log available at /tmp/build.log"
        fi
    fi
    
    # Test linting
    if command -v eslint &> /dev/null || [ -f "node_modules/.bin/eslint" ]; then
        if timeout 30 npm run lint > /tmp/lint.log 2>&1; then
            check_result "Code Linting" "PASS" "ESLint checks passed"
        else
            check_result "Code Linting" "WARN" "Linting issues found - check npm run lint"
        fi
    fi
}

# Main verification process
echo -e "\n${CYAN}🔍 Starting verification process...${NC}"

test_database_connection
test_database_schema
test_data_integrity
test_application_environment
test_prisma_setup
test_application_startup

# Generate summary report
echo -e "\n${PURPLE}📊 Verification Summary${NC}"
echo -e "${PURPLE}======================${NC}"

echo -e "${BLUE}Total Checks: $TOTAL_CHECKS${NC}"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"

# Calculate success percentage
if [ $TOTAL_CHECKS -gt 0 ]; then
    SUCCESS_RATE=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
    echo -e "${BLUE}Success Rate: ${SUCCESS_RATE}%${NC}"
else
    echo -e "${RED}No checks were performed${NC}"
    exit 1
fi

# Determine overall result
if [ $FAILED_CHECKS -eq 0 ]; then
    if [ $WARNING_CHECKS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All checks passed! Migration appears successful.${NC}"
        OVERALL_RESULT="SUCCESS"
    else
        echo -e "\n${YELLOW}✅ Migration mostly successful with some warnings.${NC}"
        OVERALL_RESULT="SUCCESS_WITH_WARNINGS"
    fi
else
    echo -e "\n${RED}❌ Migration verification failed. Please address the issues above.${NC}"
    OVERALL_RESULT="FAILURE"
fi

# Provide recommendations
echo -e "\n${BLUE}💡 Recommendations:${NC}"

if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "${RED}   Critical Issues:${NC}"
    for test_name in "${!RESULTS[@]}"; do
        if [ "${RESULTS[$test_name]}" = "FAIL" ]; then
            echo -e "${RED}   - Fix: $test_name${NC}"
        fi
    done
fi

if [ $WARNING_CHECKS -gt 0 ]; then
    echo -e "${YELLOW}   Warnings to Address:${NC}"
    for test_name in "${!RESULTS[@]}"; do
        if [ "${RESULTS[$test_name]}" = "WARN" ]; then
            echo -e "${YELLOW}   - Review: $test_name${NC}"
        fi
    done
fi

echo -e "\n${BLUE}📋 Next Steps:${NC}"
case $OVERALL_RESULT in
    "SUCCESS")
        echo -e "${GREEN}   ✅ Your migration is complete and ready to use!${NC}"
        echo -e "${BLUE}   - Start the application: npm run dev${NC}"
        echo -e "${BLUE}   - Access at: http://localhost:3005${NC}"
        ;;
    "SUCCESS_WITH_WARNINGS")
        echo -e "${YELLOW}   ⚠️  Address the warnings above, then:${NC}"
        echo -e "${BLUE}   - Start the application: npm run dev${NC}"
        echo -e "${BLUE}   - Monitor for any runtime issues${NC}"
        ;;
    "FAILURE")
        echo -e "${RED}   ❌ Fix the critical issues above before proceeding${NC}"
        echo -e "${BLUE}   - Check database connection and configuration${NC}"
        echo -e "${BLUE}   - Ensure all required files are present${NC}"
        echo -e "${BLUE}   - Run: npm install to install dependencies${NC}"
        ;;
esac

# Set exit code based on result
case $OVERALL_RESULT in
    "SUCCESS") exit 0 ;;
    "SUCCESS_WITH_WARNINGS") exit 0 ;;
    "FAILURE") exit 1 ;;
esac