---
title: "Testing Guide"
description: "Guide for testing OSM Notes API endpoints, including test methods, examples, and best practices"
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "testing"
audience:
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# Testing Guide

This guide explains how to test the OSM Notes API endpoints.

## Testing Methods

### 1. Automated Tests (Recommended)

Automated tests are already implemented and cover:
- Service unit tests
- Endpoint integration tests
- Middleware validation

#### Run all tests:
```bash
npm test
```

#### Run only unit tests:
```bash
npm run test:unit
```

#### Run only integration tests:
```bash
npm run test:integration
```

#### Run tests with coverage:
```bash
npm run test:coverage
```

#### Run tests in watch mode (development):
```bash
npm run test:watch
```

**Note**: Integration tests need a PostgreSQL database. The test setup loads **`.env`** from the project root (if present), then applies defaults for any unset `DB_*` vars. So you can use your local DB in either way:

1. **Use your existing local DB**: put your credentials in a `.env` file at the project root (e.g. `DB_NAME=my_db`, `DB_USER=postgres`, `DB_PASSWORD=...`). When you run `npm test`, those values are used and the tests connect to your DB.

2. **Use the default test DB**: if you do not set `DB_*` in `.env` or the shell, tests expect database **`osm_notes_api_test`** with user **`osm_notes_test_user`** and password **`osm_notes_test_pass`**. Create that DB and user, or export vars before running:

```bash
export DB_HOST=localhost
export DB_NAME=osm_notes_api_test
export DB_USER=osm_notes_test_user
export DB_PASSWORD=osm_notes_test_pass
export DB_PORT=5432
export DB_SSL=false
```

**Optional — populate test DB with real pipeline data**: To fill `osm_notes_api_test` with `public.notes` and `dwh.*` (Ingestion + ETL), run the sibling project's script (requires OSM-Notes-Analytics and OSM-Notes-Ingestion at the same filesystem level as OSM-Notes-API):

```bash
./scripts/setup_integration_test_db.sh
```

Or run the full CI flow with DB setup: `./scripts/run_ci_tests.sh --with-db-setup`

### 2. Manual Testing with curl

#### Initial Setup

First, make sure the server is running:

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

The server will be available at `http://localhost:3000` (or the port configured in `PORT`).

#### Testing Examples with curl

**1. Health Check:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/health
```

**2. Get a note by ID:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/notes-api/v1/notes/12345
```

**3. Get note comments:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/notes-api/v1/notes/12345/comments
```

**4. Search notes with filters:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     "http://localhost:3000/notes-api/v1/notes?status=open&country=42&limit=10"
```

**5. Get user profile:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/notes-api/v1/users/12345
```

**6. Get country profile:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/notes-api/v1/countries/42
```

**7. Get global analytics:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/notes-api/v1/analytics/global
```

#### Validation Tests

**Test without User-Agent (should fail):**
```bash
curl http://localhost:3000/notes-api/v1/notes/12345
# Expected: 400 Bad Request
```

**Test with invalid User-Agent:**
```bash
curl -H "User-Agent: InvalidFormat" \
     http://localhost:3000/notes-api/v1/notes/12345
# Expected: 400 Bad Request
```

**Test with invalid ID:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/notes-api/v1/notes/invalid
# Expected: 400 Bad Request
```

**Test rate limiting (make many rapid requests):**
```bash
for i in {1..60}; do
  curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
       http://localhost:3000/notes-api/v1/notes/12345
  echo ""
done
# After 50 requests, should return 429 Too Many Requests
```

### 3. Testing with httpie (Alternative to curl)

If you have `httpie` installed, it's easier to use:

```bash
# Install httpie
pip install httpie

# Usage examples
http GET localhost:3000/health User-Agent:"TestApp/1.0 (test@example.com)"

http GET localhost:3000/notes-api/v1/notes/12345 User-Agent:"TestApp/1.0 (test@example.com)"

http GET localhost:3000/notes-api/v1/notes \
  User-Agent:"TestApp/1.0 (test@example.com)" \
  status==open \
  country==42 \
  limit==10
```

### 4. Testing with Postman

