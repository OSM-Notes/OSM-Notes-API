---
title: "Deployment Guide"
description: "This guide covers deployment of OSM Notes API to production environments."
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "installation"
audience:
  - "system-admins"
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# Deployment Guide

This guide covers deployment of OSM Notes API to production environments.

**For specific deployment to server 192.168.0.7, see [DEPLOYMENT_PRODUCTION.md](Deployment_Production.md).**

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL 15+ with access to `osm_notes_dwh` database
- Redis 7+ (optional but recommended for caching and rate limiting)
- Docker and Docker Compose (for containerized deployment)

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database connection tested
- [ ] Redis connection tested (if using)
- [ ] Health check endpoint responding
- [ ] Tests passing (`npm test`)
- [ ] Code formatted (`npm run format:check`)
- [ ] Type checking passing (`npm run type-check`)
- [ ] Security review completed
- [ ] Logging configured for production
- [ ] Monitoring configured (optional)

## Environment Variables

All required environment variables must be set before deployment. See `.env.example` for complete list.

**Required Variables**:
- `DB_HOST` - PostgreSQL host
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

**Production Recommendations**:
- Set `NODE_ENV=production`
- Set `LOG_LEVEL=info` (or `warn` for less verbose logs)
- Enable SSL for database: `DB_SSL=true`
- Configure Redis for caching and rate limiting
- Use strong passwords for all credentials

## Deployment Methods

### 1. Docker Compose (Recommended)

**Steps**:

1. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Build and start**:
   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

3. **Verify deployment**:
   ```bash
   # Check health
   curl http://localhost:3000/health
   
   # Check logs
   docker compose -f docker/docker-compose.yml logs -f api
   ```

4. **Monitor**:
   ```bash
   # Container status
   docker compose -f docker/docker-compose.yml ps
   
   # Resource usage
   docker stats osm-notes-api
   ```

### 2. Docker Standalone

**Steps**:

1. **Build image**:
   ```bash
   docker build -f docker/Dockerfile -t osm-notes-api:0.1.0 .
   ```

2. **Run container**:
   ```bash
   docker run -d \
     --name osm-notes-api \
     -p 3000:3000 \
     --env-file .env \
     --restart unless-stopped \
     osm-notes-api:0.1.0
   ```

3. **Verify**:
   ```bash
   curl http://localhost:3000/health
   docker logs osm-notes-api
   ```

### 3. Node.js Direct Deployment

**Steps**:

1. **Build application**:
   ```bash
   npm install --production
   npm run build
   ```

2. **Start with process manager** (PM2 recommended):
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name osm-notes-api
   pm2 save
   pm2 startup
   ```

3. **Or use systemd**:
   ```bash
   # Create service file: /etc/systemd/system/osm-notes-api.service
   # Start service
   sudo systemctl start osm-notes-api
   sudo systemctl enable osm-notes-api
   ```

## Health Checks

The API provides a health check endpoint at `/health` that verifies:

- Application status
- Database connectivity
- Redis connectivity (if configured)

**Expected Response** (healthy):
```json
{
  "status": "healthy",
  "timestamp": "2025-12-26T12:00:00.000Z",
  "database": {
    "status": "up",
    "responseTime": 15
  },
  "redis": {
    "status": "up",
    "responseTime": 2
  }
}
```

**Status Codes**:
- `200` - Healthy or degraded (Redis down but DB up)
- `503` - Unhealthy (Database down)

## Monitoring

### Health Check Monitoring

Set up monitoring to check `/health` endpoint regularly:

```bash
# Simple check script
curl -f http://localhost:3000/health || alert
```

### Log Monitoring

Logs are written to:
- Console (stdout/stderr)
- `logs/error.log` (errors only, production)
- `logs/combined.log` (all logs, production)

**Log Levels**:
- `error` - Errors only
- `warn` - Warnings and errors
- `info` - Informational messages (recommended for production)
- `debug` - Detailed debugging (development only)

### Metrics (Optional)

If Prometheus is configured:

```bash
# Start with monitoring profile
docker compose -f docker/docker-compose.yml --profile monitoring up -d

# Access Prometheus
http://localhost:9090

# Access Grafana
http://localhost:3001
```

## Scaling

### Horizontal Scaling

The API is stateless and can be scaled horizontally:

1. **Load Balancer**: Use nginx, HAProxy, or cloud load balancer
2. **Multiple Instances**: Run multiple containers/processes
3. **Shared Redis**: Use same Redis instance for rate limiting

**Example** (Docker Compose with multiple instances):
```yaml
services:
  api:
    deploy:
      replicas: 3
```

### Vertical Scaling

Increase resources for single instance:
- CPU: 2-4 cores recommended
- RAM: 4GB minimum, 8GB recommended
- Database connection pool: Adjust `DB_MAX_CONNECTIONS`

## Security Considerations

### Production Checklist

- [ ] Use HTTPS/TLS for all connections
- [ ] Enable database SSL (`DB_SSL=true`)
- [ ] Use strong passwords for all credentials
- [ ] Restrict database user permissions (read-only recommended)
- [ ] Configure firewall rules
- [ ] Enable rate limiting (already configured)
- [ ] Monitor for suspicious activity
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Regular security audits

### Secrets Management

- Never commit `.env` files
- Use environment variables or secrets management system
- Rotate credentials regularly
- Use different credentials for dev/staging/production

## Backup and Recovery

### Database Backups

The API is read-only, but ensure database backups are configured:

```bash
# PostgreSQL backup example
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup.sql
```

### Application Recovery

1. **Restore from backup** (if needed)
2. **Redeploy application**:
   ```bash
   docker compose -f docker/docker-compose.yml up -d --force-recreate
   ```
3. **Verify health**:
   ```bash
   curl http://localhost:3000/health
   ```

## Troubleshooting

### Application Won't Start

1. **Check logs**:
   ```bash
   docker logs osm-notes-api
   # or
   pm2 logs osm-notes-api
   ```

2. **Verify environment variables**:
   ```bash
   docker exec osm-notes-api env | grep DB_
   ```

3. **Test database connection**:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   ```

### High Memory Usage

1. **Check connection pool size**: Reduce `DB_MAX_CONNECTIONS` if too high
2. **Check for memory leaks**: Monitor over time
3. **Increase container memory**: If needed

### Slow Response Times

1. **Check database performance**: Query execution times
2. **Check Redis**: If using caching, verify Redis is working
3. **Check network latency**: Between API and database
4. **Review query optimization**: Check slow queries

## Rollback Procedure

If deployment fails:

1. **Stop new version**:
   ```bash
   docker compose -f docker/docker-compose.yml down
   ```

2. **Restore previous version**:
   ```bash
   docker compose -f docker/docker-compose.yml up -d
   # or use previous image tag
   docker run -d --name osm-notes-api osm-notes-api:previous-version
   ```

3. **Verify**:
   ```bash
   curl http://localhost:3000/health
   ```

## Support

For deployment issues:

1. Check logs: `docker logs osm-notes-api` or `pm2 logs`
2. Verify health endpoint: `curl http://localhost:3000/health`
3. Review documentation: [INSTALLATION.md](Installation.md)
4. Open GitHub issue with deployment details

