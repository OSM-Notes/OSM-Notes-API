---
title: "Production Deployment Guide - Server 192.168.0.7"
description: "Complete guide for deploying OSM Notes API to production server 192.168.0.7 using Docker Compose (recommended method)"
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "deployment"
  - "installation"
audience:
  - "system-admins"
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# Production Deployment Guide - Server 192.168.0.7

Complete guide for deploying OSM Notes API to production server 192.168.0.7.

## Overview

**Target Server**: 192.168.0.7  
**Deployment Method**: Docker Compose (Recommended)  
**Environment**: Production

## Prerequisites

### Server Access

- SSH access to server 192.168.0.7
- User with sudo privileges (or docker group membership)
- Network access to PostgreSQL database
- Network access to Redis (if using)

### Server Requirements

- **OS**: Linux (Ubuntu 22.04 LTS or Debian 12 recommended)
- **Docker**: >= 20.10
- **Docker Compose**: >= 2.0 (v2 plugin, use `docker compose` command)
- **Disk Space**: 10GB+ available
- **RAM**: 4GB+ available
- **CPU**: 2+ cores

### Pre-Deployment Checklist

- [ ] SSH access verified
- [ ] Docker and Docker Compose installed
- [ ] Git installed
- [ ] Network connectivity to database verified
- [ ] Network connectivity to Redis verified (if using)
- [ ] Firewall rules configured (port 3000 or reverse proxy)
- [ ] SSL/TLS certificates ready (if using HTTPS)

## Initial Server Setup

### 1. Connect to Server

```bash
ssh user@192.168.0.7
```

### 2. Install Docker and Docker Compose

**Ubuntu/Debian**:
```bash
# Update package index
sudo apt-get update

# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io

# Add user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
exit
# SSH back in

# Verify Docker installation
docker --version
docker compose version
# Note: Docker Compose v2 is included with Docker, use 'docker compose' (not 'docker-compose')
```

### 3. Create Application Directory

```bash
# Create directory for application
sudo mkdir -p /opt/osm-notes-api
sudo chown $USER:$USER /opt/osm-notes-api
cd /opt/osm-notes-api
```

### 4. Clone Repository

```bash
# Clone repository
git clone https://github.com/OSM-Notes/OSM-Notes-API.git .

# Or if repository already exists, pull latest
git pull origin main
```

## Configuration

### 1. Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit with production values
nano .env  # or use your preferred editor
```

**Required Variables** (`/opt/osm-notes-api/.env`):
```env
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (osm_notes_dwh)
DB_HOST=localhost  # or IP of database server
DB_PORT=5432
DB_NAME=osm_notes_dwh
DB_USER=osm_notes_api_user
DB_PASSWORD=your_secure_password_here
DB_MAX_CONNECTIONS=20

# Redis (OPTIONAL - but recommended for production)
# If not configured, API uses in-memory rate limiting and no caching
# Leave REDIS_HOST empty to disable Redis
REDIS_HOST=localhost  # or IP of Redis server (leave empty to disable)
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here  # if required
REDIS_DB=0

# Metrics (optional)
METRICS_PORT=9090
```

**Security Notes**:
- Use strong, unique passwords
- Never commit `.env` file to git
- Consider using secrets management system for production

### 2. Create Database User (Read-Only)

**Important**: The API only needs read-only access. Create a read-only user:

```bash
# Run the script to create read-only user
psql -h $DB_HOST -U postgres -d osm_notes_dwh -f scripts/create_readonly_user.sql

# Set secure password (replace with your password)
psql -h $DB_HOST -U postgres -d osm_notes_dwh \
     -c "ALTER USER osm_notes_api_user WITH PASSWORD 'your_secure_password_here';"
```

**User created**: `osm_notes_api_user` with read-only permissions (SELECT only).

See [docs/DATABASE_USER_SETUP.md](DATABASE_USER_SETUP.md) for detailed instructions.

### 3. Verify Database Connection

```bash
# Test PostgreSQL connection with API user
psql -h $DB_HOST -U osm_notes_api_user -d $DB_NAME -c "SELECT 1;"