1. **Import collection** (you can create one from the examples):
   - Create a new collection in Postman
   - Add the following requests:

2. **Configure Environment Variables**:
   - `base_url`: `http://localhost:3000`
   - `user_agent`: `TestApp/1.0 (test@example.com)`

3. **Global Headers**:
   - `User-Agent`: `{{user_agent}}`

4. **Request Examples**:

   - **GET Health Check**
     - URL: `{{base_url}}/health`
     - Method: GET

   - **GET Note by ID**
     - URL: `{{base_url}}/notes-api/v1/notes/12345`
     - Method: GET

   - **GET Note Comments**
     - URL: `{{base_url}}/notes-api/v1/notes/12345/comments`
     - Method: GET

   - **GET Search Notes**
     - URL: `{{base_url}}/notes-api/v1/notes`
     - Method: GET
     - Params:
       - `status`: `open`
       - `country`: `42`
       - `limit`: `10`

   - **GET User Profile**
     - URL: `{{base_url}}/notes-api/v1/users/12345`
     - Method: GET

   - **GET Country Profile**
     - URL: `{{base_url}}/notes-api/v1/countries/42`
     - Method: GET

   - **GET Global Analytics**
     - URL: `{{base_url}}/notes-api/v1/analytics/global`
     - Method: GET

### 5. Testing with Node.js Scripts

You can create custom test scripts:

```javascript
// test-endpoints.js
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const USER_AGENT = 'TestApp/1.0 (test@example.com)';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testEndpoints() {
  try {
    console.log('Testing endpoints...\n');

    // Test health check
    const health = await makeRequest('/health');
    console.log('Health Check:', health.status, health.data);

    // Test notes
    const notes = await makeRequest('/notes-api/v1/notes/12345');
    console.log('Note:', notes.status);

    // Test users
    const users = await makeRequest('/notes-api/v1/users/12345');
    console.log('User:', users.status);

    // Test countries
    const countries = await makeRequest('/notes-api/v1/countries/42');
    console.log('Country:', countries.status);

    // Test analytics
    const analytics = await makeRequest('/notes-api/v1/analytics/global');
    console.log('Analytics:', analytics.status);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEndpoints();
```

Run:
```bash
node test-endpoints.js
```

### 6. Testing with Docker Compose

If you have Docker Compose configured:

```bash
# Start services
cd docker
docker compose -f docker compose.dev.yml up -d

# Wait for services to be ready
sleep 10

# Test endpoints
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/health

# Stop services
docker compose -f docker compose.dev.yml down
```

### 7. Verify JSON Responses

To format JSON responses in the terminal:

```bash
# With curl and jq
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/notes-api/v1/notes/12345 | jq

# With curl and python
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/notes-api/v1/notes/12345 | python -m json.tool
```

## Testing Checklist

### Basic Functionality
- [ ] Health check returns 200
- [ ] Endpoints return valid JSON
- [ ] Responses have correct structure

### Validation
- [ ] Requests without User-Agent are rejected (400)
- [ ] Invalid User-Agent is rejected (400)
- [ ] Invalid IDs are rejected (400)
- [ ] Invalid parameters are rejected (400)

### Rate Limiting
- [ ] Rate limiting works correctly
- [ ] Rate limit headers are present
- [ ] 429 returned when limit is exceeded

### Errors
- [ ] 404 returned for resources not found
- [ ] 500 handled correctly
- [ ] Error messages are clear and useful

### Specific Endpoints
- [ ] GET /notes-api/v1/notes/:note_id
- [ ] GET /notes-api/v1/notes/:note_id/comments
- [ ] GET /notes-api/v1/notes (search)
- [ ] GET /notes-api/v1/users/:user_id
- [ ] GET /notes-api/v1/countries/:country_id
- [ ] GET /notes-api/v1/analytics/global

## API options and test coverage

The following table summarises which API options are covered by tests. **Unit tests** exercise service logic with a mocked DB; **integration tests** call the real HTTP API (and may hit a real DB).

### GET /notes-api/v1/notes (search)

