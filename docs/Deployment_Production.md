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

**Password with special characters**: If the password contains `#`, use **double quotes** in `.env` so the rest is not treated as a comment. Single quotes may be included in the value by some parsers.

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

See [docs/DATABASE_USER_SETUP.md](Database_User_Setup.md) for detailed instructions.

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

**Note**: The server uses Docker Compose v2 (plugin), use `docker compose` (not `docker-compose`). On this server, **PostgreSQL (Analytics/Ingestion) and Redis run on the host**, not in containers—so the recommended Docker option is **API only** with `docker-compose.host-db.yml`.

### Method 1: Docker Compose – API only, host DB/Redis (Recommended for this server)

Use when PostgreSQL and Redis already run on the host (e.g. `notes_dwh`, system Redis). Only the API runs in a container; it connects to the host via `host.docker.internal`.

#### Initial Deployment

```bash
cd /opt/osm-notes-api

# Ensure .env has DB_PASSWORD (use double quotes if password contains #)
# --env-file .env loads variables from project root (Compose otherwise looks in docker/)
docker compose -f docker/docker-compose.host-db.yml --env-file .env up -d --build

# Check status
docker compose -f docker/docker-compose.host-db.yml ps

# View logs
docker compose -f docker/docker-compose.host-db.yml logs -f api
```

#### Redis when using Docker (host-db)

This compose starts a **Redis container** for the API by default. The host’s Redis is not used and does not need to be changed.

- **Default:** API uses the `redis` service in this stack (Redis in Docker). No host Redis config needed.
- **Use host Redis instead:** set in `.env`: `REDIS_HOST_DOCKER=host.docker.internal` and ensure host Redis listens on `0.0.0.0` or `172.17.0.1` (see Option B below).
- **No Redis:** set in `.env`: `REDIS_HOST_DOCKER=disabled`. The API uses in-memory rate limiting; you can stop the Redis container to save resources: `docker compose -f docker/docker-compose.host-db.yml stop redis`.

**Option A – Default: Redis in Docker (recommended)**  
Just run the stack; the API uses the Redis container. No host Redis configuration required.

**Option B – Use Redis on the host instead**

1. **Edit Redis config** (on the host). Config is often `/etc/redis/redis.conf` or `/etc/redis.conf`:
   ```bash
   sudo nano /etc/redis/redis.conf
   ```
2. **Set `bind`** so Redis listens on an interface reachable from Docker. Either:
   - `bind 0.0.0.0` — listen on all interfaces (simplest; restrict with firewall if needed), or
   - `bind 127.0.0.1 172.17.0.1` — localhost plus Docker bridge (if 172.17.0.1 is your host’s Docker bridge).
3. **Optional: password.** If you use `requirepass yourpassword`, set in `.env`:
   ```env
   REDIS_PASSWORD=yourpassword
   ```
4. **Restart Redis:**
   ```bash
   sudo systemctl restart redis-server
   # or: sudo systemctl restart redis
   ```
5. **Allow port 6379** from Docker bridge if you use a firewall (e.g. UFW):
   ```bash
   sudo ufw allow from 172.17.0.0/16 to any port 6379
   sudo ufw status
   ```
6. **Use host Redis from the container:** in `.env` set `REDIS_HOST_DOCKER=host.docker.internal`, then:
   ```bash
   docker compose -f docker/docker-compose.host-db.yml --env-file .env up -d
   ```
   Check logs: you should see "Using Redis store for rate limiting" and no `ECONNREFUSED`. Health will show `"redis": { "status": "up" }`.

**Option C – Disable Redis**  
To use in-memory rate limiting, add to `.env`:

```env
REDIS_HOST_DOCKER=disabled
```

Then recreate the stack:  
`docker compose -f docker/docker-compose.host-db.yml --env-file .env up -d`.  
Optionally stop the Redis container: `docker compose -f docker/docker-compose.host-db.yml stop redis`.

#### Verify Deployment

```bash
# Health check (port from .env PORT, default 3010; /health does not require User-Agent)
curl -s http://localhost:3010/health

# With User-Agent (required for other API routes)
curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3010/health

# Version headers
curl -sI http://localhost:3010/health | grep -i x-api

# Metrics (for monitoring verification)
curl -s http://localhost:3010/metrics | head -5
```

#### Update Deployment

