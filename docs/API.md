# API Reference

Complete reference documentation for OSM Notes API.

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)
6. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Notes](#notes)
   - [Users](#users)
   - [Countries](#countries)
   - [Analytics](#analytics)
7. [Data Types](#data-types)
8. [Response Formats](#response-formats)
9. [Interactive Documentation](#interactive-documentation)

---

## Overview

OSM Notes API provides programmatic access to OpenStreetMap notes analytics data, including user profiles, country analytics, notes, and real-time metrics.

**Key Features**:
- RESTful API design
- JSON responses
- Versioned endpoints (`/api/v1/`)
- Pagination support
- Advanced filtering capabilities
- Rate limiting and anti-abuse protection
- OpenAPI/Swagger documentation

---

## Base URL

**Development**:
```
http://localhost:3000
```

**Production**:
```
https://notes-api.osm.lat
```

All API endpoints are prefixed with `/api/v1/` except the health check endpoint.

---

## Authentication

### User-Agent Header (Required)

**All requests MUST include a valid `User-Agent` header** with the following format:

```
User-Agent: <AppName>/<Version> (<Contact>)
```

**Format Requirements**:
- `<AppName>`: Application name (letters, numbers, hyphens, dots allowed)
- `<Version>`: Application version (e.g., `1.0`, `0.5.2`)
- `<Contact>`: **REQUIRED** - Valid email address or URL

**Valid Examples**:
```
User-Agent: MyOSMApp/1.0 (contact@example.com)
User-Agent: Terranote/1.0 (https://github.com/Terranote/terranote-core)
User-Agent: ResearchTool/0.5 (researcher@university.edu)
```

**Invalid Examples**:
```
User-Agent: MyApp/1.0                    # Missing contact
User-Agent: MyApp                        # Missing version and contact
User-Agent: MyApp/1.0 (invalid)         # Invalid contact format
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Bad Request",
  "message": "User-Agent header is required and must follow format: AppName/Version (Contact)",
  "statusCode": 400
}
```

### OAuth Authentication (Future)

OAuth authentication will be available in Phase 5 for higher rate limits and access to advanced features.

---

## Rate Limiting

### Limits

- **Anonymous users**: 50 requests per 15 minutes per IP + User-Agent combination
- **Authenticated users** (Phase 5): 1000 requests/hour
- **Detected bots**: 10 requests/hour

### How It Works

Rate limiting is enforced **per IP address and User-Agent combination**, meaning:
- Different applications (different User-Agent) from the same IP have separate limits
- Same application from different IPs have separate limits
- Health check endpoint (`/health`) is excluded from rate limiting

### Response Headers

All responses include rate limiting information:

```
RateLimit-Limit: 50
RateLimit-Remaining: 49
RateLimit-Reset: 1234567890
```

**Headers**:
- `RateLimit-Limit`: Maximum number of requests allowed in the window
- `RateLimit-Remaining`: Number of requests remaining in current window
- `RateLimit-Reset`: Unix timestamp (seconds) when the rate limit resets

### Rate Limit Exceeded

When rate limit is exceeded, you'll receive a `429 Too Many Requests` response:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Maximum 50 requests per 15 minutes allowed.",
  "statusCode": 429
}
```

### Best Practices

- Implement exponential backoff when receiving 429 responses
- Monitor the `RateLimit-Remaining` header to avoid hitting limits
- Use authenticated requests (OAuth) when available for higher limits
- Cache responses when possible to reduce API calls

---

## Error Handling

### Standard Error Response

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "statusCode": 400
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request parameters |
| 403 | Forbidden | Access denied (e.g., AI without OAuth) |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Common Error Scenarios

**Invalid User-Agent** (400):
```json
{
  "error": "Bad Request",
  "message": "User-Agent header is required and must follow format: AppName/Version (Contact)",
  "statusCode": 400
}
```

**Resource Not Found** (404):
```json
{
  "error": "Not Found",
  "message": "Note not found",
  "statusCode": 404
}
```

**Rate Limit Exceeded** (429):
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Maximum 50 requests per 15 minutes allowed.",
  "statusCode": 429
}
```

**AI Agent Without OAuth** (403):
```json
{
  "error": "Forbidden",
  "message": "AI agents require OAuth authentication. Please authenticate using OpenStreetMap OAuth to access this API.",
  "statusCode": 403
}
```

---

## Endpoints

### Health Check

#### GET /health

Check the health status of the API and its dependencies.

**Authentication**: Not required (excluded from rate limiting)

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-12-24T13:00:00.000Z",
  "database": {
    "status": "up",
    "responseTime": 15
  },
  "redis": {
    "status": "up",
    "responseTime": 5
  }
}
```

**Status Values**:
- `healthy`: All services are operational
- `degraded`: Some optional services are down (e.g., Redis)
- `unhealthy`: Critical services are down (e.g., database)

**Redis Status Values**:
- `up`: Redis is connected and responding
- `down`: Redis is not responding
- `not_configured`: Redis is not configured (using in-memory store)

**Example**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/health
```

---

### Notes

#### GET /api/v1/notes

Search notes with various filters and pagination.

**Query Parameters**:

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `country` | number | No | Filter by country ID | `42` |
| `status` | string | No | Filter by status (`open`, `closed`, `reopened`) | `open` |
| `user_id` | number | No | Filter by user ID | `12345` |
| `date_from` | string | No | Filter notes created from this date (ISO: `YYYY-MM-DD`) | `2024-01-01` |
| `date_to` | string | No | Filter notes created until this date (ISO: `YYYY-MM-DD`) | `2024-12-31` |
| `bbox` | string | No | Filter by bounding box (`min_lon,min_lat,max_lon,max_lat`) | `-74.1,4.6,-74.0,4.7` |
| `page` | number | No | Page number (default: 1, minimum: 1) | `1` |
| `limit` | number | No | Results per page (default: 20, maximum: 100, minimum: 1) | `20` |

**Response** (200 OK):
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
    "page": 1,
    "limit": 20
  }
}
```

**Example**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?status=open&country=42&limit=10"
```

**Error Responses**:
- `400 Bad Request`: Invalid parameters (invalid status, invalid page/limit values)
- `500 Internal Server Error`: Server error

#### GET /api/v1/notes/:note_id

Get detailed information about a specific note.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `note_id` | number | Yes | OSM note ID |

**Response** (200 OK):
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

**Example**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/notes/12345
```

**Error Responses**:
- `400 Bad Request`: Invalid note ID format
- `404 Not Found`: Note does not exist
- `500 Internal Server Error`: Server error

#### GET /api/v1/notes/:note_id/comments

Get all comments for a specific note.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `note_id` | number | Yes | OSM note ID |

**Response** (200 OK):
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

**Example**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/notes/12345/comments
```

**Error Responses**:
- `400 Bad Request`: Invalid note ID format
- `500 Internal Server Error`: Server error

---

### Users

#### GET /api/v1/users/:user_id

Get detailed profile and statistics for a specific user.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | number | Yes | OSM user ID |

**Response** (200 OK):
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
    "applications_used": ["iD", "JOSM", "Vespucci"],
    "collaboration_patterns": {},
    "countries_open_notes": [42, 43],
    "hashtags": ["#osm", "#mapping"],
    "date_starting_creating_notes": "2020-01-15T00:00:00Z",
    "date_starting_solving_notes": "2020-02-01T00:00:00Z",
    "last_year_activity": null,
    "working_hours_of_week_opening": [0, 1, 2, 3, 4, 5, 6],
    "activity_by_year": {}
  }
}
```

**Example**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/users/12345
```

**Error Responses**:
- `400 Bad Request`: Invalid user ID format
- `404 Not Found`: User does not exist
- `500 Internal Server Error`: Server error

---

### Countries

#### GET /api/v1/countries/:country_id

Get detailed profile and statistics for a specific country.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `country_id` | number | Yes | Country ID |

**Response** (200 OK):
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
    "users_open_notes": [],
    "applications_used": ["iD", "JOSM"],
    "hashtags": ["#osm"],
    "activity_by_year": {},
    "working_hours_of_week_opening": []
  }
}
```

**Example**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/countries/42
```