| Option        | Unit (noteService) | Unit (advancedSearch) | Integration (notes.test) | Integration (advancedSearch.test) |
|---------------|--------------------|------------------------|--------------------------|-----------------------------------|
| (no filters)  | ✓                  | ✓                      | ✓                        | —                                 |
| `country`      | ✓                  | ✓                      | ✓                        | —                                 |
| `status`      | ✓ (combined)       | ✓                      | ✓, invalid status 400    | —                                 |
| `user_id`      | ✓                  | ✓                      | ✓                        | —                                 |
| `date_from`   | ✓                  | ✓                      | ✓                        | ✓ (with date_to)                  |
| `date_to`      | ✓                  | ✓                      | ✓                        | ✓                                 |
| `bbox`        | ✓ (valid/invalid)  | —                      | ✓                        | ✓                                 |
| `text`        | —                  | ✓                      | —                        | ✓                                 |
| `operator`    | —                  | ✓ (AND, OR)            | —                        | ✓ (AND, OR, invalid)              |
| `page` / `limit` | ✓               | ✓                      | ✓, invalid 400           | ✓                                 |
| `after` (cursor) | ✓ (invalid 400, next_cursor) | — | ✓ (invalid 400, cursor response) | — |
| `hashtag`     | ✓                  | —                      | ✓                        | —                                 |
| `application` | ✓                  | —                      | ✓                        | —                                 |

Note: When `after` is provided, cursor-based (keyset) pagination is used; `page` is ignored and the response includes `pagination.next_cursor` when there are more results. See [Pagination_Design.md](Pagination_Design.md).

Note: `hashtag` and `application` are implemented only in the **standard search** (not in advanced search). They require the **dwh** schema: `hashtag` filters notes whose opener user or country has that hashtag in `dwh.datamartUsers.hashtags` / `dwh.datamartCountries.hashtags`; `application` filters by `dwh.datamartUsers.applications_used`. If dwh is missing or empty, the request may return 200 with empty data or 500.

### Other endpoints

- **GET /notes-api/v1/notes/:id**, **GET /notes-api/v1/notes/:id/comments**: unit (getNoteById, getNoteComments) and integration (notes.test) with valid/invalid ID, User-Agent, rate limit.
- **Analytics (trends, global)**: unit (trendsService, analyticsService) and integration (trends.test, analytics.test).
- **Hashtags, comparison, rankings, search (users/countries), users, countries, health, etc.**: each has unit and/or integration tests; see the corresponding `tests/unit` and `tests/integration` files.

**Validation**: Integration tests also assert 400 for invalid `date_from` format and invalid `bbox` format (e.g. `bbox=1,2,3`).

---

## Integration tests and database schema

**Unit tests** mock the database pool. They do not run real SQL, so they do not validate that column names in the code match the actual database (e.g. `user_id` vs `id_user` in `public.notes`). They only verify service behaviour given mocked rows.

**Integration tests** call the real API against a real database (e.g. `osm_notes_api_test`). For notes endpoints they allow both 200 and 500 so that tests do not fail when the DB is unavailable or empty. As a result, a wrong schema (e.g. table with `id_user` instead of `user_id`) can produce 500 in production even if integration tests pass.

To avoid schema mismatches:

1. **Match the schema to Ingestion**: The API expects `public.notes` to follow OSM-Notes-Ingestion schema with columns `id_user` and `id_country` (see [Database Schema](Database_Schema.md)).
2. **Test DB setup**: If you run integration tests with a real DB, create or migrate the test database so that `public.notes` uses `user_id` and `country_id`. Then integration tests that get 200 will assert the response shape (e.g. `id_user`, `id_country` on note objects).

## Troubleshooting

### Error: "Cannot connect to database"
- Verify PostgreSQL is running
- Verify database environment variables
- Verify the database exists

### Error: "User-Agent required"
- Make sure to include User-Agent header in all requests
- Format: `AppName/Version (Contact)`

### Error: "Rate limit exceeded"
- Wait 15 minutes or restart Redis
- Use a different User-Agent
- Use a different IP

### Error: "404 Not Found"
- Verify the ID exists in the database
- Verify the corresponding table has data

## Additional Resources

- [API Documentation](Usage.md)
- [Installation Guide](Installation.md)
- [Architecture](Architecture.md)



