---
title: "Database User Setup - Read-Only User for API"
description: "The OSM Notes API  to the database. It performs  (no INSERT, UPDATE, DELETE, CREATE, ALTER, DROP)."
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "database"
  - "installation"
audience:
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# Database User Setup - Read-Only User for API

This guide explains how to create a read-only database user for the OSM Notes API.

## Overview

The OSM Notes API **only needs read-only access** to the database. It performs **NO write operations** (no INSERT, UPDATE, DELETE, CREATE, ALTER, DROP).

**Confirmed**: All API operations use only `SELECT` queries. The API is completely read-only.

## Why Read-Only?

- **Security**: Prevents accidental or malicious data modification
- **Best Practice**: Principle of least privilege
- **Safety**: Cannot cause data loss or corruption
- **API Design**: The API is designed to only read analytics data

## Creating the Read-Only User

### Step 1: Connect to Database

Connect to the DWH database as a superuser or database owner:

```bash
# Connect as postgres superuser
psql -h $DB_HOST -U postgres -d osm_notes_dwh

# Or connect as database owner
psql -h $DB_HOST -U analytics_admin -d osm_notes_dwh
```

### Step 2: Run the Script

```bash
# From psql prompt
\i scripts/create_readonly_user.sql

# Or from command line
psql -h $DB_HOST -U postgres -d osm_notes_dwh -f scripts/create_readonly_user.sql
```

### Step 3: Set Password

**IMPORTANT**: The script creates the user with a placeholder password. You MUST set a secure password:

```sql
ALTER USER osm_notes_api_user WITH PASSWORD 'your_secure_password_here';
```

**Password Requirements**:
- Minimum 16 characters recommended
- Mix of uppercase, lowercase, numbers, and special characters
- Do not use dictionary words
- Store securely (use password manager)

### Step 4: Verify Permissions

Test that the user has correct permissions:

```bash
# Test connection
psql -h $DB_HOST -U osm_notes_api_user -d osm_notes_dwh -c "SELECT 1;"

# Test SELECT permission (should work)
psql -h $DB_HOST -U osm_notes_api_user -d osm_notes_dwh \
     -c "SELECT COUNT(*) FROM dwh.datamartUsers LIMIT 1;"

# Test INSERT is denied (should fail with permission denied)
psql -h $DB_HOST -U osm_notes_api_user -d osm_notes_dwh \
     -c "INSERT INTO dwh.datamartUsers (user_id) VALUES (999999);"
# Expected: ERROR: permission denied for table datamartUsers

# Test UPDATE is denied (should fail with permission denied)
psql -h $DB_HOST -U osm_notes_api_user -d osm_notes_dwh \
     -c "UPDATE dwh.datamartUsers SET username = 'test' WHERE user_id = 1;"
# Expected: ERROR: permission denied for table datamartUsers

# Test DELETE is denied (should fail with permission denied)
psql -h $DB_HOST -U osm_notes_api_user -d osm_notes_dwh \
     -c "DELETE FROM dwh.datamartUsers WHERE user_id = 1;"
# Expected: ERROR: permission denied for table datamartUsers
```

## Manual Creation (Alternative)

If you prefer to create the user manually:

```sql
-- Connect as superuser
psql -h $DB_HOST -U postgres -d osm_notes_dwh

-- Create user
CREATE USER osm_notes_api_user WITH PASSWORD 'your_secure_password_here';

-- Grant usage on schemas
GRANT USAGE ON SCHEMA dwh TO osm_notes_api_user;
GRANT USAGE ON SCHEMA public TO osm_notes_api_user;

-- Grant SELECT on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA dwh TO osm_notes_api_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO osm_notes_api_user;

-- Grant SELECT on future tables (for tables created later)
ALTER DEFAULT PRIVILEGES IN SCHEMA dwh GRANT SELECT ON TABLES TO osm_notes_api_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO osm_notes_api_user;
```

## Permissions Granted

The read-only user has:

✅ **Granted**:
- `USAGE` on schemas (`dwh`, `public`)
- `SELECT` on all tables in `dwh` schema
- `SELECT` on all tables in `public` schema (foreign tables via FDW)
- `SELECT` on future tables (via `ALTER DEFAULT PRIVILEGES`)

