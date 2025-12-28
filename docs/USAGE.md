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

#### Advanced Search Notes

The advanced search feature extends the basic search with text search capabilities and logical operators (AND/OR) for combining multiple filters.

**Text Search**:
Search for notes containing specific text in their comments:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?text=test"
```

**Logical Operators**:
Combine multiple filters using AND (default) or OR operators:

**AND Operator** (default - all conditions must match):
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?country=42&status=open&operator=AND"
```

**OR Operator** (any condition can match):
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?country=42&status=open&operator=OR"
```

**Combining Text Search with Filters**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?text=test&country=42&status=open&operator=AND"
```

**Advanced Query Parameters**:
- `text` (string): Search for text in note comments (1-500 characters, case-insensitive)
- `operator` (string): Logical operator to combine filters (`AND` or `OR`, default: `AND`)
- All standard search parameters are also supported (`country`, `status`, `user_id`, `date_from`, `date_to`, `bbox`, `page`, `limit`)

**When Advanced Search is Used**:
Advanced search is automatically enabled when either `text` or `operator` parameters are provided. When advanced search is used:
- Text search searches within note comments
- Filters can be combined with AND or OR operators
- Standard search features (pagination, filters) remain available

**Examples**:

Search notes with text "help" in comments:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?text=help"
```

Search notes in Colombia OR Spain with text "fix":
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?country=42&country=43&text=fix&operator=OR"
```

**Note**: When using OR operator with multiple values of the same filter (e.g., multiple countries), you may need to make separate requests or use the text search combined with other filters.

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

### Global Analytics Endpoint

Get global statistics and analytics for all OSM notes.

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/analytics/global
```

**Response**:
```json
{
  "data": {
    "dimension_global_id": 1,
    "history_whole_open": 1000000,
    "history_whole_closed": 800000,
    "currently_open_count": 200000,
    "avg_days_to_resolution": 5.5,
    "resolution_rate": 80.0,
    "notes_created_last_30_days": 5000,
    "notes_resolved_last_30_days": 4500,
    "active_users_count": 10000,
    "notes_backlog_size": 50000,
    "applications_used": [
      {
        "application_id": 1,
        "application_name": "JOSM",
        "count": 500000
      }
    ],
    "top_countries": [
      {
        "rank": 1,
        "country_id": 42,
        "country_name": "Colombia",
        "notes_count": 100000
      }
    ]
  }
}
```

**Error Responses**:
- `404 Not Found`: Global analytics not found
- `500 Internal Server Error`: Server error

**Example**:
```bash
# Get global analytics
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/analytics/global
```

### Search Endpoints

#### Search Users

Search for users by username or user_id.

```bash
GET /api/v1/search/users?q=<query>
```

**Query Parameters**:
- `q` (string, required): Search query (username pattern or user_id)

**Examples**:

Search by username pattern:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/search/users?q=test"
```

Search by exact user_id:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/search/users?q=12345"
```

**Response**:
```json
{
  "data": [
    {
      "user_id": 12345,
      "username": "test_user",
      "history_whole_open": 100,
      "history_whole_closed": 50
    }
  ],
  "count": 1
}
```

**Behavior**:
- If query is numeric (e.g., "12345"), searches for exact user_id match
- If query is text (e.g., "test"), searches username with pattern matching (case-insensitive)
- Results are limited to 50 users maximum
- Returns empty array if no matches found

**Error Responses**:
- `400 Bad Request`: Missing or empty query parameter
- `500 Internal Server Error`: Server error

#### Search Countries

Search for countries by name (any language), ISO code, or country_id.

```bash
GET /api/v1/search/countries?q=<query>
```

**Query Parameters**:
- `q` (string, required): Search query (country name pattern, ISO code, or country_id)

**Examples**:

Search by country name:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/search/countries?q=Colombia"
```

Search by ISO code:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/search/countries?q=CO"
```

Search by exact country_id:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/search/countries?q=42"
```

**Response**:
```json
{
  "data": [
    {
      "country_id": 42,
      "country_name": "Colombia",
      "country_name_en": "Colombia",
      "country_name_es": "Colombia",
      "iso_alpha2": "CO",
      "history_whole_open": 1000,
      "history_whole_closed": 800
    }
  ],
  "count": 1
}
```

**Behavior**:
- If query is numeric (e.g., "42"), searches for exact country_id match
- If query is text, searches in `country_name`, `country_name_en`, `country_name_es`, and `iso_alpha2` fields (case-insensitive)
- Results are limited to 50 countries maximum
- Returns empty array if no matches found

**Error Responses**:
- `400 Bad Request`: Missing or empty query parameter
- `500 Internal Server Error`: Server error

### Rankings Endpoints

#### User Rankings

Get rankings of users by various metrics.

```bash
GET /api/v1/users/rankings?metric=<metric>&country=<country_id>&limit=<limit>&order=<order>
```

