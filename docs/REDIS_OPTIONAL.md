# Redis - Opcional pero Recomendado

## ¿Se necesita Redis?

**NO, Redis NO es necesario** - la API funciona perfectamente sin Redis.

Sin embargo, **Redis es recomendado para producción** porque mejora el rendimiento y permite rate limiting distribuido.

## ¿Qué pasa sin Redis?

### ✅ La API funciona normalmente

Sin Redis configurado (`REDIS_HOST` vacío), la API funciona con:

- **Rate Limiting**: Usa almacenamiento en memoria
  - ✅ Funciona correctamente
  - ⚠️ Se pierde al reiniciar el servidor
  - ⚠️ No es compartido entre múltiples instancias

- **Cache**: Deshabilitado
  - ✅ La API funciona normalmente
  - ⚠️ Todas las consultas van a la base de datos
  - ⚠️ Mayor carga en PostgreSQL

### Ejemplo de configuración sin Redis

```env
# .env
REDIS_HOST=  # Vacío = Redis deshabilitado
# REDIS_PORT=6379  # No necesario
# REDIS_PASSWORD=  # No necesario
```

La API detectará automáticamente que Redis no está disponible y usará:
- Rate limiting en memoria
- Sin cache (todas las respuestas se generan desde la DB)

## ¿Qué pasa con Redis?

### ✅ Mejoras para producción

Con Redis configurado, obtienes:

- **Rate Limiting Distribuido**:
  - ✅ Persistente entre reinicios
  - ✅ Compartido entre múltiples instancias de la API
  - ✅ Mejor para escalado horizontal

- **Cache de Respuestas**:
  - ✅ Reduce carga en PostgreSQL
  - ✅ Respuestas más rápidas
  - ✅ Mejor experiencia de usuario

### Ejemplo de configuración con Redis

```env
# .env
REDIS_HOST=localhost  # o IP del servidor Redis
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password  # si es requerido
REDIS_DB=0
```

## Cómo funciona el código

El código está diseñado con **"graceful degradation"**:

### Rate Limiting (`src/middleware/rateLimit.ts`)

```typescript
// Si Redis no está disponible, usa memoria
if (!redisClient) {
  logger.warn('Using in-memory rate limit store (Redis not available)');
  return undefined; // express-rate-limit usa memoria por defecto
}
```

### Cache (`src/middleware/cache.ts`)

```typescript
// Si Redis no está disponible, continúa sin cachear
if (!redisClient) {
  res.setHeader('X-Cache', 'DISABLED');
  return next(); // Continúa normalmente
}
```

### Health Check (`src/routes/health.ts`)

El health check muestra el estado de Redis:

```json
{
  "status": "healthy",  // o "degraded" si Redis está down
  "redis": {
    "status": "up",  // "down" o "not_configured"
    "host": "localhost",
    "port": 6379
  }
}
```

- `status: "healthy"` - Todo funciona (DB + Redis si está configurado)
- `status: "degraded"` - DB funciona pero Redis está down (API sigue funcionando)

## Cuándo usar Redis

### ✅ Usa Redis si:

- **Producción**: Mejor rendimiento y rate limiting distribuido
- **Múltiples instancias**: Necesitas rate limiting compartido
- **Alto tráfico**: Cache reduce carga en la base de datos
- **Escalabilidad**: Planeas escalar horizontalmente

### ❌ No necesitas Redis si:

- **Desarrollo local**: Puedes usar solo memoria
- **Testing**: No necesitas persistencia
- **Bajo tráfico**: La DB puede manejar la carga
- **Una sola instancia**: Rate limiting en memoria es suficiente

## Instalación de Redis

### Opción 1: Docker Compose (Recomendado)

Ya está incluido en `docker/docker-compose.yml`:

```bash
cd docker
docker compose up -d redis
```

### Opción 2: Instalación local

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

**macOS**:
```bash
brew install redis
brew services start redis
```

**Verificar**:
```bash
redis-cli ping
# Debe responder: PONG
```

## Configuración de Seguridad

### Producción

1. **Usa contraseña**:
   ```bash
   redis-cli CONFIG SET requirepass "your_secure_password"
   ```

2. **Restringe acceso**:
   - Solo permite conexiones desde la API
   - Usa firewall (iptables/ufw)
   - No expongas Redis a internet

3. **Configuración en `.env`**:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_secure_password
   REDIS_DB=0
   ```

## Verificación

### Verificar que Redis funciona

```bash
# Test conexión
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# Con contraseña
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

### Verificar desde la API

```bash
# Health check
curl http://localhost:3000/health

# Debe mostrar:
# "redis": { "status": "up", ... }
```

### Verificar rate limiting con Redis

```bash
# Verificar keys de rate limiting
redis-cli KEYS "rate-limit:*"

# Ver valor específico
redis-cli GET "rate-limit:192.168.1.1:MyApp/1.0"
```

### Verificar cache

```bash
# Ver keys de cache
redis-cli KEYS "cache:*"

# Ver valor específico
redis-cli GET "cache:GET:/api/v1/users/123:"
```

## Troubleshooting

### Redis no está disponible

**Síntomas**:
- Logs muestran: `Using in-memory rate limit store`
- Health check: `"redis": { "status": "not_configured" }`
- Error: `Connection refused`

**Solución**:
- Verifica que `REDIS_HOST` esté configurado en `.env`
- Verifica que Redis esté corriendo: `sudo systemctl status redis-server`
- Inicia Redis si no está corriendo: `sudo systemctl start redis-server`
- Verifica conectividad de red: `redis-cli ping`
- Si Redis está en la misma máquina, usa `REDIS_HOST=localhost`
- Ver [TROUBLESHOOTING_REDIS.md](TROUBLESHOOTING_REDIS.md) para pasos detallados

### Redis está down pero API funciona

**Síntomas**:
- Health check: `"status": "degraded"`
- Logs muestran: `Redis connection failed`

**Solución**:
- La API funciona normalmente (graceful degradation)
- Redis es opcional, no es crítico
- Arregla Redis cuando sea conveniente

### Rate limiting no funciona entre instancias

**Causa**: Redis no está configurado, usando memoria

**Solución**: Configura Redis para rate limiting distribuido

## Resumen

| Característica | Sin Redis | Con Redis |
|---------------|-----------|-----------|
| **API funciona** | ✅ Sí | ✅ Sí |
| **Rate limiting** | ✅ Memoria | ✅ Distribuido |
| **Cache** | ❌ No | ✅ Sí |
| **Persistencia** | ❌ No | ✅ Sí |
| **Múltiples instancias** | ⚠️ Limitado | ✅ Sí |
| **Rendimiento** | ✅ Bueno | ✅ Mejor |

**Conclusión**: Redis NO es necesario, pero es **altamente recomendado para producción**.

---

**Última actualización**: 2025-12-28
