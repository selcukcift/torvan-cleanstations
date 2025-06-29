#!/bin/bash

# Environment Setup Helper for CleanStation Application
# Helps configure environment variables for new installations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🔧 CleanStation Environment Setup Helper${NC}"
echo -e "${PURPLE}=======================================${NC}"

# Configuration
ENV_FILE=".env"
TEMPLATE_FILE=".env.template"
BACKUP_FILE=".env.backup"

# Parse arguments
INTERACTIVE=true
FORCE=false
AUTO_GENERATE_SECRETS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --non-interactive)
            INTERACTIVE=false
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --auto-generate-secrets)
            AUTO_GENERATE_SECRETS=true
            shift
            ;;
        --help)
            echo -e "${BLUE}Usage: $0 [options]${NC}"
            echo -e "${BLUE}Options:${NC}"
            echo -e "  --non-interactive       Run without prompts (use defaults)"
            echo -e "  --force                 Overwrite existing .env file"
            echo -e "  --auto-generate-secrets Generate random secrets automatically"
            echo -e "  --help                  Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}❌ Template file not found: $TEMPLATE_FILE${NC}"
    echo -e "${YELLOW}Creating a basic template...${NC}"
    
    cat > "$TEMPLATE_FILE" << 'EOF'
# Local PostgreSQL Environment Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/torvan-db?schema=public"

# JWT Secret (development only - change in production)
JWT_SECRET="dev-jwt-secret-key-for-local-development-only"

# NextAuth Secret (used by NextAuth.js)
NEXTAUTH_SECRET="dev-nextauth-secret-key-for-local-development-only"
NEXTAUTH_URL="http://localhost:3005"

# Backend Configuration
PORT=3001
NODE_ENV=development

# Frontend Configuration (Next.js uses port 3005)
NEXT_PUBLIC_API_URL=http://localhost:3005

# Development Flags
SKIP_AUTH_IN_DEV=false
AUTO_LOGIN_DEV_USER=admin

# Enable detailed logging in development
DEBUG_AUTH=true
EOF
    
    echo -e "${GREEN}✅ Basic template created${NC}"
fi

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    if [ "$FORCE" = false ]; then
        echo -e "${YELLOW}⚠️  Environment file already exists: $ENV_FILE${NC}"
        
        if [ "$INTERACTIVE" = true ]; then
            read -p "Do you want to overwrite it? (y/N): " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo -e "${BLUE}Operation cancelled. Use --force to overwrite automatically.${NC}"
                exit 0
            fi
        else
            echo -e "${BLUE}Use --force to overwrite automatically${NC}"
            exit 0
        fi
    fi
    
    # Backup existing file
    echo -e "${YELLOW}💾 Backing up existing .env to $BACKUP_FILE${NC}"
    cp "$ENV_FILE" "$BACKUP_FILE"
fi

# Generate secrets function
generate_secret() {
    local length=${1:-32}
    if command -v openssl &> /dev/null; then
        openssl rand -hex "$length"
    elif command -v node &> /dev/null; then
        node -e "console.log(require('crypto').randomBytes($length).toString('hex'))"
    else
        # Fallback to date-based random string
        date +%s | sha256sum | base64 | head -c "$length"
    fi
}

# Start environment configuration
echo -e "\n${BLUE}📋 Environment Configuration${NC}"

# Copy template to start
cp "$TEMPLATE_FILE" "$ENV_FILE"

# Collect configuration values
declare -A CONFIG