# Verify read-only access (should work)
psql -h $DB_HOST -U osm_notes_api_user -d $DB_NAME \
     -c "SELECT COUNT(*) FROM dwh.datamartUsers LIMIT 1;"

# Verify write is denied (should fail)
psql -h $DB_HOST -U osm_notes_api_user -d $DB_NAME \
     -c "INSERT INTO dwh.datamartUsers (user_id) VALUES (999999);"
# Expected: ERROR: permission denied

# If connection fails, check:
# - Database server is accessible
# - Credentials are correct
# - Firewall allows connection
# - User has required permissions
```

### 4. Configure Redis (Optional but Recommended)

**Redis NO es necesario** - la API funciona sin Redis, pero es **recomendado para producción**.

**Sin Redis**:
- ✅ API funciona normalmente
- ⚠️ Rate limiting en memoria (se pierde al reiniciar)
- ⚠️ Sin cache (más carga en la base de datos)

**Con Redis**:
- ✅ Rate limiting distribuido y persistente
- ✅ Cache de respuestas (mejora performance)
- ✅ Mejor para producción y múltiples instancias

**Para deshabilitar Redis**: Deja `REDIS_HOST` vacío en `.env`:
```env
REDIS_HOST=
```

**Para habilitar Redis**:
```env
REDIS_HOST=localhost  # o IP del servidor Redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here  # si es requerido
REDIS_DB=0
```

### 5. Verify Redis Connection (if using)

```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# If password required:
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

## Deployment

### Method 1: Docker Compose v2 (Recommended)

**Note**: The server uses Docker Compose v2 (plugin), use `docker compose` (not `docker-compose`).

#### Initial Deployment

```bash
# Navigate to application directory
cd /opt/osm-notes-api

# Build and start services
docker compose -f docker/docker-compose.yml up -d

# Check status
docker compose -f docker/docker-compose.yml ps

# View logs
docker compose -f docker/docker-compose.yml logs -f api
```

#### Verify Deployment

```bash
# Health check
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" \
     http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "database": { "status": "up", ... },
#   "redis": { "status": "up", ... }
# }

# Test API endpoint
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/analytics/global
```

#### Update Deployment

```bash
# Pull latest code
cd /opt/osm-notes-api
git pull origin main

# Rebuild and restart
docker compose -f docker/docker-compose.yml up -d --build

# Verify
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" \
     http://localhost:3000/health
```

### Method 2: Docker Standalone

```bash
# Build image
docker build -f docker/Dockerfile -t osm-notes-api:0.1.0 .

# Run container
docker run -d \
  --name osm-notes-api \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  osm-notes-api:0.1.0

# Check logs
docker logs -f osm-notes-api
```

### Method 3: PM2 (Node.js Direct)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Build application
npm install --production
npm run build

# Start with PM2
pm2 start dist/index.js --name osm-notes-api --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow instructions shown

