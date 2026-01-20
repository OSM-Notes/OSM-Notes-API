# Installation Manual

Complete guide to install and configure OSM Notes API.

## Prerequisites

### Required Software

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 (or equivalent yarn/pnpm)
- **PostgreSQL**: >= 15.0
- **Redis**: >= 7.0 (optional but recommended)

### Database Access

The API requires access to the Analytics database:
- **Database**: `osm_notes_dwh`
- **Schema**: `dwh` (datamarts)
- **User**: With read permissions on `dwh` schema
- **Foreign Data Wrappers**: If databases are separate, FDWs must be configured

### Infrastructure

- **Server**: Recommended 2-4 CPU cores, 4GB RAM minimum
- **Network**: Low latency to PostgreSQL (< 5ms ideal)

## Local Installation

### 1. Clone Repository

```bash
git clone https://github.com/OSM-Notes/OSM-Notes-API.git
cd OSM-Notes-API
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configurations:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=192.168.0.7
DB_PORT=5432
DB_NAME=osm_notes_dwh
DB_USER=analytics_user
DB_PASSWORD=your_password_here

# Redis
REDIS_HOST=192.168.0.7
REDIS_PORT=6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=info
```

### 4. Build TypeScript

```bash
npm run build
```

### 5. Verify Installation

```bash
# Verify types
npm run type-check

# Run tests (requires test database)
npm test

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Verify formatting
npm run format:check
```

**Note**: Integration tests require a test database. By default, tests use:
- **Database**: `osm_notes_api_test`
- **User**: `osm_notes_test_user`
- **Password**: `osm_notes_test_pass`

To set up the test database, create the user and database in PostgreSQL:
```sql
CREATE USER osm_notes_test_user WITH PASSWORD 'osm_notes_test_pass';
ALTER USER osm_notes_test_user CREATEDB;
CREATE DATABASE osm_notes_api_test OWNER osm_notes_test_user;
GRANT ALL PRIVILEGES ON DATABASE osm_notes_api_test TO osm_notes_test_user;
```

You can override these defaults by setting environment variables:
```bash
export DB_NAME=your_test_db
export DB_USER=your_test_user
export DB_PASSWORD=your_test_password
```

### 6. Start Application

```bash
# Production
npm start

# Development (with hot reload)
npm run dev
```

The API will be available at `http://localhost:3000`

## Docker Installation

### Requirements

- Docker >= 20.10
- Docker Compose >= 2.0

### Steps

1. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env
   ```

2. **Start services**:
   ```bash
   docker compose -f docker/docker compose.yml up -d
   ```

3. **Verify everything is running**:
   ```bash
   docker compose -f docker/docker compose.yml ps
   docker compose -f docker/docker compose.yml logs api
   ```

4. **Health check**:
   ```bash
   curl http://localhost:3000/health
   ```

See [docker/README.md](../docker/README.md) for more Docker details.

## Installation Verification

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-12-14T10:00:00.000Z"
}
```

### Database Connection Test

```bash
# From container or server
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM dwh.datamartUsers LIMIT 1;"
```

### Redis Connection Test

```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

## Advanced Configuration

### Complete Environment Variables

See `.env.example` for all available variables:

- **Server**: PORT, NODE_ENV, API_VERSION
- **Database**: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL
- **Redis**: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB
- **Rate Limiting**: RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS
- **OAuth**: OAUTH_ENABLED, OSM_OAUTH_CLIENT_ID, OSM_OAUTH_CLIENT_SECRET
- **Logging**: LOG_LEVEL, LOG_FORMAT
- **Metrics**: METRICS_ENABLED, METRICS_PORT
- **Documentation**: API_DOCS_ENABLED, API_DOCS_PATH

### External Database Configuration

If the database is on a remote server:

1. Ensure PostgreSQL allows remote connections
2. Configure firewall to allow connections from API server
3. Use SSL if possible:
   ```env
   DB_SSL=true
   ```

### External Redis Configuration

If Redis is on a remote server:

1. Configure Redis to accept remote connections
2. Configure password if necessary:
   ```env
   REDIS_PASSWORD=your_secure_password
   ```

## Troubleshooting

### Database Connection Error

```bash
# Verify PostgreSQL is running
systemctl status postgresql

# Verify connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Verify user permissions
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\du"
```

### Redis Connection Error

```bash
# Verify Redis is running
redis-cli ping

# Verify configuration
redis-cli CONFIG GET requirepass
```

### Port Already in Use

```bash
# See what process is using port 3000
lsof -i :3000

# Change port in .env
PORT=3001
```

### Permission Issues

```bash
# Verify file permissions
ls -la

# Adjust if necessary
chmod +x scripts/*
```

## Next Steps

Once installed:

1. Read [docs/USAGE.md](USAGE.md) to learn how to use the API
2. Review [docs/api/](api/) for complete endpoint documentation
3. Check [CONTRIBUTING.md](../CONTRIBUTING.md) if you want to contribute

## Support

If you encounter problems during installation:

1. Review logs: `npm run dev` or `docker compose logs`
2. Verify all requirements are met
3. Open an issue on GitHub with problem details
