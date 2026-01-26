---
title: "Installation and Dependencies Guide"
description: "Complete guide to install dependencies and set up OSM-Notes-API for development"
version: "1.0.0"
last_updated: "2026-01-26"
author: "AngocA"
tags:
  - "installation"
  - "dependencies"
  - "setup"
audience:
  - "developers"
  - "api-consumers"
project: "OSM-Notes-API"
status: "active"
---

# Installation and Dependencies Guide

Complete guide to install all dependencies and set up OSM-Notes-API for development and production.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [System Dependencies](#system-dependencies)
3. [Internal Dependencies](#internal-dependencies)
4. [Project Installation](#project-installation)
5. [Configuration](#configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Operating System

- **Linux** (Ubuntu 20.04+ / Debian 11+ recommended)
- **macOS** (for development)
- **Windows** (with WSL2 recommended)

### Hardware Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 2GB minimum, 4GB+ recommended
- **Disk**: 5GB+ free space
- **Network**: Low latency to PostgreSQL database (< 5ms ideal)

---

## System Dependencies

### Required Software

#### Node.js and npm

```bash
# Install Node.js 18+ (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

#### PostgreSQL Client

```bash
# Install PostgreSQL client (for database access)
sudo apt-get install -y postgresql-client

# Verify installation
psql --version
```

#### Redis (Optional but Recommended)

```bash
# Install Redis for caching and rate limiting
sudo apt-get install -y redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping  # Should return "PONG"
```

### Verify Installation

```bash
# Check Node.js version
node --version  # >= 18.0.0

# Check npm version
npm --version   # >= 9.0.0

# Check PostgreSQL client
psql --version

# Check Redis (if installed)
redis-cli --version
```

---

## Internal Dependencies

### ⚠️ Required: OSM-Notes-Analytics

**OSM-Notes-API REQUIRES OSM-Notes-Analytics to be installed and configured first.**

The API reads from the Analytics data warehouse:
- **Database**: `osm_notes_dwh` (or `notes` if same database)
- **Schema**: `dwh` (data warehouse with datamarts)
- **Required tables**: `dwh.datamartUsers`, `dwh.datamartCountries`, `dwh.datamartGlobal`

### Installation Order

1. **First**: Install and configure OSM-Notes-Ingestion
2. **Second**: Install and run OSM-Notes-Analytics ETL
3. **Third**: Install OSM-Notes-API (this project)
4. **Verify**: Ensure Analytics data warehouse is populated before starting API

### Database Access Requirements

The API requires:
- **Read access** to Analytics database (`osm_notes_dwh`)
- **Read permissions** on `dwh` schema
- **Foreign Data Wrappers**: If databases are separate, FDWs must be configured in Analytics

---

## Project Installation

### 1. Clone Repository

```bash
# Clone repository
git clone https://github.com/OSM-Notes/OSM-Notes-API.git
cd OSM-Notes-API
```

### 2. Install Node.js Dependencies

```bash
# Install all dependencies
npm install

# This installs:
# - Express.js and middleware
# - PostgreSQL client (pg)
# - Redis client (if using Redis)
# - TypeScript and build tools
# - Testing framework (Jest)
# - Linting and formatting tools
```

### 3. Build TypeScript

```bash
# Build TypeScript to JavaScript
npm run build

# This creates the `dist/` directory with compiled JavaScript
```

---

## Configuration

### 1. Environment Variables

Create a `.env` file in the project root:

```bash
# Copy example if exists
cp .env.example .env

# Edit configuration
nano .env
```

### 2. Required Configuration

Set these environment variables in `.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration (Analytics database)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=osm_notes_dwh
DB_USER=analytics_user
DB_PASSWORD=your_secure_password_here

# Redis Configuration (optional but recommended)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=info

# API Configuration
API_VERSION=v1
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
```

### 3. Verify Configuration

```bash
# Test database connection
psql -h localhost -U analytics_user -d osm_notes_dwh -c "SELECT COUNT(*) FROM dwh.datamartUsers;"

# Test Redis connection (if using Redis)
redis-cli ping
```

---

## Verification

### 1. Verify Dependencies

```bash
# Check Node.js and npm
node --version
npm --version

# Check TypeScript compilation
npm run type-check

# Check code formatting
npm run format:check
```

### 2. Verify Database Access

```bash
# Test connection to Analytics database
psql -h localhost -U analytics_user -d osm_notes_dwh -c "SELECT COUNT(*) FROM dwh.datamartUsers;"
psql -h localhost -U analytics_user -d osm_notes_dwh -c "SELECT COUNT(*) FROM dwh.datamartCountries;"
```

### 3. Run Tests

```bash
# Run all tests (requires test database)
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

**Note**: Integration tests require a test database. By default, tests use:
- **Database**: `osm_notes_api_test`
- **User**: `osm_notes_test_user`
- **Password**: `osm_notes_test_pass`

### 4. Start Development Server

```bash
# Start development server with hot reload
npm run dev

# The API will be available at http://localhost:3000
```

### 5. Test API Endpoints

```bash
# Health check
curl -H "User-Agent: TestApp/1.0 (test@example.com)" http://localhost:3000/health

# Test endpoint (requires valid data in database)
curl -H "User-Agent: TestApp/1.0 (test@example.com)" http://localhost:3000/api/v1/analytics/global
```

---

## Troubleshooting

### Analytics Database Not Found

**Error**: `relation "dwh.datamartUsers" does not exist`

**Solution**:
1. Ensure OSM-Notes-Analytics is installed and ETL has been run
2. Verify Analytics database exists and is populated
3. Check database connection settings in `.env`
4. Verify user has SELECT permissions on `dwh` schema

### Database Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U analytics_user -d osm_notes_dwh

# Check user permissions
psql -U postgres -c "\du analytics_user"
psql -d osm_notes_dwh -U postgres -c "GRANT USAGE ON SCHEMA dwh TO analytics_user;"
psql -d osm_notes_dwh -U postgres -c "GRANT SELECT ON ALL TABLES IN SCHEMA dwh TO analytics_user;"
```

### Redis Connection Issues

```bash
# Check Redis is running
sudo systemctl status redis-server

# Test Redis connection
redis-cli ping

# Check Redis configuration
redis-cli CONFIG GET "*"
```

### TypeScript Build Errors

```bash
# Clean build directory
rm -rf dist/

# Rebuild
npm run build

# Check for TypeScript errors
npm run type-check
```

### Port Already in Use

```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill process if needed
kill -9 <PID>

# Or change port in .env
PORT=3001
```

---

## Production Deployment

### 1. Build for Production

```bash
# Build TypeScript
npm run build

# Set production environment
export NODE_ENV=production
```

### 2. Start Production Server

```bash
# Start production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name osm-notes-api
pm2 save
pm2 startup
```

### 3. Environment Variables

Ensure all production environment variables are set:
- Database credentials
- Redis configuration
- Logging level
- Rate limiting settings

---

## Next Steps

After installation:

1. **Read API Documentation**: `docs/API.md` - API endpoints and usage
2. **Review Development Guide**: `docs/Development.md` - Development guidelines
3. **Check Testing Guide**: `docs/Testing.md` - Testing documentation
4. **Explore Examples**: See `tests/integration/` for API usage examples

---

## Related Documentation

- [Installation Manual](Installation.md) - Detailed installation steps
- [API Documentation](API.md) - Complete API reference
- [Development Guide](Development.md) - Development guidelines
- [Testing Guide](Testing.md) - Testing documentation
- [Troubleshooting Guide](Troubleshooting.md) - Common issues and solutions