# Check status
pm2 status
pm2 logs osm-notes-api
```

## Reverse Proxy Setup (Nginx)

### Install Nginx

```bash
sudo apt-get install -y nginx
```

### Configure Nginx

Create `/etc/nginx/sites-available/osm-notes-api`:

```nginx
server {
    listen 80;
    server_name notes-api.osm.lat;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/osm-notes-api /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### SSL/TLS with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d notes-api.osm.lat

# Auto-renewal is configured automatically
```

## Monitoring Setup

### Prometheus and Grafana

If monitoring stack is needed:

```bash
# Start monitoring services
docker compose -f docker/docker-compose.yml --profile monitoring up -d

# Access Prometheus
# http://192.168.0.7:9090

# Access Grafana
# http://192.168.0.7:3001
# Default credentials: admin / admin (change on first login)
```

See [docs/MONITORING.md](MONITORING.md) for detailed monitoring setup.

## Post-Deployment Verification

### 1. Health Checks

```bash
# Basic health check
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" \
     http://localhost:3000/health

# Expected: 200 OK with healthy status
```

### 2. API Endpoints

```bash
# Test various endpoints
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/analytics/global

curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/users/1

curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/countries/42
```

### 3. Logs

```bash
# Check for errors
docker compose -f docker/docker-compose.yml logs api | grep -i error

# Or with PM2
pm2 logs osm-notes-api --lines 100 | grep -i error
```

### 4. Performance

```bash
# Check response times
time curl -H "User-Agent: Monitor/1.0 (ops@example.com)" \
          http://localhost:3000/health

# Should be < 1 second
```

## Maintenance

### View Logs

```bash
# Docker Compose
docker compose -f docker/docker-compose.yml logs -f api

# Docker standalone
docker logs -f osm-notes-api

# PM2
pm2 logs osm-notes-api
```

### Restart Service

```bash
# Docker Compose
docker compose -f docker/docker-compose.yml restart api

# Docker standalone
docker restart osm-notes-api

# PM2
pm2 restart osm-notes-api
```

### Update Application

```bash
cd /opt/osm-notes-api

# Pull latest code
git pull origin main

# Rebuild and restart (Docker Compose)
docker compose -f docker/docker-compose.yml up -d --build

# Or restart (PM2)
pm2 restart osm-notes-api
```

### Backup Configuration

```bash
# Backup .env file
cp .env .env.backup.$(date +%Y%m%d)

# Backup docker-compose.yml
cp docker/docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d)
```

## Troubleshooting

### Service Won't Start

1. **Check logs**:
   ```bash
   docker compose -f docker/docker-compose.yml logs api
   ```

2. **Verify environment variables**:
   ```bash
   docker compose -f docker/docker-compose.yml exec api env | grep DB_
   ```

3. **Test database connection**:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
   ```

### High Memory Usage

1. **Check container stats**:
   ```bash
   docker stats osm-notes-api
   ```

2. **Reduce connection pool** (in `.env`):
   ```env
   DB_MAX_CONNECTIONS=10
   ```

### Slow Response Times

1. **Check database performance**
2. **Verify Redis is working** (if configured - optional)
3. **Check network latency** between API and database
4. **Review slow queries** using `scripts/analyze_queries.sql`

## Rollback Procedure

If deployment fails:

```bash
# Stop current version
docker compose -f docker/docker-compose.yml down

# Checkout previous version
cd /opt/osm-notes-api
git checkout <previous-tag-or-commit>

# Restart
docker compose -f docker/docker-compose.yml up -d

# Verify
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" \
     http://localhost:3000/health
```

## Security Checklist

- [ ] Firewall configured (only necessary ports open)
- [ ] SSL/TLS enabled (HTTPS)
- [ ] Strong passwords for all credentials
- [ ] Database user has read-only permissions
- [ ] `.env` file has restricted permissions (`chmod 600 .env`)
- [ ] Regular security updates (`apt-get update && apt-get upgrade`)
- [ ] Monitoring and alerting configured
- [ ] Logs are being monitored
- [ ] Backups configured

## Automation (Optional)

### Deployment Script

Create `deploy.sh`:

```bash
#!/bin/bash
set -e

cd /opt/osm-notes-api

echo "Pulling latest code..."
git pull origin main

echo "Building and restarting..."
docker compose -f docker/docker-compose.yml up -d --build

echo "Waiting for service to start..."
sleep 10

echo "Verifying health..."
curl -f -H "User-Agent: Deploy/1.0 (ops@example.com)" \
     http://localhost:3000/health || exit 1

echo "Deployment successful!"
```

Make executable:
```bash
chmod +x deploy.sh
```

Run:
```bash
./deploy.sh
```

## Support

For deployment issues:

1. Check logs: `docker compose -f docker/docker-compose.yml logs api`
2. Verify health: `curl http://localhost:3000/health`
3. Review documentation:
   - [DEPLOYMENT.md](DEPLOYMENT.md) - General deployment guide
   - [RUNBOOK.md](RUNBOOK.md) - Operations runbook
   - [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
4. Open GitHub issue with deployment details

---

**Last Updated**: 2025-12-28
cu[al