**Error Responses**:
- `400 Bad Request`: Invalid country ID format
- `404 Not Found`: Country does not exist
- `500 Internal Server Error`: Server error

---

### Analytics

#### GET /api/v1/analytics/global

Get global analytics and statistics across all OSM notes.

**Response** (200 OK):
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
    "applications_used": ["iD", "JOSM", "Vespucci"],
    "top_countries": []
  }
}
```

**Example**:
```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/analytics/global
```

**Error Responses**:
- `500 Internal Server Error`: Server error

---

## Data Types

### Note

```typescript
interface Note {
  note_id: number;
  latitude: number;
  longitude: number;
  status: 'open' | 'closed' | 'reopened';
  created_at: string; // ISO 8601 date-time
  closed_at: string | null; // ISO 8601 date-time
  id_user: number | null;
  id_country: number | null;
  comments_count?: number;
}
```

### NoteComment

```typescript
interface NoteComment {
  comment_id: number;
  note_id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  created_at: string; // ISO 8601 date-time
  text: string | null;
}
```

### UserProfile

```typescript
interface UserProfile {
  dimension_user_id: number;
  user_id: number;
  username: string | null;
  history_whole_open: number;
  history_whole_closed: number;
  history_whole_commented: number;
  avg_days_to_resolution: number | null;
  resolution_rate: number | null;
  user_response_time: number | null;
  days_since_last_action: number | null;
  applications_used?: unknown; // JSON array
  collaboration_patterns?: unknown; // JSON object
  countries_open_notes?: unknown; // JSON array
  hashtags?: unknown; // JSON array
  date_starting_creating_notes?: string | null; // ISO 8601 date-time
  date_starting_solving_notes?: string | null; // ISO 8601 date-time
  last_year_activity?: string | null;
  working_hours_of_week_opening?: unknown; // JSON array
  activity_by_year?: unknown; // JSON object
}
```

### CountryProfile

```typescript
interface CountryProfile {
  dimension_country_id: number;
  country_id: number;
  country_name: string | null;
  country_name_en: string | null;
  country_name_es: string | null;
  iso_alpha2: string | null;
  history_whole_open: number;
  history_whole_closed: number;
  avg_days_to_resolution: number | null;
  resolution_rate: number | null;
  notes_health_score: number | null;
  new_vs_resolved_ratio: number | null;
  notes_backlog_size: number | null;
  notes_created_last_30_days: number | null;
  notes_resolved_last_30_days: number | null;
  users_open_notes?: unknown; // JSON array
  applications_used?: unknown; // JSON array
  hashtags?: unknown; // JSON array
  activity_by_year?: unknown; // JSON object
  working_hours_of_week_opening?: unknown; // JSON array
}
```

### GlobalAnalytics

```typescript
interface GlobalAnalytics {
  dimension_global_id: number;
  history_whole_open: number;
  history_whole_closed: number;
  currently_open_count: number | null;
  avg_days_to_resolution: number | null;
  resolution_rate: number | null;
  notes_created_last_30_days: number | null;
  notes_resolved_last_30_days: number | null;
  active_users_count: number | null;
  notes_backlog_size: number | null;
  applications_used?: unknown; // JSON array
  top_countries?: unknown; // JSON array
}
```

### Pagination

```typescript
interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
```

### SearchResult

```typescript
interface SearchResult<T> {
  data: T[];
  pagination: Pagination;
  filters?: Partial<SearchFilters>;
}
```

---

## Response Formats

### Success Response

Most endpoints return data in the following format:

```json
{
  "data": { ... }
}
```

For search endpoints with pagination:

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 250,
    "total_pages": 13
  },
  "filters": { ... }
}
```

### Error Response

All errors follow a consistent format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "statusCode": 400
}
```

---

## Interactive Documentation

### Swagger UI

Interactive API documentation is available at:

**Development**:
```
http://localhost:3000/docs
```

**Production**:
```
https://notes-api.osm.lat/docs
```

### OpenAPI JSON

The raw OpenAPI specification is available at:

**Development**:
```
http://localhost:3000/docs/json
```

**Production**:
```
https://notes-api.osm.lat/docs/json
```

---

## Additional Resources

- [Usage Guide](USAGE.md) - Detailed usage examples and best practices
- [Installation Guide](INSTALLATION.md) - Setup and installation instructions
- [Testing Guide](TESTING.md) - Testing documentation
- [CI/CD Guide](CI_CD.md) - Continuous Integration and Deployment
- [API Versioning](API_VERSIONING.md) - Versioning strategy

---

## Support

For questions, issues, or contributions:

- **GitHub**: [OSM-Notes-API Repository](https://github.com/osmlatam/OSM-Notes-API)
- **Documentation**: See `docs/` directory
- **Issues**: GitHub Issues

---

**Last Updated**: 2025-12-27  
**API Version**: v1  
**Status**: Operational

