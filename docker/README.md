# Docker Configuration

Este directorio contiene la configuración de Docker para OSM Notes API.

## Archivos

- `Dockerfile` - Imagen de producción multi-stage
- `docker-compose.yml` - Configuración principal con todos los servicios
- `docker-compose.dev.yml` - Override para desarrollo
- `prometheus/prometheus.yml` - Configuración de Prometheus

## Uso

### Desarrollo Local

```bash
# Levantar todos los servicios
docker-compose -f docker/docker-compose.yml up -d

# Ver logs
docker-compose -f docker/docker-compose.yml logs -f api

# Detener servicios
docker-compose -f docker/docker-compose.yml down

# Reconstruir imagen
docker-compose -f docker/docker-compose.yml build --no-cache api
```

### Desarrollo con Hot Reload

```bash
# Usar override de desarrollo
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up
```

### Producción

```bash
# Build de producción
docker build -f docker/Dockerfile -t osm-notes-api:latest .

# Ejecutar contenedor
docker run -d \
  --name osm-notes-api \
  -p 3000:3000 \
  --env-file .env \
  osm-notes-api:latest
```

### Con Monitoreo (Prometheus + Grafana)

```bash
# Levantar con perfil de monitoreo
docker-compose -f docker/docker-compose.yml --profile monitoring up -d

# Acceder a:
# - API: http://localhost:3000
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (admin/admin)
```

## Servicios

### API
- Puerto: 3000
- Health check: `/health`
- Documentación: `/docs`

### PostgreSQL
- Puerto: 5432
- Base de datos: `osm_notes_dwh`
- Usuario: `analytics_user`
- Volumen persistente: `postgres_data`

### Redis
- Puerto: 6379
- Volumen persistente: `redis_data`
- Password: Configurado en `.env`

### Prometheus (Opcional)
- Puerto: 9090
- Perfil: `monitoring`
- Volumen persistente: `prometheus_data`

### Grafana (Opcional)
- Puerto: 3001
- Perfil: `monitoring`
- Usuario: `admin`
- Password: Configurado en `.env` (GRAFANA_PASSWORD)
- Volumen persistente: `grafana_data`

## Variables de Entorno

Copia `.env.example` a `.env` y configura:

```bash
# Base de datos
DB_NAME=osm_notes_dwh
DB_USER=analytics_user
DB_PASSWORD=your_password

# Redis
REDIS_PASSWORD=your_redis_password

# Grafana (opcional)
GRAFANA_PASSWORD=admin
```

## Troubleshooting

### Ver logs de un servicio
```bash
docker-compose -f docker/docker-compose.yml logs -f <service_name>
```

### Ejecutar comandos en contenedor
```bash
docker-compose -f docker/docker-compose.yml exec api sh
```

### Limpiar volúmenes
```bash
docker-compose -f docker/docker-compose.yml down -v
```

### Reconstruir sin cache
```bash
docker-compose -f docker/docker-compose.yml build --no-cache
```

