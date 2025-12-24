# Manual de Uso

Guía para usar OSM Notes API.

## Autenticación

### User-Agent Requerido

**Todos los requests DEBEN incluir un header `User-Agent` con formato específico:**

```
User-Agent: <AppName>/<Version> (<Contact>)
```

**Componentes**:
- `<AppName>`: Nombre de la aplicación (letras, números, guiones, puntos)
- `<Version>`: Versión de la aplicación
- `<Contact>`: **REQUERIDO** - Email o URL del proyecto

**Ejemplos Válidos**:
```
User-Agent: MyOSMApp/1.0 (contact@example.com)
User-Agent: Terranote/1.0 (https://github.com/Terranote/terranote-core)
User-Agent: ResearchTool/0.5 (researcher@university.edu)
```

**Ejemplos Inválidos**:
```
User-Agent: MyApp/1.0                    # ❌ Falta contacto
User-Agent: MyApp                        # ❌ Falta versión y contacto
User-Agent: MyApp/1.0 (invalid)         # ❌ Contacto no válido
```

### Rate Limiting

- **Anónimo**: 50 requests/15min por IP + User-Agent
- **Autenticado**: 1000 requests/hora (cuando OAuth esté disponible en Fase 5)
- **Bots detectados**: 10 requests/hora

Los headers de respuesta incluyen información de rate limiting:
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 49
X-RateLimit-Reset: 1234567890
```

### Protección Anti-Abuso

La API detecta y bloquea automáticamente:

- **AIs conocidas**: Requieren OAuth (GPT, Claude, ChatGPT, etc.)
- **Bots conocidos**: Rate limiting muy restrictivo (curl, python-requests, etc.)

## Endpoints Disponibles

### Base URL

```
http://localhost:3000/api/v1
```

### Health Check

```bash
GET /health
```

Verifica el estado de la API y sus dependencias.

**Ejemplo**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/health
```

**Respuesta**:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-12-14T10:00:00.000Z"
}
```

## Ejemplos de Uso

### Obtener Perfil de Usuario

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/users/12345
```

### Obtener Perfil de País

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/countries/CO
```

### Búsqueda de Notas

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?status=open&limit=10"
```

## Manejo de Errores

### Códigos de Estado HTTP

- `200 OK`: Request exitoso
- `400 Bad Request`: Request inválido (User-Agent faltante, parámetros inválidos)
- `403 Forbidden`: Acceso denegado (AI sin OAuth, bot bloqueado)
- `404 Not Found`: Recurso no encontrado
- `429 Too Many Requests`: Rate limit excedido
- `500 Internal Server Error`: Error del servidor

### Formato de Errores

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error details"
  }
}
```

**Ejemplo**:
```json
{
  "error": "Invalid User-Agent",
  "message": "User-Agent must follow format: AppName/Version (Contact)",
  "details": {
    "format": "AppName/Version (Contact)",
    "received": "MyApp/1.0"
  }
}
```

## Mejores Prácticas

### 1. Siempre incluye User-Agent

```bash
# ✅ Correcto
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/users/12345

# ❌ Incorrecto
curl http://localhost:3000/api/v1/users/12345
```

### 2. Respeta Rate Limits

- Implementa retry con backoff exponencial
- Respeta los headers `X-RateLimit-*`
- Usa `X-RateLimit-Reset` para saber cuándo reintentar

### 3. Maneja Errores Apropiadamente

```javascript
try {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MyApp/1.0 (contact@example.com)' }
  });
  
  if (response.status === 429) {
    const resetTime = response.headers.get('X-RateLimit-Reset');
    // Esperar hasta resetTime
  }
  
  const data = await response.json();
} catch (error) {
  // Manejar error
}
```

### 4. Usa Paginación

Para endpoints que retornan listas, usa paginación:

```bash
GET /api/v1/users?limit=50&offset=0
```

### 5. Cachea Respuestas

Las respuestas incluyen headers de cache cuando aplica. Respeta `Cache-Control` y `ETag`.

## Documentación Completa

Para documentación completa de todos los endpoints:

- **Swagger UI**: `http://localhost:3000/docs` (cuando esté disponible)
- **OpenAPI Spec**: `http://localhost:3000/api-docs.json` (cuando esté disponible)
- **Documentación**: Ver [docs/api/](api/) para especificaciones completas

## Soporte

Si tienes preguntas sobre el uso de la API:

1. Revisa la documentación completa
2. Verifica los ejemplos en este manual
3. Abre un issue en GitHub si encuentras problemas