**Query Parameters**:
- `metric` (string, **required**): Metric to rank by. Valid values:
  - `history_whole_open`: Total notes opened
  - `history_whole_closed`: Total notes closed
  - `history_whole_commented`: Total comments made
  - `resolution_rate`: Resolution rate percentage
  - `avg_days_to_resolution`: Average days to resolve notes
- `country` (integer, optional): Filter rankings by country ID
- `limit` (integer, optional): Number of results to return (1-100, default: 10)
- `order` (string, optional): Sort order - `asc` or `desc` (default: `desc`)

**Examples**:

Get top 10 users by notes opened:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/users/rankings?metric=history_whole_open&limit=10"
```

Get top 5 users by resolution rate in a specific country:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/users/rankings?metric=resolution_rate&country=42&limit=5"
```

Get users with lowest average resolution time (ascending order):
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/users/rankings?metric=avg_days_to_resolution&order=asc&limit=20"
```

**Response**:
```json
{
  "metric": "history_whole_open",
  "country": 42,
  "order": "desc",
  "rankings": [
    {
      "rank": 1,
      "user_id": 12345,
      "username": "top_user",
      "value": 500
    },
    {
      "rank": 2,
      "user_id": 67890,
      "username": "second_user",
      "value": 450
    }
  ]
}
```

**Response Fields**:
- `metric`: The metric used for ranking
- `country`: Country ID if filtering by country (optional)
- `order`: Sort order applied (`asc` or `desc`)
- `rankings`: Array of ranking entries, each containing:
  - `rank`: Position in the ranking (1-based)
  - `user_id`: User ID
  - `username`: Username (may be null)
  - `value`: Metric value (may be null)

**Error Responses**:
- `400 Bad Request`: Missing or invalid metric, invalid limit/order/country parameters
- `500 Internal Server Error`: Server error

#### Country Rankings

Get rankings of countries by various metrics.

```bash
GET /api/v1/countries/rankings?metric=<metric>&limit=<limit>&order=<order>
```

**Query Parameters**:
- `metric` (string, **required**): Metric to rank by. Valid values:
  - `history_whole_open`: Total notes opened
  - `history_whole_closed`: Total notes closed
  - `resolution_rate`: Resolution rate percentage
  - `avg_days_to_resolution`: Average days to resolve notes
  - `notes_health_score`: Overall health score for notes
- `limit` (integer, optional): Number of results to return (1-100, default: 10)
- `order` (string, optional): Sort order - `asc` or `desc` (default: `desc`)

**Examples**:

Get top 10 countries by notes opened:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/countries/rankings?metric=history_whole_open&limit=10"
```

Get top 5 countries by resolution rate:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/countries/rankings?metric=resolution_rate&limit=5"
```

Get countries with best health scores:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/countries/rankings?metric=notes_health_score&order=desc&limit=20"
```

**Response**:
```json
{
  "metric": "history_whole_open",
  "order": "desc",
  "rankings": [
    {
      "rank": 1,
      "country_id": 42,
      "country_name": "Colombia",
      "value": 100000
    },
    {
      "rank": 2,
      "country_id": 1,
      "country_name": "United States",
      "value": 95000
    }
  ]
}
```

**Response Fields**:
- `metric`: The metric used for ranking
- `order`: Sort order applied (`asc` or `desc`)
- `rankings`: Array of ranking entries, each containing:
  - `rank`: Position in the ranking (1-based)
  - `country_id`: Country ID
  - `country_name`: Country name (may be null)
  - `value`: Metric value (may be null)

**Error Responses**:
- `400 Bad Request`: Missing or invalid metric, invalid limit/order parameters
- `500 Internal Server Error`: Server error

### Caching

The API uses Redis-based response caching to improve performance and reduce database load. Caching is automatically enabled for GET requests to certain endpoints.

**Cache Headers**:
- `X-Cache`: Indicates cache status:
  - `HIT`: Response was served from cache
  - `MISS`: Response was generated and cached
  - `DISABLED`: Cache is not available (Redis not configured or error occurred)

**Cached Endpoints**:
- `/api/v1/analytics/global` - 10 minutes TTL
- `/api/v1/users/:user_id` - 5 minutes TTL
- `/api/v1/countries/:country_id` - 5 minutes TTL
- `/api/v1/users/rankings` - 5 minutes TTL
- `/api/v1/countries/rankings` - 5 minutes TTL

**Cache Behavior**:
- Only successful responses (2xx status codes) are cached
- Cache keys are generated from the request method, path, and query parameters
- Different query parameters result in different cache entries
- Cache automatically expires after the TTL (Time To Live)
- Cache gracefully degrades if Redis is unavailable (continues without caching)

**Example**:
```bash
# First request - Cache MISS
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/analytics/global

# Response includes:
# X-Cache: MISS

# Second identical request - Cache HIT (if within TTL)
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/analytics/global

# Response includes:
# X-Cache: HIT
```

**Note**: Cache is optional. If Redis is not configured, the API continues to work normally without caching. The `X-Cache` header will show `DISABLED` in this case.

