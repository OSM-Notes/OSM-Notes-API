# Usage Manual

Guide for using OSM Notes API.

## Authentication

### User-Agent Required

**All requests MUST include a `User-Agent` header with specific format:**

```
User-Agent: <AppName>/<Version> (<Contact>)
```

**Components**:
- `<AppName>`: Application name (letters, numbers, hyphens, dots)
- `<Version>`: Application version
- `<Contact>`: **REQUIRED** - Email or project URL

**Valid Examples**:
```
User-Agent: MyOSMApp/1.0 (contact@example.com)
User-Agent: Terranote/1.0 (https://github.com/Terranote/terranote-core)
User-Agent: ResearchTool/0.5 (researcher@university.edu)
```

**Invalid Examples**:
```
User-Agent: MyApp/1.0                    # ❌ Missing contact
User-Agent: MyApp                        # ❌ Missing version and contact
User-Agent: MyApp/1.0 (invalid)         # ❌ Invalid contact
```

### Rate Limiting

- **Anonymous**: 50 requests per 15 minutes per IP + User-Agent combination
- **Authenticated**: 1000 requests/hour (when OAuth is available in Phase 5)
- **Detected bots**: 10 requests/hour (when anti-abuse middleware is implemented)

**Rate limiting is enforced per IP address and User-Agent combination**, meaning:
- Different applications (different User-Agent) from the same IP have separate limits
- Same application from different IPs have separate limits
- Health check endpoint (`/health`) is excluded from rate limiting

**Response headers** include rate limiting information (standard headers):
```
RateLimit-Limit: 50
RateLimit-Remaining: 49
RateLimit-Reset: 1234567890
```

**When rate limit is exceeded**, you'll receive a `429 Too Many Requests` response:
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Maximum 50 requests per 15 minutes allowed.",
  "statusCode": 429
}
```

**Best practices**:
- Implement exponential backoff when receiving 429 responses
- Monitor the `RateLimit-Remaining` header to avoid hitting limits
- Use authenticated requests (OAuth) when available for higher limits

### Anti-Abuse Protection

The API automatically detects and blocks:

- **Known AIs**: Require OAuth (GPT, Claude, ChatGPT, etc.)
- **Known bots**: Very restrictive rate limiting (curl, python-requests, etc.)

## Available Endpoints

### Base URL

```
http://localhost:3000/api/v1
```

### Health Check

```bash
GET /health
```

Verifies the status of the API and its dependencies.

**Example**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-24T13:00:00.000Z",
  "database": {
    "status": "up",
    "responseTime": 15
  },
  "redis": {
    "status": "not_configured"
  }
}
```

**Status Values**:
- `healthy`: All services are operational
- `degraded`: Some optional services are down (e.g., Redis)
- `unhealthy`: Critical services are down (e.g., database)

## Usage Examples

### Get User Profile

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/users/12345
```

### Get Country Profile

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/countries/CO
```

### Search Notes

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?status=open&limit=10"
```

## Error Handling

### HTTP Status Codes

- `200 OK`: Successful request
- `400 Bad Request`: Invalid request (missing User-Agent, invalid parameters)
- `403 Forbidden`: Access denied (AI without OAuth, blocked bot)
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error Format

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error details"
  }
}
```

**Example**:
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

## Best Practices

### 1. Always Include User-Agent

```bash
# ✅ Correct
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/users/12345

# ❌ Incorrect
curl http://localhost:3000/api/v1/users/12345
```

### 2. Respect Rate Limits

- Implement retry with exponential backoff
- Respect `X-RateLimit-*` headers
- Use `X-RateLimit-Reset` to know when to retry

### 3. Handle Errors Appropriately

```javascript
try {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MyApp/1.0 (contact@example.com)' }
  });
  
  if (response.status === 429) {
    const resetTime = response.headers.get('X-RateLimit-Reset');
    // Wait until resetTime
  }
  
  const data = await response.json();
} catch (error) {
  // Handle error
}
```

### 4. Use Pagination

For endpoints that return lists, use pagination:

```bash
GET /api/v1/users?limit=50&offset=0
```

### 5. Cache Responses

Responses include cache headers when applicable. Respect `Cache-Control` and `ETag`.

## Complete Documentation

For complete documentation of all endpoints:

- **Swagger UI**: `http://localhost:3000/docs` (when available)
- **OpenAPI Spec**: `http://localhost:3000/api-docs.json` (when available)
- **Documentation**: See [docs/api/](api/) for complete specifications

## Support

If you have questions about using the API:

1. Review the complete documentation
2. Check the examples in this manual
3. Open an issue on GitHub if you encounter problems