❌ **NOT Granted** (and not needed):
- `INSERT` - Cannot insert data
- `UPDATE` - Cannot update data
- `DELETE` - Cannot delete data
- `CREATE` - Cannot create tables/objects
- `ALTER` - Cannot modify schema
- `DROP` - Cannot drop objects
- `TRUNCATE` - Cannot truncate tables
- `EXECUTE` - Cannot execute functions (if any)

## Verification: API is Read-Only

**Confirmed by code review**:

All services in `src/services/` use only `SELECT` queries:
- ✅ `userService.ts` - Only SELECT
- ✅ `countryService.ts` - Only SELECT
- ✅ `noteService.ts` - Only SELECT
- ✅ `analyticsService.ts` - Only SELECT
- ✅ `searchService.ts` - Only SELECT
- ✅ `comparisonService.ts` - Only SELECT
- ✅ `trendsService.ts` - Only SELECT
- ✅ `hashtagService.ts` - Only SELECT
- ✅ `userRankingsService.ts` - Only SELECT
- ✅ `countryRankingsService.ts` - Only SELECT
- ✅ `advancedSearchService.ts` - Only SELECT

**No write operations found**: No INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, or TRUNCATE statements in any service file.

## Configuration

After creating the user, configure the API to use it:

**`.env` file**:
```env
DB_HOST=192.168.0.7
DB_PORT=5432
DB_NAME=osm_notes_dwh
DB_USER=osm_notes_api_user
DB_PASSWORD=your_secure_password_here
DB_MAX_CONNECTIONS=20
```

## Security Considerations

### Password Security

- **Never commit passwords** to version control
- **Use strong passwords** (16+ characters, mixed case, numbers, symbols)
- **Rotate passwords** periodically (every 90 days recommended)
- **Use different passwords** for different environments (dev, staging, production)

### Network Security

- **Restrict access**: Only allow connections from API server IP
- **Use SSL/TLS**: Enable `DB_SSL=true` in production
- **Firewall rules**: Block direct database access from internet

### PostgreSQL Configuration

**`pg_hba.conf`** (PostgreSQL host-based authentication):
```
# Allow API user only from API server IP
host    osm_notes_dwh    osm_notes_api_user    192.168.0.7/32    md5
```

**Connection limits** (optional):
```sql
-- Limit concurrent connections for API user
ALTER USER osm_notes_api_user WITH CONNECTION LIMIT 20;
```

## Troubleshooting

### Permission Denied Errors

If you get "permission denied" errors:

1. **Verify user exists**:
   ```sql
   SELECT usename FROM pg_user WHERE usename = 'osm_notes_api_user';
   ```

2. **Check schema permissions**:
   ```sql
   SELECT nspname, nspacl 
   FROM pg_namespace 
   WHERE nspname IN ('dwh', 'public');
   ```

3. **Check table permissions**:
   ```sql
   SELECT schemaname, tablename, tableowner
   FROM pg_tables
   WHERE schemaname = 'dwh'
   LIMIT 10;
   ```

4. **Re-grant permissions**:
   ```sql
   GRANT SELECT ON ALL TABLES IN SCHEMA dwh TO osm_notes_api_user;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO osm_notes_api_user;
   ```

### Connection Issues

If connection fails:

1. **Verify password**:
   ```bash
   psql -h $DB_HOST -U osm_notes_api_user -d osm_notes_dwh
   ```

2. **Check pg_hba.conf**: Ensure user is allowed to connect

3. **Check firewall**: Ensure port 5432 is accessible

4. **Check user exists**:
   ```sql
   SELECT usename FROM pg_user WHERE usename = 'osm_notes_api_user';
   ```

## Related Documentation

- [Installation Guide](Installation.md) - Complete installation instructions
- [Database Schema](Database_Schema.md) - Database schema documentation
- [Deployment Guide](Deployment.md) - Production deployment
- [Security Guide](security/Secrets.md) - Secrets management

---

**Last Updated**: 2025-12-28
