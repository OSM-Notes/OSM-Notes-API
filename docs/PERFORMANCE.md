# Performance Optimization Guide

This document provides performance analysis, optimization recommendations, and index suggestions for the OSM Notes API.

## Table of Contents

- [Query Analysis](#query-analysis)
- [Index Recommendations](#index-recommendations)
- [Query Optimizations](#query-optimizations)
- [Performance Benchmarks](#performance-benchmarks)
- [Monitoring and Profiling](#monitoring-and-profiling)

---

## Query Analysis

### 1. Note Service Queries

#### `getNoteById` Query

**Current Query**:
```sql
SELECT
  n.note_id,
  n.latitude,
  n.longitude,
  n.status,
  n.created_at,
  n.closed_at,
  n.id_user,
  n.id_country,
  COUNT(DISTINCT nc.comment_id) as comments_count
FROM public.notes n
LEFT JOIN public.note_comments nc ON n.note_id = nc.note_id
WHERE n.note_id = $1
GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_user, n.id_country
```

**Analysis**:
- Uses LEFT JOIN with GROUP BY
- COUNT(DISTINCT) can be expensive on large tables
- Requires grouping all note columns

**Optimization Opportunities**:
- Use subquery or window function for comment count
- Ensure index on `notes.note_id` (primary key, should exist)
- Ensure index on `note_comments.note_id`

#### `getNoteComments` Query

**Current Query**:
```sql
SELECT
  nc.comment_id,
  nc.note_id,
  nc.user_id,
  u.username,
  nc.action,
  nc.created_at,
  nct.text
FROM public.note_comments nc
LEFT JOIN public.users u ON nc.user_id = u.user_id
LEFT JOIN public.note_comments_text nct ON nc.comment_id = nct.comment_id
WHERE nc.note_id = $1
ORDER BY nc.created_at ASC
```

**Analysis**:
- Multiple LEFT JOINs
- ORDER BY on potentially large result set
- Text field may be large

**Optimization Opportunities**:
- Index on `note_comments.note_id` (critical)
- Index on `note_comments.created_at` for ORDER BY
- Index on `users.user_id` (should exist as primary key)
- Consider pagination if comments can be numerous

#### `searchNotes` Query

**Current Query**:
```sql
SELECT
  n.note_id,
  n.latitude,
  n.longitude,
  n.status,
  n.created_at,
  n.closed_at,
  n.id_user,
  n.id_country,
  COUNT(DISTINCT nc.comment_id) as comments_count
FROM public.notes n
LEFT JOIN public.note_comments nc ON n.note_id = nc.note_id
WHERE [dynamic conditions]
GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_user, n.id_country
ORDER BY n.created_at DESC
LIMIT $N OFFSET $M
```

**Analysis**:
- Complex WHERE clause with multiple filter options
- Bounding box filter (spatial query)
- COUNT(DISTINCT) with GROUP BY
- ORDER BY on large dataset

**Optimization Opportunities**:
- Composite indexes for common filter combinations
- Spatial index (GIST) for bounding box queries
- Consider materialized view for comment counts
- Optimize COUNT query separately

### 2. User Service Query

#### `getUserProfile` Query

**Current Query**:
```sql
SELECT 
  dimension_user_id,
  user_id,
  username,
  history_whole_open,
  history_whole_closed,
  history_whole_commented,
  avg_days_to_resolution,
  resolution_rate,
  user_response_time,
  days_since_last_action,
  applications_used,
  collaboration_patterns,
  countries_open_notes,
  hashtags,
  date_starting_creating_notes,
  date_starting_solving_notes,
  last_year_activity,
  working_hours_of_week_opening,
  activity_by_year
FROM dwh.datamartUsers
WHERE user_id = $1
```

**Analysis**:
- Simple SELECT with WHERE clause
- Queries from datamart (pre-aggregated data)
- Should be fast if indexed properly

**Optimization Opportunities**:
- Index on `user_id` (critical)
- Consider covering index if frequently accessed columns are known

### 3. Country Service Query

#### `getCountryProfile` Query

**Current Query**:
```sql
SELECT 
  dimension_country_id,
  country_id,
  country_name,
  country_name_en,
  country_name_es,
  iso_alpha2,
  history_whole_open,
  history_whole_closed,
  avg_days_to_resolution,
  resolution_rate,
  notes_health_score,
  new_vs_resolved_ratio,
  notes_backlog_size,
  notes_created_last_30_days,
  notes_resolved_last_30_days,
  users_open_notes,
  applications_used,
  hashtags,
  activity_by_year,
  working_hours_of_week_opening
FROM dwh.datamartCountries
WHERE country_id = $1
```

**Analysis**:
- Simple SELECT with WHERE clause
- Queries from datamart (pre-aggregated data)
- Should be fast if indexed properly

**Optimization Opportunities**:
- Index on `country_id` (critical)

### 4. Analytics Service Query

#### `getGlobalAnalytics` Query

**Current Query**:
```sql
SELECT
  dimension_global_id,
  history_whole_open,
  history_whole_closed,
  currently_open_count,
  avg_days_to_resolution,
  resolution_rate,
  notes_created_last_30_days,
  notes_resolved_last_30_days,
  active_users_count,
  notes_backlog_size,
  applications_used,
  top_countries
FROM dwh.datamartGlobal
LIMIT 1
```

**Analysis**:
- Simple SELECT with LIMIT 1
- Queries from datamart (pre-aggregated data)
- Should be very fast (single row)

**Optimization Opportunities**:
- No optimization needed (already optimal)

---

## Index Recommendations

### Critical Indexes

These indexes are essential for query performance:

```sql
-- Notes table
CREATE INDEX IF NOT EXISTS idx_notes_note_id ON public.notes(note_id); -- Primary key, should exist
CREATE INDEX IF NOT EXISTS idx_notes_status ON public.notes(status);
CREATE INDEX IF NOT EXISTS idx_notes_id_country ON public.notes(id_country);
CREATE INDEX IF NOT EXISTS idx_notes_id_user ON public.notes(id_user);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_spatial ON public.notes USING GIST (point(longitude, latitude));

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_notes_country_status ON public.notes(id_country, status);
CREATE INDEX IF NOT EXISTS idx_notes_user_status ON public.notes(id_user, status);
CREATE INDEX IF NOT EXISTS idx_notes_country_created ON public.notes(id_country, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_status_created ON public.notes(status, created_at DESC);

-- Note comments table
CREATE INDEX IF NOT EXISTS idx_note_comments_note_id ON public.note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_comments_created_at ON public.note_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_note_comments_user_id ON public.note_comments(user_id);

-- Composite index for note comments queries
CREATE INDEX IF NOT EXISTS idx_note_comments_note_created ON public.note_comments(note_id, created_at);

-- Note comments text table
CREATE INDEX IF NOT EXISTS idx_note_comments_text_comment_id ON public.note_comments_text(comment_id);

-- Users table (if exists in public schema)
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id); -- Primary key, should exist

-- Datamart tables
CREATE INDEX IF NOT EXISTS idx_datamart_users_user_id ON dwh.datamartUsers(user_id);
CREATE INDEX IF NOT EXISTS idx_datamart_countries_country_id ON dwh.datamartCountries(country_id);
```

### Spatial Index for Bounding Box Queries

For efficient bounding box (bbox) queries:

```sql
-- Create spatial index using PostGIS (if available)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column if not exists
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);
UPDATE public.notes SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE geom IS NULL;

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_notes_geom ON public.notes USING GIST (geom);

-- Alternative: Use btree_gist for bounding box without PostGIS
CREATE INDEX IF NOT EXISTS idx_notes_bbox ON public.notes USING GIST (
  box(point(longitude, latitude), point(longitude, latitude))
);
```

### Index Maintenance

```sql
-- Analyze tables to update statistics
ANALYZE public.notes;
ANALYZE public.note_comments;
ANALYZE public.note_comments_text;
ANALYZE dwh.datamartUsers;
ANALYZE dwh.datamartCountries;
ANALYZE dwh.datamartGlobal;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname IN ('public', 'dwh')
ORDER BY idx_scan DESC;

-- Check unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE schemaname IN ('public', 'dwh')
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey';
```

---

## Query Optimizations

### 1. Optimize `getNoteById` Query

**Current**: Uses LEFT JOIN with GROUP BY

**Optimized Version** (using subquery):
```sql
SELECT
  n.note_id,
  n.latitude,
  n.longitude,
  n.status,
  n.created_at,
  n.closed_at,
  n.id_user,
  n.id_country,
  COALESCE((
    SELECT COUNT(*)
    FROM public.note_comments nc
    WHERE nc.note_id = n.note_id
  ), 0) as comments_count
FROM public.notes n
WHERE n.note_id = $1
```

**Benefits**:
- Eliminates GROUP BY overhead
- More efficient COUNT
- Simpler query plan

### 2. Optimize `searchNotes` Count Query

**Current**: Separate COUNT query with same WHERE conditions

**Optimized Version** (using window function):
```sql
-- Main query with count
SELECT
  n.note_id,
  n.latitude,
  n.longitude,
  n.status,
  n.created_at,
  n.closed_at,
  n.id_user,
  n.id_country,
  COALESCE(comment_counts.comments_count, 0) as comments_count,
  COUNT(*) OVER() as total_count
FROM public.notes n
LEFT JOIN (
  SELECT note_id, COUNT(*) as comments_count
  FROM public.note_comments
  GROUP BY note_id
) comment_counts ON n.note_id = comment_counts.note_id
WHERE [dynamic conditions]
ORDER BY n.created_at DESC
LIMIT $N OFFSET $M
```

**Benefits**:
- Single query instead of two
- Window function for total count
- Pre-aggregated comment counts

**Alternative**: Materialized view for comment counts

```sql
-- Create materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_note_comment_counts AS
SELECT
  note_id,
  COUNT(*) as comments_count
FROM public.note_comments
GROUP BY note_id;

-- Create index
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_note_comment_counts_note_id 
ON mv_note_comment_counts(note_id);

-- Refresh periodically (e.g., daily)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_note_comment_counts;
```

### 3. Optimize Bounding Box Query

**Current**: Multiple conditions for bbox

**Optimized Version** (using spatial index):
```sql
-- If using PostGIS
SELECT ...
FROM public.notes n
WHERE ST_Within(
  ST_SetSRID(ST_MakePoint(n.longitude, n.latitude), 4326),
  ST_MakeEnvelope($minLon, $minLat, $maxLon, $maxLat, 4326)
)
AND [other conditions]
```

**Benefits**:
- Uses spatial index (GIST)
- More efficient than multiple range conditions
- Better for complex spatial queries

---

## Performance Benchmarks

### Baseline Performance Targets

| Endpoint | Target P50 | Target P95 | Target P99 |
|----------|------------|------------|------------|
| GET /api/v1/notes/:id | < 50ms | < 200ms | < 500ms |
| GET /api/v1/notes/:id/comments | < 100ms | < 300ms | < 800ms |
| GET /api/v1/notes (search) | < 200ms | < 500ms | < 1000ms |
| GET /api/v1/users/:id | < 50ms | < 150ms | < 300ms |
| GET /api/v1/countries/:id | < 50ms | < 150ms | < 300ms |
| GET /api/v1/analytics/global | < 50ms | < 100ms | < 200ms |

### Benchmarking Script

```bash
#!/bin/bash
# benchmark.sh - Simple performance benchmark

API_URL="http://localhost:3000"
USER_AGENT="Benchmark/1.0 (benchmark@example.com)"

echo "Running performance benchmarks..."

# Test endpoints
endpoints=(
  "/api/v1/analytics/global"
  "/api/v1/users/1"
  "/api/v1/countries/1"
  "/api/v1/notes/1"
  "/api/v1/notes/1/comments"
  "/api/v1/notes?limit=20"
)

for endpoint in "${endpoints[@]}"; do
  echo -n "Testing $endpoint... "
  time curl -s -o /dev/null -w "%{time_total}" \
    -H "User-Agent: $USER_AGENT" \
    "$API_URL$endpoint"
  echo " seconds"
done
```

### Using Apache Bench (ab)

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Run benchmark
ab -n 1000 -c 10 \
   -H "User-Agent: Benchmark/1.0 (benchmark@example.com)" \
   http://localhost:3000/api/v1/analytics/global
```

### Using k6 (Recommended)

```javascript
// k6-benchmark.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const headers = {
    'User-Agent': 'Benchmark/1.0 (benchmark@example.com)',
  };

  const responses = {
    global: http.get('http://localhost:3000/api/v1/analytics/global', { headers }),
    user: http.get('http://localhost:3000/api/v1/users/1', { headers }),
    country: http.get('http://localhost:3000/api/v1/countries/1', { headers }),
    note: http.get('http://localhost:3000/api/v1/notes/1', { headers }),
  };

  check(responses.global, {
    'global status is 200': (r) => r.status === 200,
    'global response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

Run with:
```bash
k6 run k6-benchmark.js
```

---

## Monitoring and Profiling

### EXPLAIN ANALYZE

To analyze query performance, use the provided analysis script:

```bash
# Run comprehensive query analysis
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/analyze_queries.sql
```

This script will:
- Execute EXPLAIN ANALYZE on all API queries
- Show execution plans and timing
- Check existing indexes
- Show index usage statistics
- Display table sizes and statistics
- Provide recommendations

**Manual Analysis**:

You can also analyze individual queries manually:

```sql
-- Example: Analyze getNoteById query
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  n.note_id,
  n.latitude,
  n.longitude,
  n.status,
  n.created_at,
  n.closed_at,
  n.id_user,
  n.id_country,
  COUNT(DISTINCT nc.comment_id) as comments_count
FROM public.notes n
LEFT JOIN public.note_comments nc ON n.note_id = nc.note_id
WHERE n.note_id = 12345
GROUP BY n.note_id, n.latitude, n.longitude, n.status, n.created_at, n.closed_at, n.id_user, n.id_country;
```

**Key Metrics to Check**:
- **Execution Time**: Should be < 100ms for simple queries, < 500ms for complex queries
- **Index Usage**: Look for "Index Scan" vs "Seq Scan" (prefer Index Scan)
- **Join Type**: Prefer "Index Join" over "Hash Join" for small datasets
- **Rows**: Check if estimated rows match actual rows (indicates stale statistics)
- **Buffers**: Check shared buffers hit ratio (should be > 95%)

### Query Performance Monitoring

```sql
-- Enable query logging (in postgresql.conf)
log_min_duration_statement = 1000  -- Log queries > 1 second
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

-- View slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries taking > 100ms on average
ORDER BY mean_time DESC
LIMIT 20;
```

### Application-Level Monitoring

Add query timing to application:

```typescript
// Example: Add timing to service functions
const startTime = Date.now();
const result = await pool.query(query, params);
const duration = Date.now() - startTime;

if (duration > 1000) {
  logger.warn('Slow query detected', {
    query: query.substring(0, 100),
    duration,
    params: params.length,
  });
}
```

---

## Caching Strategy

### Redis Caching

Cache frequently accessed data:

```typescript
// Example: Cache user profiles
const cacheKey = `user:${userId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const userProfile = await getUserProfile(userId);
await redis.setex(cacheKey, 3600, JSON.stringify(userProfile)); // 1 hour TTL
return userProfile;
```

**Cache Recommendations**:
- **User Profiles**: 1 hour TTL
- **Country Profiles**: 1 hour TTL
- **Global Analytics**: 5 minutes TTL
- **Note Details**: 5 minutes TTL
- **Note Comments**: 1 minute TTL (more dynamic)

### HTTP Caching

Add cache headers for GET requests:

```typescript
// Example: Add cache headers
res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
res.set('ETag', generateETag(data));
```

---

## Connection Pool Optimization

### Current Configuration

```typescript
// src/config/database.ts
max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
```

### Recommended Settings

**For Low Traffic** (< 100 req/min):
```env
DB_MAX_CONNECTIONS=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
```

**For Medium Traffic** (100-1000 req/min):
```env
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
```

**For High Traffic** (> 1000 req/min):
```env
DB_MAX_CONNECTIONS=50
DB_IDLE_TIMEOUT=60000
DB_CONNECTION_TIMEOUT=5000
```

### Monitor Connection Pool

```sql
-- Check active connections
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = 'osm_notes_dwh';
```

---

## Recommendations Summary

### Immediate Actions

1. **Create Critical Indexes**:
   - `idx_notes_note_id` (if not exists)
   - `idx_note_comments_note_id`
   - `idx_datamart_users_user_id`
   - `idx_datamart_countries_country_id`

2. **Optimize Count Queries**:
   - Consider materialized view for comment counts
   - Use window functions for pagination counts

3. **Add Query Timing**:
   - Log slow queries (> 1 second)
   - Monitor query performance

### Medium-Term Actions

1. **Implement Caching**:
   - Redis cache for user/country profiles
   - HTTP cache headers

2. **Spatial Indexes**:
   - Add PostGIS extension
   - Create spatial index for bbox queries

3. **Connection Pool Tuning**:
   - Monitor connection usage
   - Adjust pool size based on traffic

### Long-Term Actions

1. **Materialized Views**:
   - Pre-aggregate comment counts
   - Refresh periodically

2. **Query Optimization**:
   - Refactor complex queries
   - Use EXPLAIN ANALYZE regularly

3. **Performance Testing**:
   - Set up automated benchmarks
   - Monitor performance trends

---

## Related Documentation

- [Deployment Guide](DEPLOYMENT.md) - Deployment instructions
- [Operations Runbook](RUNBOOK.md) - Operational procedures
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues

---

**Last Updated**: 2025-12-27

