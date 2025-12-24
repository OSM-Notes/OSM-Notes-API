# Docker Configuration

This directory contains Docker configuration for OSM Notes API.

## Files

- `Dockerfile` - Multi-stage production image
- `docker-compose.yml` - Main configuration with all services
- `docker-compose.dev.yml` - Development override
- `prometheus/prometheus.yml` - Prometheus configuration

## Usage

### Local Development

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f api

# Stop services
docker-compose -f docker/docker-compose.yml down

# Rebuild image
docker-compose -f docker/docker-compose.yml build --no-cache api
```

### Development with Hot Reload

```bash
# Use development override
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up
```

### Production

```bash
# Production build
docker build -f docker/Dockerfile -t osm-notes-api:latest .

# Run container
docker run -d \
  --name osm-notes-api \
  -p 3000:3000 \
  --env-file .env \
  osm-notes-api:latest
```

### With Monitoring (Prometheus + Grafana)

```bash
# Start with monitoring profile
docker-compose -f docker/docker-compose.yml --profile monitoring up -d

# Access:
# - API: http://localhost:3000
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (admin/admin)
```

## Services

### API
- Port: 3000
- Health check: `/health`
- Documentation: `/docs`

### PostgreSQL
- Port: 5432
- Database: `osm_notes_dwh`
- User: `analytics_user`
- Persistent volume: `postgres_data`

### Redis
- Port: 6379
- Persistent volume: `redis_data`
- Password: Configured in `.env`

### Prometheus (Optional)
- Port: 9090
- Profile: `monitoring`
- Persistent volume: `prometheus_data`

### Grafana (Optional)
- Port: 3001
- Profile: `monitoring`
- User: `admin`
- Password: Configured in `.env` (GRAFANA_PASSWORD)
- Persistent volume: `grafana_data`

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DB_NAME=osm_notes_dwh
DB_USER=analytics_user
DB_PASSWORD=your_password

# Redis
REDIS_PASSWORD=your_redis_password

# Grafana (optional)
GRAFANA_PASSWORD=admin
```

## Troubleshooting

### View service logs
```bash
docker-compose -f docker/docker-compose.yml logs -f <service_name>
```

### Execute commands in container
```bash
docker-compose -f docker/docker-compose.yml exec api sh
```

### Clean volumes
```bash
docker-compose -f docker/docker-compose.yml down -v
```

### Rebuild without cache
```bash
docker-compose -f docker/docker-compose.yml build --no-cache
```
