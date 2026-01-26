---
title: "Redis - Optional but Recommended"
description: "Redis is optional for OSM Notes API - the API works perfectly without Redis, but Redis provides caching and rate limiting benefits"
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "redis"
  - "performance"
audience:
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# Redis - Optional but Recommended

## Is Redis needed?

**NO, Redis is NOT required** - the API works perfectly without Redis.

However, **Redis is recommended for production** because it improves performance and enables distributed rate limiting.

## What happens without Redis?

### ✅ API works normally

Without Redis configured (empty `REDIS_HOST`), the API works with:

- **Rate Limiting**: Uses in-memory storage
  - ✅ Works correctly
  - ⚠️ Lost on server restart
  - ⚠️ Not shared between multiple instances

- **Cache**: Disabled
  - ✅ API works normally
  - ⚠️ All queries go to the database
  - ⚠️ Higher load on PostgreSQL

### Example configuration without Redis

```env
# .env
REDIS_HOST=  # Empty = Redis disabled
# REDIS_PORT=6379  # Not needed
# REDIS_PASSWORD=  # Not needed
```

The API will automatically detect that Redis is not available and will use:
- In-memory rate limiting
- No cache (all responses generated from DB)

## What happens with Redis?

### ✅ Production improvements

With Redis configured, you get:

- **Distributed Rate Limiting**:
  - ✅ Persistent across restarts
  - ✅ Shared between multiple API instances
  - ✅ Better for horizontal scaling

- **Response Caching**:
  - ✅ Reduces load on PostgreSQL
  - ✅ Faster responses
  - ✅ Better user experience

### Example configuration with Redis

```env
# .env
REDIS_HOST=localhost  # or Redis server IP
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password  # if required
REDIS_DB=0
```

## How the code works

The code is designed with **"graceful degradation"**:

### Rate Limiting (`src/middleware/rateLimit.ts`)

```typescript
// If Redis is not available, use memory
if (!redisClient) {
  logger.warn('Using in-memory rate limit store (Redis not available)');
  return undefined; // express-rate-limit uses memory by default
}
```

### Cache (`src/middleware/cache.ts`)

```typescript
// If Redis is not available, continue without caching
if (!redisClient) {
  res.setHeader('X-Cache', 'DISABLED');
  return next(); // Continue normally
}
```

### Health Check (`src/routes/health.ts`)

The health check shows Redis status:

```json
{
  "status": "healthy",  // or "degraded" if Redis is down
  "redis": {
    "status": "up",  // "down" or "not_configured"
    "host": "localhost",
    "port": 6379
  }
}
```

- `status: "healthy"` - Everything works (DB + Redis if configured)
- `status: "degraded"` - DB works but Redis is down (API continues working)

## When to use Redis

### ✅ Use Redis if:

- **Production**: Better performance and distributed rate limiting
- **Multiple instances**: You need shared rate limiting
- **High traffic**: Cache reduces database load
- **Scalability**: You plan to scale horizontally

### ❌ You don't need Redis if:

- **Local development**: You can use memory only
- **Testing**: You don't need persistence
- **Low traffic**: The DB can handle the load
- **Single instance**: In-memory rate limiting is sufficient

## Redis Installation

### Option 1: Docker Compose (Recommended)

Already included in `docker/docker-compose.yml`:

```bash
cd docker
docker compose up -d redis
```

### Option 2: Local Installation

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

**Verify**:
```bash
redis-cli ping
# Should respond: PONG
```

## Security Configuration

### Production

1. **Use password**:
   ```bash
   redis-cli CONFIG SET requirepass "your_secure_password"
   ```

2. **Restrict access**:
   - Only allow connections from the API
   - Use firewall (iptables/ufw)
   - Don't expose Redis to the internet

3. **Configuration in `.env`**:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=your_secure_password
   REDIS_DB=0
   ```

## Verification

### Verify Redis is working

```bash
# Test connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# With password
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

### Verify from API

```bash
# Health check
curl http://localhost:3000/health

# Should show:
# "redis": { "status": "up", ... }
```

### Verify rate limiting with Redis

```bash
# Check rate limiting keys
redis-cli KEYS "rate-limit:*"

# Check specific value
redis-cli GET "rate-limit:192.168.1.1:MyApp/1.0"
```

### Verify cache

```bash
# Check cache keys
redis-cli KEYS "cache:*"

# Check specific value
redis-cli GET "cache:GET:/api/v1/users/123:"
```

## Troubleshooting

### Redis not available

**Symptoms**:
- Logs show: `Using in-memory rate limit store`
- Health check: `"redis": { "status": "not_configured" }`
- Error: `Connection refused`

**Solution**:
- Verify `REDIS_HOST` is configured in `.env`
- Verify Redis is running: `sudo systemctl status redis-server`
- Start Redis if not running: `sudo systemctl start redis-server`
- Verify network connectivity: `redis-cli ping`
- If Redis is on the same machine, use `REDIS_HOST=localhost`
- See [TROUBLESHOOTING_REDIS.md](Troubleshooting_Redis.md) for detailed steps

### Redis is down but API works

**Symptoms**:
- Health check: `"status": "degraded"`
- Logs show: `Redis connection failed`

**Solution**:
- API works normally (graceful degradation)
- Redis is optional, not critical
- Fix Redis when convenient

### Rate limiting doesn't work between instances

**Cause**: Redis not configured, using memory

**Solution**: Configure Redis for distributed rate limiting

## Summary

| Feature | Without Redis | With Redis |
|---------|---------------|------------|
| **API works** | ✅ Yes | ✅ Yes |
| **Rate limiting** | ✅ Memory | ✅ Distributed |
| **Cache** | ❌ No | ✅ Yes |
| **Persistence** | ❌ No | ✅ Yes |
| **Multiple instances** | ⚠️ Limited | ✅ Yes |
| **Performance** | ✅ Good | ✅ Better |

**Conclusion**: Redis is NOT required, but is **highly recommended for production**.

---

**Last updated**: 2025-12-28
