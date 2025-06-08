# PostgreSQL Connection Diagnosis

## Current Status

1. **PostgreSQL Service**: ✅ Running (PostgreSQL 17 on port 5432)
2. **Database URL**: `postgresql://postgres:postgres@localhost:5432/torvan-db?schema=public`
3. **Connection Test**: ❌ Failed - Authentication error

## Issue

The application cannot connect to PostgreSQL due to authentication failure. The error indicates that the password "postgres" is not accepted for the user "postgres".

## Possible Solutions

### Option 1: Fix PostgreSQL Authentication (Recommended)

Run the following commands in a terminal with sudo access:

```bash
# 1. Switch to postgres user and set password
sudo -u postgres psql
ALTER USER postgres PASSWORD 'postgres';
\q

# 2. Verify the database exists
sudo -u postgres psql -l | grep torvan

# 3. If database doesn't exist, create it
sudo -u postgres createdb torvan-db
```

### Option 2: Use Trust Authentication (Less Secure)

Edit PostgreSQL's pg_hba.conf file to allow trust authentication for local connections:

```bash
# 1. Find pg_hba.conf location
sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;'

# 2. Edit the file (usually /etc/postgresql/17/main/pg_hba.conf)
sudo nano /etc/postgresql/17/main/pg_hba.conf

# 3. Change this line:
local   all             postgres                                peer

# To:
local   all             postgres                                trust

# 4. Also change:
host    all             all             127.0.0.1/32            scram-sha-256

# To:
host    all             all             127.0.0.1/32            trust

# 5. Reload PostgreSQL
sudo systemctl reload postgresql
```

### Option 3: Create Database with Different Credentials

If you have a different PostgreSQL user that works:

```bash
# 1. Update .env.local with working credentials
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/torvan-db?schema=public"

# 2. Create database if needed
createdb torvan-db

# 3. Run migrations
npm run prisma:migrate
```

## Quick Test After Fix

Once you've applied one of the solutions above, test the connection:

```bash
# Test with psql
PGPASSWORD=postgres psql -h localhost -U postgres -d torvan-db -c "SELECT 'Connected!' as status;"

# Or test with the Node.js script
cd "/media/selcuk/project files/Clean-stations"
node test-db-connection.js
```

## Next Steps

After fixing the authentication issue:

1. Run database migrations: `npm run prisma:migrate`
2. Seed the database: `npm run prisma:seed`
3. Start the application: `npm run dev`