---
title: "Database Schema Requirements"
description: "The API requires two schemas:"
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "database"
audience:
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# Database Schema Requirements

This document describes the database schema required for the OSM Notes API to function.

## Table of Contents

- [Overview](#overview)
- [Schema: public](#schema-public)
- [Schema: dwh](#schema-dwh)
- [Minimum Data Requirements](#minimum-data-requirements)
- [Creating the Schema](#creating-the-schema)

---

## Overview

The API requires two schemas:

1. **`public` schema**: Contains raw OSM notes data
   - `notes` - OSM notes
   - `note_comments` - Comments on notes
   - `note_comments_text` - Text content of comments
   - `users` - OSM users (optional, used for JOINs)

2. **`dwh` schema**: Contains pre-aggregated analytics data (production only)
   - `datamartUsers` - User analytics
   - `datamartCountries` - Country analytics
   - `datamartGlobal` - Global analytics

**Note**: For local testing (`osm_notes_api_test`), only the `public` schema is required. The `dwh` schema is typically only available in production (`osm_notes_dwh`).

---

## Schema: public

### Table: `public.notes`

Stores OSM notes data.

**Required Columns**:
```sql
CREATE TABLE IF NOT EXISTS public.notes (
  note_id INTEGER PRIMARY KEY,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  status VARCHAR(20) NOT NULL,  -- 'open', 'closed', 'hidden'
  created_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP NULL,
  id_user INTEGER NULL,
  id_country INTEGER NULL
);
```

**Column Descriptions**:
- `note_id`: Primary key, unique note identifier
- `latitude`: Note latitude (-90 to 90)
- `longitude`: Note longitude (-180 to 180)
- `status`: Note status ('open', 'closed', 'hidden')
- `created_at`: When the note was created
- `closed_at`: When the note was closed (NULL if still open)
- `id_user`: OSM user ID who created the note (nullable)
- `id_country`: Country ID where the note is located (nullable)

**Indexes** (created by `scripts/create_indexes.sql`):
- Primary key on `note_id` (automatic)
- Index on `status`
- Index on `id_country`
- Index on `id_user`
- Index on `created_at DESC`
- Composite indexes for common filter combinations

### Table: `public.note_comments`

Stores comments on notes.

**Required Columns**:
```sql
CREATE TABLE IF NOT EXISTS public.note_comments (
  comment_id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL,
  user_id INTEGER NULL,
  action VARCHAR(50) NOT NULL,  -- 'opened', 'closed', 'commented', 'reopened', 'hidden'
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (note_id) REFERENCES public.notes(note_id) ON DELETE CASCADE
);
```

**Column Descriptions**:
- `comment_id`: Primary key, unique comment identifier
- `note_id`: Foreign key to `notes.note_id`
- `user_id`: OSM user ID who made the comment (nullable)
- `action`: Type of action ('opened', 'closed', 'commented', 'reopened', 'hidden')
- `created_at`: When the comment was created

**Indexes**:
- Primary key on `comment_id` (automatic)
- Index on `note_id` (critical for JOINs)
- Index on `created_at` (for ORDER BY)
- Composite index on `(note_id, created_at)` (for queries with ORDER BY)

### Table: `public.note_comments_text`

Stores the text content of comments (separate table for large text).

**Required Columns**:
```sql
CREATE TABLE IF NOT EXISTS public.note_comments_text (
  comment_id INTEGER PRIMARY KEY,
  text TEXT NULL,
  FOREIGN KEY (comment_id) REFERENCES public.note_comments(comment_id) ON DELETE CASCADE
);
```

**Column Descriptions**:
- `comment_id`: Primary key, foreign key to `note_comments.comment_id`
- `text`: Comment text content (nullable, can be empty)

**Indexes**:
- Primary key on `comment_id` (automatic)

### Table: `public.users` (Optional)

Stores OSM user information. This table is optional but recommended for better performance.

**Required Columns**:
```sql
CREATE TABLE IF NOT EXISTS public.users (
  user_id INTEGER PRIMARY KEY,
  username VARCHAR(255) NULL
);
```

**Column Descriptions**:
- `user_id`: Primary key, OSM user ID
- `username`: OSM username (nullable)

**Indexes**:
- Primary key on `user_id` (automatic)

---

## Schema: dwh

The `dwh` schema contains pre-aggregated analytics data. This schema is typically only available in production (`osm_notes_dwh`). For local testing, endpoints that use this schema will return 404 or 500 errors.

### Table: `dwh.datamartUsers`

Pre-aggregated user analytics.

**Required Columns**:
```sql
CREATE TABLE IF NOT EXISTS dwh.datamartUsers (
  dimension_user_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  username VARCHAR(255) NULL,
  history_whole_open INTEGER DEFAULT 0,
  history_whole_closed INTEGER DEFAULT 0,
  history_whole_commented INTEGER DEFAULT 0,
  avg_days_to_resolution NUMERIC(10, 2) NULL,
  resolution_rate NUMERIC(5, 4) NULL,
  user_response_time NUMERIC(10, 2) NULL,
  days_since_last_action INTEGER NULL,
  applications_used JSONB NULL,
  collaboration_patterns JSONB NULL,
  countries_open_notes JSONB NULL,
  hashtags JSONB NULL,
  date_starting_creating_notes DATE NULL,
  date_starting_solving_notes DATE NULL,
  last_year_activity TEXT NULL,
  working_hours_of_week_opening JSONB NULL,
  activity_by_year JSONB NULL
);
```

**Indexes**:
- Primary key on `dimension_user_id` (automatic)
- Unique index on `user_id` (critical for lookups)

### Table: `dwh.datamartCountries`

Pre-aggregated country analytics.

**Required Columns**:
```sql
CREATE TABLE IF NOT EXISTS dwh.datamartCountries (
  dimension_country_id INTEGER PRIMARY KEY,
  country_id INTEGER NOT NULL UNIQUE,
  country_name VARCHAR(255) NULL,
  country_name_en VARCHAR(255) NULL,
  country_name_es VARCHAR(255) NULL,
  iso_alpha2 CHAR(2) NULL,
  history_whole_open INTEGER DEFAULT 0,
  history_whole_closed INTEGER DEFAULT 0,
  avg_days_to_resolution NUMERIC(10, 2) NULL,
  resolution_rate NUMERIC(5, 4) NULL,
  notes_health_score NUMERIC(5, 2) NULL,
  new_vs_resolved_ratio NUMERIC(10, 4) NULL,
  notes_backlog_size INTEGER NULL,
  notes_created_last_30_days INTEGER NULL,
  notes_resolved_last_30_days INTEGER NULL,
  users_open_notes JSONB NULL,
  applications_used JSONB NULL,
  hashtags JSONB NULL,
  activity_by_year JSONB NULL,
  working_hours_of_week_opening JSONB NULL
);
```

**Indexes**:
- Primary key on `dimension_country_id` (automatic)
- Unique index on `country_id` (critical for lookups)

### Table: `dwh.datamartGlobal`

Pre-aggregated global analytics (single row).

**Required Columns**:
```sql
CREATE TABLE IF NOT EXISTS dwh.datamartGlobal (
  dimension_global_id INTEGER PRIMARY KEY,
  history_whole_open INTEGER DEFAULT 0,
  history_whole_closed INTEGER DEFAULT 0,
  currently_open_count INTEGER NULL,
  avg_days_to_resolution NUMERIC(10, 2) NULL,
  resolution_rate NUMERIC(5, 4) NULL,
  notes_created_last_30_days INTEGER NULL,
  notes_resolved_last_30_days INTEGER NULL,
  active_users_count INTEGER NULL,
  notes_backlog_size INTEGER NULL,
  applications_used JSONB NULL,
  top_countries JSONB NULL
);
```

**Note**: This table typically contains only one row with global statistics.

---

## Minimum Data Requirements

### For Basic Functionality

To test the API endpoints, you need at minimum:

1. **At least 1 note** in `public.notes`:
   ```sql
   INSERT INTO public.notes (note_id, latitude, longitude, status, created_at)
   VALUES (1, 40.7128, -74.0060, 'open', NOW());
   ```

2. **At least 1 comment** (optional, for testing comments endpoint):
   ```sql
   INSERT INTO public.note_comments (comment_id, note_id, action, created_at)
   VALUES (1, 1, 'opened', NOW());
   ```

### For Full Testing

For comprehensive testing, you should have:

1. **Multiple notes** with different statuses:
   - At least 5-10 notes with status 'open'
   - At least 5-10 notes with status 'closed'
   - Notes with different countries (`id_country`)
   - Notes with different users (`id_user`)

2. **Multiple comments**:
   - At least 2-3 comments per note
   - Comments with different actions
   - Comments with text content

3. **Users table** (optional but recommended):
   - At least the users referenced in notes and comments

### For Production

In production (`osm_notes_dwh`), you need:

1. **All `public` schema tables** with real OSM data
2. **All `dwh` schema tables** with pre-aggregated analytics:
   - `datamartUsers` with user statistics
   - `datamartCountries` with country statistics
   - `datamartGlobal` with global statistics (1 row)

---

## Creating the Schema

### Option 1: Using OSM-Notes-Ingestion Hybrid Script (Recommended)

**This is the recommended approach** as it ensures all projects use the same mock data:

```bash
# Load mock data using OSM-Notes-Ingestion's hybrid script
./scripts/load_mock_data.sh

# Or with custom database settings
./scripts/load_mock_data.sh --db-name osm_notes_api_test --db-user $(whoami)
```

This script:
- Uses the same mock data generation as OSM-Notes-Ingestion
- Creates all required tables and indexes
- Inserts mock notes, comments, and countries
- Ensures consistency across all projects

**Prerequisites**:
- OSM-Notes-Ingestion repository cloned (default: `../OSM-Notes-Ingestion`)
- PostgreSQL database exists: `createdb osm_notes_api_test`
- PostGIS extension installed: `CREATE EXTENSION IF NOT EXISTS postgis;`

### Option 2: Using the Provided Scripts

A script is provided to create the schema structure:

```bash
# For local testing
psql -U $(whoami) -d osm_notes_api_test -f scripts/create_schema.sql

# Insert sample data
psql -U $(whoami) -d osm_notes_api_test -f scripts/insert_sample_data.sql

# Create indexes
psql -U $(whoami) -d osm_notes_api_test -f scripts/create_indexes.sql

# For production
psql -h $DB_HOST -U $DB_USER -d osm_notes_dwh -f scripts/create_schema.sql
```

### Option 3: Manual Creation

See the SQL definitions above for each table.

### Option 4: Import from Existing Database

If you have an existing OSM Notes database, you can export and import:

```bash
# Export schema
pg_dump -h $SOURCE_HOST -U $SOURCE_USER -d $SOURCE_DB \
  --schema-only --schema=public --schema=dwh > schema.sql

# Import to test database
psql -U $(whoami) -d osm_notes_api_test -f schema.sql

# Export data (sample)
pg_dump -h $SOURCE_HOST -U $SOURCE_USER -d $SOURCE_DB \
  --data-only --schema=public -t notes -t note_comments \
  --rows-per-insert=1000 > sample_data.sql

# Import sample data
psql -U $(whoami) -d osm_notes_api_test -f sample_data.sql
```

---

## Data Sources

The data typically comes from:

1. **OSM Notes API**: Raw notes and comments from OpenStreetMap
2. **OSM Notes Ingestion**: Processed and stored in `public` schema
3. **OSM Notes Analytics**: Aggregated data in `dwh` schema

For local testing, you can:
- Use sample/test data
- Import a subset of production data
- Generate synthetic test data

---

## Verification

After creating the schema, verify it's correct:

```bash
# Check table existence
psql -U $(whoami) -d osm_notes_api_test -f scripts/check_db_requirements.sql

# Check indexes
psql -U $(whoami) -d osm_notes_api_test -c "
  SELECT schemaname, tablename, indexname 
  FROM pg_indexes 
  WHERE schemaname IN ('public', 'dwh')
  ORDER BY schemaname, tablename;
"
```

---

## Related Documentation

- [Installation Guide](INSTALLATION.md) - Installation instructions
- [Performance Guide](PERFORMANCE.md) - Index recommendations
- [API Reference](API.md) - API endpoint documentation
- [OSM-Notes-Ingestion](https://github.com/OSM-Notes/OSM-Notes-Ingestion) - Data ingestion repository

---

## Quick Start: Loading Mock Data

The fastest way to get started with mock data:

```bash
# 1. Ensure database exists
createdb osm_notes_api_test

# 2. Load mock data using OSM-Notes-Ingestion hybrid script
./scripts/load_mock_data.sh

# 3. Verify data was loaded
psql -d osm_notes_api_test -c "SELECT COUNT(*) FROM notes;"
psql -d osm_notes_api_test -c "SELECT COUNT(*) FROM countries;"

# 4. Run API tests
npm test

# 5. Start the API
npm start
```

This ensures you're using the same mock data as OSM-Notes-Ingestion tests.

---

**Last Updated**: 2025-12-27