### Metrics Endpoint

The API exposes Prometheus metrics for monitoring and observability. The metrics endpoint is available at `/metrics` and does not require User-Agent validation.

**Endpoint**:
```bash
GET /metrics
```

**Response Format**: Prometheus text format (text/plain)

**Available Metrics**:

1. **HTTP Request Duration** (`http_request_duration_seconds`):
   - Histogram tracking response time in seconds
   - Labels: `method`, `route`, `status_code`
   - Buckets: 0.1s, 0.5s, 1s, 2s, 5s, 10s

2. **HTTP Request Count** (`http_requests_total`):
   - Counter tracking total number of HTTP requests
   - Labels: `method`, `route`, `status_code`

3. **HTTP Error Count** (`http_errors_total`):
   - Counter tracking HTTP errors (4xx and 5xx)
   - Labels: `method`, `route`, `status_code`

4. **Default Node.js Metrics**:
   - CPU usage
   - Memory usage
   - Event loop lag
   - Active handles/requests

**Example**:
```bash
# Get metrics
curl http://localhost:3000/metrics

# Response (Prometheus format):
# # HELP http_requests_total Total number of HTTP requests
# # TYPE http_requests_total counter
# http_requests_total{method="GET",route="/api/v1/users/:id",status_code="200"} 42
# http_request_duration_seconds_bucket{method="GET",route="/api/v1/users/:id",le="0.1"} 35
# ...
```

**Integration with Prometheus**:

Configure Prometheus to scrape metrics from the API:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'osm-notes-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api:3000']
```

**Note**: The `/metrics` endpoint is excluded from User-Agent validation and rate limiting to allow Prometheus to scrape metrics without restrictions.

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
- Respect `RateLimit-*` headers (standard headers, not `X-RateLimit-*`)
- Use `RateLimit-Reset` to know when to retry

### 3. Handle Errors Appropriately

```javascript
try {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MyApp/1.0 (contact@example.com)' }
  });
  
  if (response.status === 429) {
    const resetTime = response.headers.get('RateLimit-Reset');
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
GET /api/v1/notes?page=1&limit=20
```

**Pagination Query Parameters**:
- `page` (number): Page number (default: 1, minimum: 1)
- `limit` (number): Results per page (default: 20, maximum: 100, minimum: 1)

**Pagination Response Body**:
All paginated endpoints include pagination metadata in the response body:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 250,
    "total_pages": 13
  }
}
```

**Pagination HTTP Headers**:
The API also includes standard pagination headers in HTTP responses:

- `X-Total-Count`: Total number of results
- `X-Page`: Current page number
- `X-Per-Page`: Number of results per page
- `X-Total-Pages`: Total number of pages
- `Link`: Navigation links (RFC 5988) with `rel` values:
  - `first`: Link to first page
  - `prev`: Link to previous page (if not on first page)
  - `next`: Link to next page (if not on last page)
  - `last`: Link to last page

**Example Response Headers**:
```
X-Total-Count: 250
X-Page: 2
X-Per-Page: 20
X-Total-Pages: 13
Link: </api/v1/notes?page=1&limit=20>; rel="first", </api/v1/notes?page=1&limit=20>; rel="prev", </api/v1/notes?page=3&limit=20>; rel="next", </api/v1/notes?page=13&limit=20>; rel="last"
```

**Using Pagination Headers**:
You can use these headers to implement pagination navigation without parsing the response body:

```javascript
const response = await fetch('/api/v1/notes?page=2&limit=20', {
  headers: { 'User-Agent': 'MyApp/1.0 (contact@example.com)' }
});

const totalPages = parseInt(response.headers.get('X-Total-Pages'), 10);
const currentPage = parseInt(response.headers.get('X-Page'), 10);
const linkHeader = response.headers.get('Link');

// Parse Link header to get navigation URLs
const links = parseLinkHeader(linkHeader);
// links.first, links.prev, links.next, links.last
```

**Note**: Query parameters are preserved in pagination Link headers, so filters are maintained when navigating between pages.

### 5. Cache Responses

Responses include cache headers when applicable. Respect `Cache-Control` and `ETag`.

## Complete Documentation

For complete documentation of all endpoints:

- **Swagger UI**: `http://localhost:3000/docs` - Interactive API documentation
- **OpenAPI Spec (JSON)**: `http://localhost:3000/docs/json` - OpenAPI specification in JSON format
- **Documentation**: See [docs/api/](api/) for complete specifications

### Swagger UI

The API includes interactive Swagger documentation that allows you to:

- Browse all available endpoints
- See request/response schemas
- Test endpoints directly from the browser
- View example requests and responses

**Access**: Navigate to `http://localhost:3000/docs` in your browser when the server is running.

**Note**: Swagger UI is excluded from User-Agent validation for easier access, but all API endpoints still require the User-Agent header.

## Support

If you have questions about using the API:

1. Review the complete documentation
2. Check the examples in this manual
3. Open an issue on GitHub if you encounter problems
