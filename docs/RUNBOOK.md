---
title: "Operations Runbook"
description: "This runbook provides step-by-step procedures for operating and maintaining the OSM Notes API in production."
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "documentation"
audience:
  - "system-admins"
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# Operations Runbook

This runbook provides step-by-step procedures for operating and maintaining the OSM Notes API in production.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Deployment Procedures](#deployment-procedures)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Rollback Procedures](#rollback-procedures)
- [Common Operations](#common-operations)
- [Emergency Procedures](#emergency-procedures)
- [Maintenance Windows](#maintenance-windows)
- [Contact Information](#contact-information)

---

## Quick Reference

### Service Information

- **Service Name**: OSM Notes API
- **Default Port**: 3000
- **Health Endpoint**: `/health`
- **API Base Path**: `/api/v1`
- **Documentation**: `/docs` (Swagger UI)

### Key Commands

```bash
# Health check
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3000/health

# View logs (Docker)
docker compose -f docker/docker-compose.yml logs -f api

# View logs (PM2)
pm2 logs osm-notes-api

# Restart service (Docker)
docker compose -f docker/docker-compose.yml restart api

# Restart service (PM2)
pm2 restart osm-notes-api

# Check service status (Docker)
docker compose -f docker/docker-compose.yml ps

# Check service status (PM2)
pm2 status
```

### Environment Variables

**Critical Variables**:
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database connection
- `REDIS_HOST`, `REDIS_PORT` - Redis connection (optional)
- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port

**See**: `.env.example` for complete list

---

## Deployment Procedures

### Pre-Deployment Checklist

Before deploying, verify:

- [ ] All tests passing (`npm test`)
- [ ] Code formatted (`npm run format:check`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Security audit clean (`npm audit`)
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Redis connection tested (if using)
- [ ] Backup of current version created
- [ ] Rollback plan documented
- [ ] Team notified of deployment

### Deployment Methods

#### Method 1: Docker Compose (Recommended)

**Standard Deployment**:

```bash
# 1. Pull latest code
git pull origin main

# 2. Build new image
docker compose -f docker/docker-compose.yml build api

# 3. Stop current service
docker compose -f docker/docker-compose.yml stop api

# 4. Start new service
docker compose -f docker/docker-compose.yml up -d api

# 5. Verify deployment
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3000/health

# 6. Check logs
docker compose -f docker/docker-compose.yml logs -f api
```

**Zero-Downtime Deployment** (with multiple instances):

```bash
# 1. Scale up
docker compose -f docker/docker-compose.yml up -d --scale api=2

# 2. Wait for new instance to be healthy
sleep 10
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3000/health

# 3. Remove old instance
docker compose -f docker/docker-compose.yml up -d --scale api=1
```

#### Method 2: PM2 (Node.js Direct)

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install --production

# 3. Build application
npm run build

# 4. Reload application (zero-downtime)
pm2 reload osm-notes-api

# Or restart (with brief downtime)
pm2 restart osm-notes-api

# 5. Verify deployment
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3000/health

# 6. Check logs
pm2 logs osm-notes-api
```

#### Method 3: Systemd Service

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install --production

# 3. Build application
npm run build

# 4. Restart service
sudo systemctl restart osm-notes-api

# 5. Check status
sudo systemctl status osm-notes-api

# 6. Verify deployment
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3000/health
```

### Post-Deployment Verification

After deployment, verify:

1. **Health Check**:
   ```bash
   curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3000/health
   ```
   Expected: `200 OK` with `"status": "healthy"`

2. **API Endpoints**:
   ```bash
   # Test a simple endpoint
   curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
        http://localhost:3000/api/v1/analytics/global
   ```
   Expected: `200 OK` with valid JSON

3. **Logs**:
   ```bash
   # Check for errors
   docker compose -f docker/docker-compose.yml logs api | grep -i error
   # or
   pm2 logs osm-notes-api --lines 100 | grep -i error
   ```

4. **Performance**:
   ```bash
   # Check response times
   curl -w "\nTime: %{time_total}s\n" \
        -H "User-Agent: Monitor/1.0 (ops@example.com)" \
        http://localhost:3000/health
   ```
   Expected: < 1 second

---

## Monitoring and Health Checks

### Health Check Endpoint

The `/health` endpoint provides real-time status:

```bash
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3000/health
```

**Response Codes**:
- `200` - Healthy or degraded (Redis down but DB up)
- `503` - Unhealthy (Database down)

**Response Structure**:
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
- `healthy` - All services operational
- `degraded` - Some optional services down (e.g., Redis)
- `unhealthy` - Critical services down (e.g., database)

### Monitoring Setup

#### 1. Health Check Monitoring

Set up automated health checks:

```bash
# Simple cron job (every 5 minutes)
*/5 * * * * curl -f -H "User-Agent: Monitor/1.0 (ops@example.com)" \
  http://localhost:3000/health || alert-admin.sh
```

#### 2. Log Monitoring

Monitor logs for errors:

```bash
# Watch for errors in real-time
docker compose -f docker/docker-compose.yml logs -f api | grep -i error

# Or with PM2
pm2 logs osm-notes-api --err
```

#### 3. Resource Monitoring

Monitor system resources:

```bash
# Docker stats
docker stats osm-notes-api

# System resources
top
htop

# Disk usage
df -h

# Memory usage
free -h
```

#### 4. Application Metrics

If Prometheus is configured:

```bash
# Access Prometheus
http://localhost:9090

# Access Grafana
http://localhost:3001
```

### Key Metrics to Monitor

1. **Availability**: Health check success rate (target: > 99.9%)
2. **Response Time**: P50, P95, P99 latencies (target: < 500ms)
3. **Error Rate**: 5xx errors per minute (target: < 0.1%)
4. **Database Connections**: Active connections (target: < 80% of max)
5. **Memory Usage**: Node.js heap size (target: < 80% of available)
6. **CPU Usage**: Average CPU (target: < 70%)

### Alerting Thresholds

Set up alerts for:

- **Critical**: Health check fails for > 1 minute
- **Warning**: Response time > 1 second for > 5 minutes
- **Warning**: Error rate > 1% for > 5 minutes
- **Warning**: Database connection pool > 80% utilization
- **Warning**: Memory usage > 80% for > 10 minutes

---

## Rollback Procedures

### When to Rollback

Rollback immediately if:

- Health check fails after deployment
- Error rate increases significantly (> 5%)
- Critical functionality broken
- Performance degradation (> 2x slower)
- Data corruption detected

### Rollback Methods

#### Method 1: Docker Compose

```bash
# 1. Identify previous version
docker images | grep osm-notes-api

# 2. Stop current service
docker compose -f docker/docker-compose.yml stop api

# 3. Tag and start previous version
docker tag osm-notes-api:previous-version osm-notes-api:latest
docker compose -f docker/docker-compose.yml up -d api

# 4. Verify rollback
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3000/health
```

#### Method 2: Git + PM2

```bash
# 1. Identify previous commit
git log --oneline -10

# 2. Checkout previous version
git checkout <previous-commit-hash>

# 3. Rebuild and restart
npm install --production
npm run build
pm2 restart osm-notes-api

# 4. Verify rollback
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3000/health
```

#### Method 3: Backup Restore

If using backup/restore strategy:

```bash
# 1. Stop service
docker compose -f docker/docker-compose.yml stop api
# or
pm2 stop osm-notes-api

# 2. Restore from backup
# (Follow your backup restore procedure)

# 3. Start service
docker compose -f docker/docker-compose.yml up -d api
# or
pm2 start osm-notes-api

# 4. Verify rollback
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3000/health
```

### Post-Rollback Verification

After rollback:

1. Verify health check passes
2. Test critical endpoints
3. Check error logs
4. Monitor for 15 minutes
5. Document rollback reason
6. Notify team

---

## Common Operations

### Restart Service

**Docker**:
```bash
docker compose -f docker/docker-compose.yml restart api
```

**PM2**:
```bash
pm2 restart osm-notes-api
```

**Systemd**:
```bash
sudo systemctl restart osm-notes-api
```

### View Logs

**Docker**:
```bash
# All logs
docker compose -f docker/docker-compose.yml logs api

# Follow logs
docker compose -f docker/docker-compose.yml logs -f api

# Last 100 lines
docker compose -f docker/docker-compose.yml logs --tail=100 api

# Errors only
docker compose -f docker/docker-compose.yml logs api | grep -i error
```

**PM2**:
```bash
# All logs
pm2 logs osm-notes-api

# Last 100 lines
pm2 logs osm-notes-api --lines 100

# Errors only
pm2 logs osm-notes-api --err

# Follow logs
pm2 logs osm-notes-api --lines 0
```

### Check Service Status

**Docker**:
```bash
docker compose -f docker/docker-compose.yml ps
docker ps | grep osm-notes-api
```

**PM2**:
```bash
pm2 status
pm2 info osm-notes-api
```

**Systemd**:
```bash
sudo systemctl status osm-notes-api
```

### Update Environment Variables

**Docker**:
```bash
# Edit .env file
nano .env

# Restart service
docker compose -f docker/docker-compose.yml restart api
```

**PM2**:
```bash
# Edit .env file
nano .env

# Restart service
pm2 restart osm-notes-api --update-env
```

**Systemd**:
```bash
# Edit service file
sudo nano /etc/systemd/system/osm-notes-api.service

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart osm-notes-api
```

### Clear Rate Limit Counters

If Redis is used:

```bash
# Connect to Redis
redis-cli

# List rate limit keys
KEYS rate-limit:*

# Delete all rate limit keys (use with caution)
KEYS rate-limit:* | xargs redis-cli DEL
```

**Warning**: This resets rate limits for all users. Use only in emergencies.

### Database Connection Pool Status

Check connection pool:

```bash
# Connect to database
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'osm_notes_dwh';

# Check connection pool stats (if exposed via endpoint)
curl http://localhost:3000/metrics
```

---

## Emergency Procedures

### Service Down

**Symptoms**: Health check fails, no response from API

**Steps**:

1. **Check service status**:
   ```bash
   docker compose -f docker/docker-compose.yml ps
   # or
   pm2 status
   ```

2. **Check logs for errors**:
   ```bash
   docker compose -f docker/docker-compose.yml logs --tail=100 api
   # or
   pm2 logs osm-notes-api --lines 100 --err
   ```

3. **Check database connectivity**:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
   ```

4. **Restart service**:
   ```bash
   docker compose -f docker/docker-compose.yml restart api
   # or
   pm2 restart osm-notes-api
   ```

5. **If restart fails, rollback**:
   Follow [Rollback Procedures](#rollback-procedures)

6. **Escalate if unresolved**:
   Contact [Emergency Contacts](#contact-information)

### High Error Rate

**Symptoms**: Error rate > 5%, many 500 responses

**Steps**:

1. **Check error logs**:
   ```bash
   docker compose -f docker/docker-compose.yml logs api | grep -i error | tail -50
   ```

2. **Check database**:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT count(*) FROM pg_stat_activity;"
   ```

3. **Check resource usage**:
   ```bash
   docker stats osm-notes-api
   # or
   top
   ```

4. **Check recent deployments**:
   ```bash
   git log --oneline -5
   ```

5. **If recent deployment, rollback**:
   Follow [Rollback Procedures](#rollback-procedures)

6. **If not deployment-related, scale up**:
   ```bash
   docker compose -f docker/docker-compose.yml up -d --scale api=2
   ```

### Database Connection Issues

**Symptoms**: Health check shows database down, 503 errors

**Steps**:

1. **Test database connection**:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();"
   ```

2. **Check database status**:
   ```bash
   # On database server
   sudo systemctl status postgresql
   ```

3. **Check connection pool**:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
     "SELECT count(*) FROM pg_stat_activity WHERE datname = 'osm_notes_dwh';"
   ```

4. **Check firewall**:
   ```bash
   # On API server
   telnet $DB_HOST 5432
   ```

5. **Restart database connection**:
   ```bash
   # Restart API service to reset connections
   docker compose -f docker/docker-compose.yml restart api
   ```

6. **If unresolved, contact DBA**:
   See [Contact Information](#contact-information)

### High Memory Usage

**Symptoms**: Service slow, memory usage > 90%

**Steps**:

1. **Check memory usage**:
   ```bash
   docker stats osm-notes-api
   # or
   pm2 monit
   ```

2. **Check for memory leaks**:
   ```bash
   # Enable Node.js memory profiling
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

3. **Restart service**:
   ```bash
   docker compose -f docker/docker-compose.yml restart api
   # or
   pm2 restart osm-notes-api
   ```

4. **If persistent, scale horizontally**:
   ```bash
   docker compose -f docker/docker-compose.yml up -d --scale api=2
   ```

### Rate Limiting Issues

**Symptoms**: Legitimate users getting 429 errors

**Steps**:

1. **Check rate limit configuration**:
   ```bash
   # Review rate limit settings in code
   grep -r "max:" src/middleware/rateLimit.ts
   ```

2. **Check Redis (if used)**:
   ```bash
   redis-cli ping
   redis-cli INFO stats
   ```

3. **Clear rate limit counters** (if needed):
   ```bash
   redis-cli KEYS rate-limit:* | xargs redis-cli DEL
   ```

4. **Temporarily increase limits** (if needed):
   - Edit `src/middleware/rateLimit.ts`
   - Increase `max` value
   - Redeploy

---

## Maintenance Windows

### Scheduled Maintenance

**When**: During low-traffic periods (e.g., 2-4 AM UTC)

**Procedure**:

1. **Notify users** (24 hours in advance):
   - Post maintenance notice
   - Update status page

2. **Pre-maintenance checklist**:
   - [ ] Backup current version
   - [ ] Verify rollback plan
   - [ ] Prepare deployment scripts
   - [ ] Notify team

3. **During maintenance**:
   - [ ] Deploy changes
   - [ ] Verify health checks
   - [ ] Test critical endpoints
   - [ ] Monitor for 15 minutes

4. **Post-maintenance**:
   - [ ] Verify all endpoints working
   - [ ] Check error logs
   - [ ] Update status page
   - [ ] Notify team of completion

### Emergency Maintenance

**When**: Critical security patches, urgent bug fixes

**Procedure**:

1. **Immediate actions**:
   - [ ] Assess impact
   - [ ] Prepare fix
   - [ ] Test fix locally
   - [ ] Notify team

2. **Deploy**:
   - [ ] Deploy fix
   - [ ] Verify health checks
   - [ ] Monitor closely

3. **Post-deployment**:
   - [ ] Verify fix works
   - [ ] Document incident
   - [ ] Post-mortem (if needed)

---

## Contact Information

### Emergency Contacts

**Primary On-Call Engineer**:
- Name: [To be configured]
- Email: [To be configured]
- Phone: [To be configured]
- Slack: [To be configured]

**Secondary On-Call Engineer**:
- Name: [To be configured]
- Email: [To be configured]
- Phone: [To be configured]
- Slack: [To be configured]

**Database Administrator**:
- Name: [To be configured]
- Email: [To be configured]
- Phone: [To be configured]

**Infrastructure Team**:
- Email: [To be configured]
- Slack: [To be configured]

### Escalation Path

1. **Level 1**: On-call engineer (immediate response)
2. **Level 2**: Secondary on-call engineer (if primary unavailable)
3. **Level 3**: Team lead (for critical issues)
4. **Level 4**: Infrastructure team (for infrastructure issues)
5. **Level 5**: Database team (for database issues)

### Communication Channels

- **Slack**: #osm-notes-api-ops
- **Email**: ops@example.com
- **Status Page**: [To be configured]
- **Incident Tracker**: [To be configured]

---

## Related Documentation

- [Deployment Guide](DEPLOYMENT.md) - Detailed deployment instructions
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- [Installation Guide](INSTALLATION.md) - Installation instructions
- [API Reference](API.md) - Complete API documentation
- [CI/CD Guide](CI_CD.md) - Continuous integration/deployment

---

## Change Log

- **2025-12-27**: Initial runbook created

---

**Note**: This runbook should be reviewed and updated regularly. Keep contact information current and update procedures as the system evolves.

