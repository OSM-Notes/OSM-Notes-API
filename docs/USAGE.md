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

- **Known AI agents**: Require OAuth authentication (403 Forbidden without OAuth)
  - Examples: ChatGPT, GPT-4, Claude, Google Bard, GitHub Copilot, Perplexity, etc.
  - **Solution**: Authenticate using OpenStreetMap OAuth to access the API
- **Known bots**: Very restrictive rate limiting (10 requests/hour)
  - Examples: curl, wget, python-requests, Go http client, Scrapy, etc.
  - These tools are allowed but with very low rate limits to prevent abuse

**AI Detection**:
If you're using an AI agent, you must authenticate with OSM OAuth. Without authentication, you'll receive:
```json
{
  "error": "Forbidden",
  "message": "AI agents require OAuth authentication. Please authenticate using OpenStreetMap OAuth to access this API.",
  "statusCode": 403
}
```

**Bot Detection**:
Known bots are automatically detected and subject to restrictive rate limiting (10 requests/hour). To avoid this:
- Use a proper User-Agent header with contact information
- Format: `<AppName>/<Version> (<Contact>)`
- Example: `MyBot/1.0 (bot@example.com)` instead of `curl/7.68.0`

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

### Notes Endpoints

#### Get Note by ID

Get detailed information about a specific note.

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/notes/12345
```

**Response**:
```json
{
  "data": {
    "note_id": 12345,
    "latitude": 4.6097,
    "longitude": -74.0817,
    "status": "open",
    "created_at": "2024-01-15T10:30:00Z",
    "closed_at": null,
    "id_user": 67890,
    "id_country": 42,
    "comments_count": 3
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid note ID format
- `404 Not Found`: Note does not exist
- `500 Internal Server Error`: Server error

#### Get Note Comments

Get all comments for a specific note.

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/notes/12345/comments
```

**Response**:
```json
{
  "data": [
    {
      "comment_id": 1,
      "note_id": 12345,
      "user_id": 67890,
      "username": "test_user",
      "action": "opened",
      "created_at": "2024-01-15T10:30:00Z",
      "text": "This is a test note"
    },
    {
      "comment_id": 2,
      "note_id": 12345,
      "user_id": 67891,
      "username": "another_user",
      "action": "commented",
      "created_at": "2024-01-15T11:00:00Z",
      "text": "I can help with this"
    }
  ],
  "count": 2
}
```

**Error Responses**:
- `400 Bad Request`: Invalid note ID format
- `500 Internal Server Error`: Server error

#### Search Notes

Search notes with various filters and pagination.

**Basic Search**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?status=open&limit=10"
```

**With Filters**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?country=42&status=open&date_from=2024-01-01&date_to=2024-12-31&page=1&limit=20"
```

**Query Parameters**:
- `country` (number): Filter by country ID
- `status` (string): Filter by status (`open`, `closed`, `reopened`)
- `user_id` (number): Filter by user ID
- `date_from` (string): Filter notes created from this date (ISO format: `YYYY-MM-DD`)
- `date_to` (string): Filter notes created until this date (ISO format: `YYYY-MM-DD`)
- `bbox` (string): Filter by bounding box (format: `min_lon,min_lat,max_lon,max_lat`)
- `page` (number): Page number (default: 1, minimum: 1)
- `limit` (number): Results per page (default: 20, maximum: 100, minimum: 1)

**Response**:
```json
{
  "data": [
    {
      "note_id": 12345,
      "latitude": 4.6097,
      "longitude": -74.0817,
      "status": "open",
      "created_at": "2024-01-15T10:30:00Z",
      "closed_at": null,
      "id_user": 67890,
      "id_country": 42,
      "comments_count": 3
    },
    {
      "note_id": 12346,
      "latitude": 4.6100,
      "longitude": -74.0820,
      "status": "open",
      "created_at": "2024-01-16T10:30:00Z",
      "closed_at": null,
      "id_user": 67891,
      "id_country": 42,
      "comments_count": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 250,
    "total_pages": 13
  },
  "filters": {
    "country": 42,
    "status": "open",
    "date_from": "2024-01-01",
    "date_to": "2024-12-31",
    "page": 1,
    "limit": 20
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid parameters (invalid status, invalid page/limit values)
- `500 Internal Server Error`: Server error

**Examples**:

Search open notes in Colombia:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?country=42&status=open"
```

Search notes by user:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?user_id=67890"
```

Search notes in a bounding box:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?bbox=-74.1,4.6,-74.0,4.7"
```

### User Profile Endpoint

Get detailed user profile with analytics and statistics.

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/users/12345
```

**Response**:
```json
{
  "data": {
    "dimension_user_id": 123,
    "user_id": 12345,
    "username": "example_user",
    "history_whole_open": 100,
    "history_whole_closed": 50,
    "history_whole_commented": 75,
    "avg_days_to_resolution": 5.5,
    "resolution_rate": 50.0,
    "user_response_time": 2.3,
    "days_since_last_action": 5,
    "applications_used": [
      {
        "application_id": 1,
        "application_name": "JOSM",
        "count": 80
      }
    ],
    "collaboration_patterns": {
      "mentions_given": 10,
      "mentions_received": 5,
      "replies_count": 20,
      "collaboration_score": 0.75
    },
    "countries_open_notes": [
      {
        "rank": 1,
        "country": "Colombia",
        "quantity": 50
      }
    ],
    "hashtags": ["#MapColombia", "#MissingMaps"],
    "date_starting_creating_notes": "2020-01-15",
    "date_starting_solving_notes": "2020-02-01",
    "last_year_activity": null,
    "working_hours_of_week_opening": [],
    "activity_by_year": {}
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid user ID format
- `404 Not Found`: User does not exist
- `500 Internal Server Error`: Server error

**Example**:
```bash
# Get user profile
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/users/12345
```

### Country Profile Endpoint

Get detailed country profile with analytics and statistics.

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/countries/42
```

**Response**:
```json
{
  "data": {
    "dimension_country_id": 45,
    "country_id": 42,
    "country_name": "Colombia",
    "country_name_en": "Colombia",
    "country_name_es": "Colombia",
    "iso_alpha2": "CO",
    "history_whole_open": 1000,
    "history_whole_closed": 800,
    "avg_days_to_resolution": 7.2,
    "resolution_rate": 80.0,
    "notes_health_score": 75.5,
    "new_vs_resolved_ratio": 1.2,
    "notes_backlog_size": 50,
    "notes_created_last_30_days": 100,
    "notes_resolved_last_30_days": 80,
    "users_open_notes": [
      {
        "rank": 1,
        "user_id": 12345,
        "username": "top_user",
        "quantity": 50
      }
    ],
    "applications_used": [],
    "hashtags": [],
    "activity_by_year": {},
    "working_hours_of_week_opening": []
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid country ID format
- `404 Not Found`: Country does not exist
- `500 Internal Server Error`: Server error

**Example**:
```bash
# Get country profile
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/countries/42
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