```bash
cd /opt/osm-notes-api
git pull origin main

docker compose -f docker/docker-compose.host-db.yml --env-file .env up -d --build

curl -H "User-Agent: Monitor/1.0 (ops@example.com)" http://localhost:3010/health
```

To remove leftover postgres/redis containers from a previous full-stack run:  
`docker compose -f docker/docker-compose.host-db.yml down --remove-orphans`

Requires Docker 20.10+ (for `host-gateway`). Port mapping: `${PORT:-3010}:3000`.

### Alternative: Docker Compose full stack (API + Postgres + Redis in containers)

Use only if you want the API, PostgreSQL, and Redis **all in containers** (e.g. testing or a environment without a host DB). Not for this server when Analytics/Ingestion DB and Redis are on the host.

```bash
cd /opt/osm-notes-api
# Requires .env with DB_PASSWORD set (used by the postgres container)
docker compose -f docker/docker-compose.yml up -d --build
docker compose -f docker/docker-compose.yml ps
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

### Method 3: Systemd (recommended for single-instance, e.g. port 3010)

A unit file is provided so the API runs as a system service and survives reboots:

```bash
# Build first (--ignore-scripts avoids prepare/husky failing when dev deps are omitted)
cd /home/notes/OSM-Notes-API   # or your install path
npm ci --omit=dev --ignore-scripts
npm run build

# Install unit file
sudo cp deploy/osm-notes-api.service /etc/systemd/system/
# Edit if User, WorkingDirectory, or PORT differ (default: User=notes, PORT=3010)
sudo nano /etc/systemd/system/osm-notes-api.service

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable osm-notes-api
sudo systemctl start osm-notes-api
sudo systemctl status osm-notes-api
```

Verify:

```bash
curl -s -H "User-Agent: Test/1.0 (a@b.com)" http://127.0.0.1:3010/health
curl -s -H "User-Agent: Test/1.0 (a@b.com)" "http://127.0.0.1:3010/notes-api/v1/notes?limit=2"
```

See [deploy/README.md](../deploy/README.md) for details and log commands (`journalctl -u osm-notes-api -f`).

### Method 4: PM2 (Node.js Direct)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Build application (--ignore-scripts avoids prepare/husky when using --omit=dev)
npm ci --omit=dev --ignore-scripts
npm run build

# Start with PM2 (set PORT in .env or here)
PORT=3010 pm2 start dist/index.js --name osm-notes-api --env production

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
# From project root (same repo; API may be running via host-db compose)
docker compose -f docker/docker-compose.yml --profile monitoring up -d prometheus grafana

# Access Prometheus
# http://192.168.0.7:9090

# Access Grafana
# http://192.168.0.7:3001
# Default credentials: admin / admin (change on first login)
```

**Servidor 192.168.0.7**: En este host suelen estar ocupados el puerto **3000** (Node, Terranote) y el **3001** (uvicorn, Terranote). Además hay una **Grafana en systemd** (`grafana-server.service`). Para levantar la Grafana de este proyecto sin conflicto, usa otro puerto (p. ej. `GRAFANA_PORT=3002`). Si prefieres usar la Grafana ya instalada, añade en ella un datasource de tipo Prometheus apuntando al Prometheus que scrapea la API (puerto 9090).

**Comprobar qué usa cada puerto** (en el servidor):

```bash
# Qué proceso escucha en 3001 y 3000
sudo ss -tlnp | grep -E ':3000|:3001'
# o
sudo lsof -i :3000 -i :3001
```

Si 3001 está ocupado, usa otro puerto para esta Grafana (p. ej. 3002):

```bash
GRAFANA_PORT=3002 docker compose -f docker/docker-compose.yml --profile monitoring up -d prometheus grafana
# Acceso: http://192.168.0.7:3002
```

**When the API runs with host-db** (port 3010 on the host), Prometheus must scrape the host. The repo’s `docker/prometheus/prometheus.yml` already has target `host.docker.internal:3010` and the compose adds `extra_hosts` for Prometheus. See [docs/Monitoring.md](Monitoring.md) for details.

### Cómo monitorear la API con Prometheus (pasos)

Supón que la API ya corre con host-db en el puerto **3010**. Para monitorearla con Prometheus (y opcionalmente Grafana):

