---
title: "Troubleshooting Guide"
description: "This guide helps you diagnose and resolve common issues with the OSM Notes API."
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "troubleshooting"
audience:
  - "users"
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the OSM Notes API.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Common Error Messages](#common-error-messages)
- [Database Issues](#database-issues)
- [Redis Issues](#redis-issues)
- [Authentication Issues](#authentication-issues)
- [Rate Limiting Issues](#rate-limiting-issues)
- [Performance Issues](#performance-issues)
- [Deployment Issues](#deployment-issues)
- [Logging and Debugging](#logging-and-debugging)

---

## Quick Diagnostics

### Health Check

First, check the health status of the API:

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/health
```

**Expected Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-12-27T13:00:00.000Z",
  "database": {
    "status": "up",
    "responseTime": 15
  },
  "redis": {
    "status": "up",
    "responseTime": 5
  }
}
```

**Status Values**:
- `healthy`: All services operational
- `degraded`: Some optional services down (e.g., Redis)
- `unhealthy`: Critical services down (e.g., database)

### Check Logs

```bash
# Development mode
npm run dev

# Production mode
npm start

# Docker
docker compose logs -f api
```

---

## Common Error Messages

### 400 Bad Request

**Error**: `User-Agent header is required and must follow format: AppName/Version (Contact)`

**Cause**: Missing or invalid User-Agent header

**Solution**:
1. Include a valid User-Agent header in all requests
2. Format: `AppName/Version (Contact)`
3. Contact must be a valid email or URL

**Example**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/notes/123
```

---

### 403 Forbidden

**Error**: `AI agents require OAuth authentication`

**Cause**: User-Agent detected as AI/bot without OAuth

**Solution**:
1. Authenticate using OpenStreetMap OAuth (when available)
2. Or use a different User-Agent that doesn't match AI patterns

---

### 404 Not Found

**Error**: `Note not found` or `User not found` or `Country not found`

**Cause**: Resource doesn't exist in database

**Solution**:
1. Verify the ID exists in the database
2. Check that the corresponding table has data
3. Verify database connection is working

**Check Database**:
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "SELECT id FROM dwh.datamartNotes WHERE id = 123 LIMIT 1;"
```

---

### 429 Too Many Requests

**Error**: `Rate limit exceeded. Maximum 50 requests per 15 minutes allowed.`

**Cause**: Exceeded rate limit for IP + User-Agent combination

**Solution**:
1. Wait 15 minutes for the limit to reset
2. Use a different User-Agent (different app)
3. Use a different IP address
4. Check rate limit headers:
   ```bash
   curl -I -H "User-Agent: MyApp/1.0 (contact@example.com)" \
        http://localhost:3000/api/v1/notes
   ```
   Look for:
   - `RateLimit-Limit`: Maximum requests allowed
   - `RateLimit-Remaining`: Remaining requests
   - `RateLimit-Reset`: Unix timestamp when limit resets

**Reset Rate Limit** (if Redis is used):
```bash
# Connect to Redis
redis-cli

# Delete rate limit keys (use with caution)
KEYS rate-limit:*
DEL rate-limit:*
```

---

### 500 Internal Server Error

**Error**: `Internal server error`

**Cause**: Server-side error (database, Redis, or application error)

**Solution**:
1. Check application logs for detailed error
2. Verify database connection
3. Verify Redis connection (if configured)
4. Check server resources (CPU, memory, disk)

**Check Logs**:
```bash
# Application logs
tail -f logs/app.log

# Docker logs
docker compose logs -f api
```

---

### 503 Service Unavailable

**Error**: `Service temporarily unavailable`

**Cause**: Critical service (database) is down

**Solution**:
1. Check database connection
2. Verify PostgreSQL is running
3. Check database credentials
4. Review health check endpoint

---

## Database Issues

### Cannot Connect to Database

**Symptoms**:
- Health check returns `unhealthy`
- 500 errors on all endpoints
- Logs show: `Database connection failed`

**Diagnosis**:
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();"

# Check environment variables
echo $DB_HOST
echo $DB_USER
echo $DB_NAME
```

**Solutions**:

1. **PostgreSQL Not Running**:
   ```bash
   # Start PostgreSQL
   sudo systemctl start postgresql
   ```

2. **Wrong Credentials**:
   ```bash
   # Verify in .env file
   cat .env | grep DB_

   # Test with psql
   psql -h localhost -U postgres -d osm_notes_dwh
   ```

3. **Database Doesn't Exist**:
   ```bash
   # Create database
   psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE osm_notes_dwh;"
   ```

4. **Connection Refused**:
   - Check `postgresql.conf`: `listen_addresses = '*'`
   - Check `pg_hba.conf`: Allow connections from API server
   - Check firewall: `sudo ufw allow 5432/tcp`

5. **SSL Required**:
   ```env
   DB_SSL=true
   DB_SSL_REJECT_UNAUTHORIZED=false  # For self-signed certificates
   ```

### Slow Queries

**Symptoms**:
- High response times
- Database CPU usage high
- Timeouts

**Diagnosis**:
```sql
-- Check active queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds';

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'dwh'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Explain analyze a slow query
EXPLAIN ANALYZE
SELECT * FROM dwh.datamartNotes WHERE id = 123;
```

**Solutions**:
1. Add indexes (if missing)
2. Optimize queries (avoid SELECT *)
3. Increase connection pool size
4. Add caching layer

### Connection Pool Exhausted

**Symptoms**:
- Errors: `timeout: Client has already been connected`
- High `waitingCount` in pool stats

**Solutions**:
1. Increase pool size:
   ```env
   DB_MAX_CONNECTIONS=50
   ```
2. Reduce idle timeout:
   ```env
   DB_IDLE_TIMEOUT=10000
   ```
3. Check for connection leaks (queries not closing)

---

## Redis Issues

### Cannot Connect to Redis

**Symptoms**:
- Health check shows `redis.status: "down"`
- Rate limiting uses in-memory store (not persistent)
- Logs show: `Redis connection failed`

**Diagnosis**:
```bash
# Check Redis is running
redis-cli ping
# Expected: PONG

# Test connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# Check environment variables
echo $REDIS_HOST
echo $REDIS_PORT
```

**Solutions**:

1. **Redis Not Running**:
   ```bash
   # Start Redis
   sudo systemctl start redis
   ```

2. **Wrong Host/Port**:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. **Password Required**:
   ```env
   REDIS_PASSWORD=your_password
   ```

4. **Connection Refused**:
   - Check `redis.conf`: `bind 0.0.0.0` (for remote access)
   - Check firewall: `sudo ufw allow 6379/tcp`
   - Verify Redis is running: `sudo systemctl status redis-server`
   - Start Redis if not running: `sudo systemctl start redis-server`
   - See [TROUBLESHOOTING_REDIS.md](TROUBLESHOOTING_REDIS.md) for detailed steps

**Note**: Redis is optional. If not configured (`REDIS_HOST` empty), the API uses in-memory rate limiting (not persistent across restarts).

**Quick Fix**: If Redis is on the same machine, use `REDIS_HOST=localhost` instead of the IP address.

### Rate Limiting Not Working

**Symptoms**:
- Rate limits reset after server restart
- Different rate limits per server instance

**Cause**: Using in-memory store instead of Redis

**Solution**: Configure Redis for persistent rate limiting:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Authentication Issues

### User-Agent Validation Failing

**Error**: `User-Agent header is required`

**Valid Format**:
```
User-Agent: AppName/Version (Contact)
```

**Components**:
- `AppName`: Letters, numbers, hyphens, dots only
- `Version`: Any version string
- `Contact`: **REQUIRED** - Valid email or URL

**Valid Examples**:
```
User-Agent: MyOSMApp/1.0 (contact@example.com)
User-Agent: Terranote/1.0 (https://github.com/Terranote/terranote-core)
User-Agent: ResearchTool/0.5 (researcher@university.edu)
```

**Invalid Examples**:
```
User-Agent: MyApp/1.0                    # Missing contact
User-Agent: MyApp                        # Missing version and contact
User-Agent: MyApp/1.0 (invalid)          # Invalid contact format
```

**Test**:
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/health
```

---

## Rate Limiting Issues

### Rate Limit Too Restrictive

**Current Limits**:
- Anonymous: 50 requests per 15 minutes
- Authenticated: 1000 requests/hour (when OAuth available)
- Bots: 10 requests/hour

**Adjust Limits** (if needed):
Edit `src/middleware/rateLimit.ts`:
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 50,                    // 50 requests
  // ...
});
```

### Rate Limit Not Resetting

**Cause**: Using in-memory store (resets on restart)

**Solution**: Configure Redis for persistent rate limiting

### Bypassing Rate Limits

**Note**: Health check endpoint (`/health`) is excluded from rate limiting

**For Testing**: Use different User-Agent or IP address

---

## Performance Issues

### Slow Response Times

**Diagnosis**:
1. Check health check response times:
   ```bash
   curl -w "\nTime: %{time_total}s\n" \
        -H "User-Agent: TestApp/1.0 (test@example.com)" \
        http://localhost:3000/health
   ```

2. Check database query times:
   ```sql
   SELECT pid, now() - query_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active';
   ```

3. Check server resources:
   ```bash
   # CPU and memory
   top
   htop

   # Disk I/O
   iotop
   ```

**Solutions**:
1. Add database indexes
2. Enable query caching
3. Optimize queries (avoid N+1)
4. Scale horizontally (multiple instances)
5. Use CDN for static assets

### High Memory Usage

**Diagnosis**:
```bash
# Check Node.js memory
node --max-old-space-size=4096 dist/index.js

# Monitor memory
pm2 monit
```

**Solutions**:
1. Increase Node.js memory limit
2. Reduce connection pool size
3. Enable garbage collection logging
4. Check for memory leaks

### High CPU Usage

**Diagnosis**:
```bash
# Profile Node.js
node --prof dist/index.js

# Check process CPU
top -p $(pgrep -f "node.*index.js")
```

**Solutions**:
1. Optimize queries
2. Add caching
3. Reduce logging verbosity
4. Use worker threads for heavy computation

---

## Deployment Issues

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Docker Container Won't Start

**Diagnosis**:
```bash
# Check logs
docker compose logs api

# Check container status
docker compose ps

# Check environment variables
docker compose config
```

**Common Issues**:
1. Missing environment variables
2. Database not accessible from container
3. Port conflicts
4. Volume mount permissions

**Solution**:
```bash
# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d

# Check logs
docker compose logs -f api
```

### Environment Variables Not Loading

**Symptoms**: Default values used instead of `.env` values

**Solution**:
1. Verify `.env` file exists in project root
2. Check `.env` syntax (no spaces around `=`)
3. Restart application after changing `.env`
4. For Docker: Use `env_file` in `docker compose.yml`

---

## Logging and Debugging

### Enable Debug Logging

**Development**:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

**Production** (be careful):
```env
LOG_LEVEL=info
NODE_ENV=production
```

### View Logs

**Development**:
```bash
npm run dev
# Logs appear in console
```

**Production**:
```bash
# Log files
tail -f logs/app.log
tail -f logs/error.log

# Docker
docker compose logs -f api

# PM2
pm2 logs osm-notes-api
```

### Log Locations

- Development: Console output
- Production: `logs/app.log` and `logs/error.log`
- Docker: Container logs

### Debug Specific Issues

**Database Queries**:
```env
LOG_LEVEL=debug
```

**Rate Limiting**:
Check Redis keys:
```bash
redis-cli
KEYS rate-limit:*
GET rate-limit:127.0.0.1:MyApp/1.0
```

**Request Tracing**:
Add request ID middleware (if implemented):
```bash
curl -H "X-Request-ID: test-123" \
     -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/notes
```

---

## Getting Help

If you've tried the solutions above and still have issues:

1. **Check Documentation**:
   - [API Reference](API.md)
   - [Usage Guide](USAGE.md)
   - [Installation Guide](INSTALLATION.md)

2. **Collect Information**:
   - Error message and status code
   - Request details (endpoint, headers, body)
   - Logs (with sensitive data redacted)
   - Environment (OS, Node.js version, database version)
   - Health check response

3. **Open an Issue**:
   - Include all collected information
   - Describe steps to reproduce
   - Include relevant logs

4. **Check GitHub Issues**:
   - Search for similar issues
   - Check if already resolved

---

## Prevention

### Best Practices

1. **Monitor Health Endpoint**:
   ```bash
   # Set up monitoring
   watch -n 30 'curl -s http://localhost:3000/health | jq'
   ```

2. **Set Up Alerts**:
   - Alert on `unhealthy` status
   - Alert on high error rate
   - Alert on slow response times

3. **Regular Backups**:
   - Database backups
   - Configuration backups
   - Log rotation

4. **Keep Updated**:
   - Update dependencies regularly
   - Monitor security advisories
   - Review logs regularly

5. **Test Changes**:
   - Test in development first
   - Use staging environment
   - Gradual rollout in production

---

## Related Documentation

- [API Reference](API.md) - Complete API documentation
- [Usage Guide](USAGE.md) - How to use the API
- [Installation Guide](INSTALLATION.md) - Setup instructions
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [CI/CD Guide](CI_CD.md) - Continuous integration/deployment
- [Security Policy](../security/SECURITY_POLICY.md) - Security information

