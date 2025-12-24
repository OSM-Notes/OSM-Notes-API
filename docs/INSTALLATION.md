# Manual de Instalación

Guía completa para instalar y configurar OSM Notes API.

## Requisitos Previos

### Software Requerido

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 (o yarn/pnpm equivalente)
- **PostgreSQL**: >= 15.0
- **Redis**: >= 7.0 (opcional pero recomendado)

### Acceso a Base de Datos

La API requiere acceso a la base de datos de Analytics:
- **Base de datos**: `osm_notes_dwh`
- **Schema**: `dwh` (datamarts)
- **Usuario**: Con permisos de lectura en schema `dwh`
- **Foreign Data Wrappers**: Si las bases de datos están separadas, los FDW deben estar configurados

### Infraestructura

- **Servidor**: Recomendado 2-4 CPU cores, 4GB RAM mínimo
- **Red**: Baja latencia a PostgreSQL (< 5ms ideal)

## Instalación Local

### 1. Clonar Repositorio

```bash
git clone https://github.com/osmlatam/OSM-Notes-API.git
cd OSM-Notes-API
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:

```env
# Servidor
NODE_ENV=development
PORT=3000

# Base de datos
DB_HOST=192.168.0.7
DB_PORT=5432
DB_NAME=osm_notes_dwh
DB_USER=analytics_user
DB_PASSWORD=tu_password_aqui

# Redis
REDIS_HOST=192.168.0.7
REDIS_PORT=6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=info
```

### 4. Compilar TypeScript

```bash
npm run build
```

### 5. Verificar Instalación

```bash
# Verificar tipos
npm run type-check

# Ejecutar tests
npm test

# Verificar formato
npm run format:check
```

### 6. Iniciar Aplicación

```bash
# Producción
npm start

# Desarrollo (con hot reload)
npm run dev
```

La API estará disponible en `http://localhost:3000`

## Instalación con Docker

### Requisitos

- Docker >= 20.10
- Docker Compose >= 2.0

### Pasos

1. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Editar .env
   ```

2. **Levantar servicios**:
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

3. **Verificar que todo esté funcionando**:
   ```bash
   docker-compose -f docker/docker-compose.yml ps
   docker-compose -f docker/docker-compose.yml logs api
   ```

4. **Health check**:
   ```bash
   curl http://localhost:3000/health
   ```

Ver [docker/README.md](../docker/README.md) para más detalles sobre Docker.

## Verificación de Instalación

### Health Check

```bash
curl http://localhost:3000/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-12-14T10:00:00.000Z"
}
```

### Test de Conexión a Base de Datos

```bash
# Desde el contenedor o servidor
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM dwh.datamartUsers LIMIT 1;"
```

### Test de Conexión a Redis

```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

## Configuración Avanzada

### Variables de Entorno Completas

Ver `.env.example` para todas las variables disponibles:

- **Servidor**: PORT, NODE_ENV, API_VERSION
- **Base de datos**: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL
- **Redis**: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB
- **Rate Limiting**: RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS
- **OAuth**: OAUTH_ENABLED, OSM_OAUTH_CLIENT_ID, OSM_OAUTH_CLIENT_SECRET
- **Logging**: LOG_LEVEL, LOG_FORMAT
- **Métricas**: METRICS_ENABLED, METRICS_PORT
- **Documentación**: API_DOCS_ENABLED, API_DOCS_PATH

### Configuración de Base de Datos Externa

Si la base de datos está en un servidor remoto:

1. Asegúrate de que PostgreSQL permita conexiones remotas
2. Configura firewall para permitir conexiones desde el servidor de la API
3. Usa SSL si es posible:
   ```env
   DB_SSL=true
   ```

### Configuración de Redis Externa

Si Redis está en un servidor remoto:

1. Configura Redis para aceptar conexiones remotas
2. Configura password si es necesario:
   ```env
   REDIS_PASSWORD=tu_password_seguro
   ```

## Troubleshooting

### Error de Conexión a Base de Datos

```bash
# Verificar que PostgreSQL esté corriendo
systemctl status postgresql

# Verificar conexión
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Verificar permisos del usuario
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\du"
```

### Error de Conexión a Redis

```bash
# Verificar que Redis esté corriendo
redis-cli ping

# Verificar configuración
redis-cli CONFIG GET requirepass
```

### Puerto ya en Uso

```bash
# Ver qué proceso usa el puerto 3000
lsof -i :3000

# Cambiar puerto en .env
PORT=3001
```

### Problemas de Permisos

```bash
# Verificar permisos de archivos
ls -la

# Ajustar si es necesario
chmod +x scripts/*
```

## Próximos Pasos

Una vez instalado:

1. Lee [docs/USAGE.md](USAGE.md) para aprender a usar la API
2. Revisa [docs/api/](api/) para la documentación completa de endpoints
3. Consulta [CONTRIBUTING.md](../CONTRIBUTING.md) si quieres contribuir

## Soporte

Si encuentras problemas durante la instalación:

1. Revisa los logs: `npm run dev` o `docker-compose logs`
2. Verifica que todos los requisitos estén cumplidos
3. Abre un issue en GitHub con detalles del problema