1. **Levantar solo Prometheus y Grafana** (desde el mismo repo, sin tocar la API en host-db):
   ```bash
   cd /opt/osm-notes-api
   docker compose -f docker/docker-compose.yml --profile monitoring up -d prometheus grafana
   ```
   Se levantan solo los contenedores de Prometheus y Grafana; la API sigue en el compose host-db.

2. **Comprobar que Prometheus scrapea la API**
   - Abre **http://192.168.0.7:9090** (o tu servidor).
   - **Status** → **Targets**.
   - El job **osm-notes-api** debe estar **UP** (target `host.docker.internal:3010`). Si está DOWN, revisa que la API responda: `curl -s http://localhost:3010/metrics | head -5`.

3. **Ver métricas en Prometheus**
   - **Graph** → en la query escribe `http_requests_total` o `up{job="osm-notes-api"}` → **Execute**. Debe haber series.

4. **Grafana (opcional)**
   - **http://192.168.0.7:3001** → usuario `admin`, contraseña `admin` (o `GRAFANA_PASSWORD`).
   - **Connections** → **Data sources** → Prometheus ya está configurado. **Save & test**.
   - **Dashboards** → usa o crea dashboards que usen esas métricas (p. ej. solicitudes/segundo, latencia, errores). Ver [docs/Monitoring.md](Monitoring.md) para dashboards incluidos.

5. **Persistencia**
   - Prometheus y Grafana usan volúmenes; si haces `docker compose ... down` sin `-v`, los datos se mantienen. Para que arranquen con el sistema puedes usar un servicio systemd o un cron que ejecute el `docker compose ... up -d` al inicio.

### Qué revisar si ya tienes Prometheus y Grafana

1. **Prometheus – target de la API en UP**
   - Abre `http://<servidor>:9090` → **Status** → **Targets**.
   - Debe aparecer el job `osm-notes-api` (o el que scrapee `/metrics`) con estado **UP**.
   - Si está **DOWN**, comprueba que el target sea la URL correcta de la API (con host-db suele ser `host.docker.internal:3010` o `<ip-del-host>:3010`).

2. **Prometheus – que haya métricas**
   - En Prometheus: **Graph** → consulta `http_requests_total` (o `up{job="osm-notes-api"}`) → **Execute**. Debe devolver series si la API está siendo scrapeada.

3. **Grafana – datasource**
   - **Connections** (o **Configuration**) → **Data sources** → **Prometheus** debe estar en verde y probar bien (“Save & test”).

4. **Grafana – dashboards**
   - **Dashboards** → abre el dashboard de la API (p. ej. “API Overview” o “Rate Limiting”). Debe haber gráficos con datos recientes (genera algo de tráfico a la API si está en cero).

5. **Alertas (opcional)**
   - Las reglas están en `docker/prometheus/alerts.yml`. En Prometheus → **Status** → **Rules** verifica que no haya errores de carga.

See [docs/Monitoring.md](Monitoring.md) for detailed monitoring setup.

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
     http://localhost:3000/notes-api/v1/analytics/global

curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/notes-api/v1/users/1

curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/notes-api/v1/countries/42
```

### 3. Logs

```bash
# Check for errors
docker compose -f docker/docker-compose.yml logs api | grep -i error

# Or with PM2
pm2 logs osm-notes-api --lines 100 | grep -i error
```

### 4. Monitoring (metrics endpoint)

The API exposes Prometheus metrics at `/metrics`. Verifying it responds confirms the monitoring pipeline can scrape the API (no User-Agent required):

```bash
# Replace 3010 with your PORT if different (host-db compose)
curl -s http://localhost:3010/metrics | head -30
# Expect: Prometheus-style lines (e.g. # HELP, # TYPE, http_requests_total)
```

If you use the full stack with the monitoring profile (Prometheus + Grafana), also confirm Prometheus is scraping: open `http://<server>:9090`, check Status → Targets, and ensure the API target is UP. See [docs/Monitoring.md](Monitoring.md) for details.

### 5. Performance

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
   - [DEPLOYMENT.md](Deployment.md) - General deployment guide
   - [RUNBOOK.md](Runbook.md) - Operations runbook
   - [TROUBLESHOOTING.md](Troubleshooting.md) - Common issues
4. Open GitHub issue with deployment details

---

**Last Updated**: 2025-12-28
cu[al