if [ "$INTERACTIVE" = true ]; then
    echo -e "\n${YELLOW}Please provide the following configuration values:${NC}"
    echo -e "${BLUE}(Press Enter to use default values)${NC}"
    
    # Database configuration
    echo -e "\n${PURPLE}📊 Database Configuration${NC}"
    
    read -p "Database host (default: localhost): " db_host
    CONFIG[DB_HOST]=${db_host:-localhost}
    
    read -p "Database port (default: 5432): " db_port
    CONFIG[DB_PORT]=${db_port:-5432}
    
    read -p "Database name (default: torvan-db): " db_name
    CONFIG[DB_NAME]=${db_name:-torvan-db}
    
    read -p "Database user (default: postgres): " db_user
    CONFIG[DB_USER]=${db_user:-postgres}
    
    read -s -p "Database password (default: postgres): " db_password
    echo
    CONFIG[DB_PASSWORD]=${db_password:-postgres}
    
    # Application configuration
    echo -e "\n${PURPLE}🚀 Application Configuration${NC}"
    
    read -p "Application URL (default: http://localhost:3005): " app_url
    CONFIG[APP_URL]=${app_url:-http://localhost:3005}
    
    read -p "API URL (default: http://localhost:3005): " api_url
    CONFIG[API_URL]=${api_url:-http://localhost:3005}
    
    # Security configuration
    echo -e "\n${PURPLE}🔒 Security Configuration${NC}"
    
    if [ "$AUTO_GENERATE_SECRETS" = true ]; then
        echo "Auto-generating secrets..."
        CONFIG[JWT_SECRET]=$(generate_secret 32)
        CONFIG[NEXTAUTH_SECRET]=$(generate_secret 32)
    else
        read -p "Generate random JWT secret? (Y/n): " -r
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            read -s -p "JWT Secret: " jwt_secret
            echo
            CONFIG[JWT_SECRET]=${jwt_secret:-$(generate_secret 32)}
        else
            CONFIG[JWT_SECRET]=$(generate_secret 32)
        fi
        
        read -p "Generate random NextAuth secret? (Y/n): " -r
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            read -s -p "NextAuth Secret: " nextauth_secret
            echo
            CONFIG[NEXTAUTH_SECRET]=${nextauth_secret:-$(generate_secret 32)}
        else
            CONFIG[NEXTAUTH_SECRET]=$(generate_secret 32)
        fi
    fi
    
    # Development settings
    echo -e "\n${PURPLE}🛠️  Development Settings${NC}"
    
    read -p "Node environment (default: development): " node_env
    CONFIG[NODE_ENV]=${node_env:-development}
    
    read -p "Enable debug logging? (Y/n): " -r
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        CONFIG[DEBUG_AUTH]="false"
    else
        CONFIG[DEBUG_AUTH]="true"
    fi
    
else
    # Non-interactive mode - use defaults
    echo -e "${BLUE}Using default configuration values...${NC}"
    
    CONFIG[DB_HOST]="localhost"
    CONFIG[DB_PORT]="5432"
    CONFIG[DB_NAME]="torvan-db"
    CONFIG[DB_USER]="postgres"
    CONFIG[DB_PASSWORD]="postgres"
    CONFIG[APP_URL]="http://localhost:3005"
    CONFIG[API_URL]="http://localhost:3005"
    CONFIG[NODE_ENV]="development"
    CONFIG[DEBUG_AUTH]="true"
    
    if [ "$AUTO_GENERATE_SECRETS" = true ]; then
        CONFIG[JWT_SECRET]=$(generate_secret 32)
        CONFIG[NEXTAUTH_SECRET]=$(generate_secret 32)
    else
        CONFIG[JWT_SECRET]="dev-jwt-secret-key-for-local-development-only"
        CONFIG[NEXTAUTH_SECRET]="dev-nextauth-secret-key-for-local-development-only"
    fi
fi

# Build DATABASE_URL
DATABASE_URL="postgresql://${CONFIG[DB_USER]}:${CONFIG[DB_PASSWORD]}@${CONFIG[DB_HOST]}:${CONFIG[DB_PORT]}/${CONFIG[DB_NAME]}?schema=public"

# Update .env file
echo -e "\n${YELLOW}🔧 Updating environment file...${NC}"

# Create new .env content
cat > "$ENV_FILE" << EOF
# CleanStation Environment Configuration
# Generated on $(date)

# Database Configuration
DATABASE_URL="$DATABASE_URL"

# Security Secrets
JWT_SECRET="${CONFIG[JWT_SECRET]}"
NEXTAUTH_SECRET="${CONFIG[NEXTAUTH_SECRET]}"
NEXTAUTH_URL="${CONFIG[APP_URL]}"

# Application Configuration
PORT=3001
NODE_ENV=${CONFIG[NODE_ENV]}
NEXT_PUBLIC_API_URL=${CONFIG[API_URL]}

# Development Settings
SKIP_AUTH_IN_DEV=false
AUTO_LOGIN_DEV_USER=admin
DEBUG_AUTH=${CONFIG[DEBUG_AUTH]}

# Clerk Authentication (optional - configure if using Clerk)
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
# CLERK_SECRET_KEY=
# NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
# NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
# NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
# NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"
# CLERK_WEBHOOK_SECRET=
EOF

echo -e "${GREEN}✅ Environment file updated successfully${NC}"

# Validate configuration
echo -e "\n${YELLOW}🔍 Validating configuration...${NC}"

# Check database connection
echo -e "${BLUE}   Testing database connection...${NC}"
export PGPASSWORD="${CONFIG[DB_PASSWORD]}"

if psql -h "${CONFIG[DB_HOST]}" -U "${CONFIG[DB_USER]}" -d postgres -c '\q' 2>/dev/null; then
    echo -e "${GREEN}   ✅ Database connection successful${NC}"
    
    # Check if target database exists
    if psql -h "${CONFIG[DB_HOST]}" -U "${CONFIG[DB_USER]}" -lqt | cut -d \| -f 1 | grep -qw "${CONFIG[DB_NAME]}"; then
        echo -e "${GREEN}   ✅ Target database '${CONFIG[DB_NAME]}' exists${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Target database '${CONFIG[DB_NAME]}' does not exist${NC}"
        echo -e "${BLUE}   You may need to create it or restore from backup${NC}"
    fi
else
    echo -e "${RED}   ❌ Database connection failed${NC}"
    echo -e "${YELLOW}   Please check your database configuration${NC}"
fi

unset PGPASSWORD

# Check Node.js environment
echo -e "${BLUE}   Checking Node.js compatibility...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo -e "${GREEN}   ✅ Node.js $(node --version) is compatible${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Node.js version $NODE_VERSION may be too old (recommend 18+)${NC}"
    fi
else
    echo -e "${RED}   ❌ Node.js not found${NC}"
fi

# Display configuration summary
echo -e "\n${PURPLE}📋 Configuration Summary${NC}"
echo -e "${PURPLE}========================${NC}"
echo -e "${BLUE}Database: ${CONFIG[DB_NAME]}@${CONFIG[DB_HOST]}:${CONFIG[DB_PORT]}${NC}"
echo -e "${BLUE}User: ${CONFIG[DB_USER]}${NC}"
echo -e "${BLUE}Application URL: ${CONFIG[APP_URL]}${NC}"
echo -e "${BLUE}Environment: ${CONFIG[NODE_ENV]}${NC}"
echo -e "${BLUE}Debug Mode: ${CONFIG[DEBUG_AUTH]}${NC}"

# Show next steps
echo -e "\n${GREEN}🎉 Environment setup completed successfully!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "${BLUE}   1. Verify database connection: npm run test:db${NC}"
echo -e "${BLUE}   2. Install dependencies: npm install${NC}"
echo -e "${BLUE}   3. Generate Prisma client: npx prisma generate${NC}"
echo -e "${BLUE}   4. Run migrations (if needed): npx prisma migrate deploy${NC}"
echo -e "${BLUE}   5. Start application: npm run dev${NC}"

if [ -f "$BACKUP_FILE" ]; then
    echo -e "\n${YELLOW}💾 Previous environment backed up to: $BACKUP_FILE${NC}"
fi

echo -e "\n${BLUE}🔧 Configuration file: $ENV_FILE${NC}"
echo -e "${YELLOW}⚠️  Keep your .env file secure and never commit it to version control${NC}"