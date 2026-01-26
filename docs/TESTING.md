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

**Note**: Integration tests require a running PostgreSQL database. Configure environment variables before running:

```bash
export DB_HOST=localhost
export DB_NAME=osm_notes_dwh
export DB_USER=your_user
export DB_PASSWORD=your_password
export DB_PORT=5432
export DB_SSL=false
```

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
     http://localhost:3000/api/v1/notes/12345
```

**3. Get note comments:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/notes/12345/comments
```

**4. Search notes with filters:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     "http://localhost:3000/api/v1/notes?status=open&country=42&limit=10"
```

**5. Get user profile:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/users/12345
```

**6. Get country profile:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/countries/42
```

**7. Get global analytics:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/analytics/global
```

#### Validation Tests

**Test without User-Agent (should fail):**
```bash
curl http://localhost:3000/api/v1/notes/12345
# Expected: 400 Bad Request
```

**Test with invalid User-Agent:**
```bash
curl -H "User-Agent: InvalidFormat" \
     http://localhost:3000/api/v1/notes/12345
# Expected: 400 Bad Request
```

**Test with invalid ID:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/notes/invalid
# Expected: 400 Bad Request
```

**Test rate limiting (make many rapid requests):**
```bash
for i in {1..60}; do
  curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
       http://localhost:3000/api/v1/notes/12345
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

http GET localhost:3000/api/v1/notes/12345 User-Agent:"TestApp/1.0 (test@example.com)"

http GET localhost:3000/api/v1/notes \
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
     - URL: `{{base_url}}/api/v1/notes/12345`
     - Method: GET

   - **GET Note Comments**
     - URL: `{{base_url}}/api/v1/notes/12345/comments`
     - Method: GET

   - **GET Search Notes**
     - URL: `{{base_url}}/api/v1/notes`
     - Method: GET
     - Params:
       - `status`: `open`
       - `country`: `42`
       - `limit`: `10`

   - **GET User Profile**
     - URL: `{{base_url}}/api/v1/users/12345`
     - Method: GET

   - **GET Country Profile**
     - URL: `{{base_url}}/api/v1/countries/42`
     - Method: GET

   - **GET Global Analytics**
     - URL: `{{base_url}}/api/v1/analytics/global`
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
    const notes = await makeRequest('/api/v1/notes/12345');
    console.log('Note:', notes.status);

    // Test users
    const users = await makeRequest('/api/v1/users/12345');
    console.log('User:', users.status);

    // Test countries
    const countries = await makeRequest('/api/v1/countries/42');
    console.log('Country:', countries.status);

    // Test analytics
    const analytics = await makeRequest('/api/v1/analytics/global');
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
     http://localhost:3000/api/v1/notes/12345 | jq

# With curl and python
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/notes/12345 | python -m json.tool
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
- [ ] GET /api/v1/notes/:note_id
- [ ] GET /api/v1/notes/:note_id/comments
- [ ] GET /api/v1/notes (search)
- [ ] GET /api/v1/users/:user_id
- [ ] GET /api/v1/countries/:country_id
- [ ] GET /api/v1/analytics/global

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

- [API Documentation](USAGE.md)
- [Installation Guide](INSTALLATION.md)
- [Architecture](ARCHITECTURE.md)



