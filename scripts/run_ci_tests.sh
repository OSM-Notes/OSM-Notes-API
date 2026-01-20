#!/usr/bin/env bash
#
# Run CI Tests Locally
# Simulates the GitHub Actions workflow to test changes locally
# Author: Andres Gomez (AngocA)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

print_message() {
    local color="${1}"
    shift
    echo -e "${color}$*${NC}"
}

print_message "${YELLOW}" "=== Running CI Tests Locally (OSM-Notes-API) ==="
echo

cd "${PROJECT_ROOT}"

# Check Node.js version
if ! command -v node > /dev/null 2>&1; then
    print_message "${RED}" "Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ ${NODE_VERSION} -lt 18 ]]; then
    print_message "${RED}" "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_message "${GREEN}" "✓ Node.js $(node -v) found"

# Check npm
if ! command -v npm > /dev/null 2>&1; then
    print_message "${RED}" "npm is not installed"
    exit 1
fi

print_message "${GREEN}" "✓ npm $(npm -v) found"

# Check PostgreSQL (optional for lint/build, required for integration tests)
if command -v psql > /dev/null 2>&1; then
    print_message "${GREEN}" "✓ PostgreSQL client found"
else
    print_message "${YELLOW}" "⚠ PostgreSQL client not found (integration tests may skip)"
fi

# Check Redis (optional)
if command -v redis-cli > /dev/null 2>&1; then
    print_message "${GREEN}" "✓ Redis client found"
else
    print_message "${YELLOW}" "⚠ Redis client not found (optional for tests)"
fi

echo
print_message "${YELLOW}" "=== Step 1: Lint and Type Check ==="
echo

# Install dependencies
print_message "${BLUE}" "Installing dependencies..."
npm ci

# Run ESLint
print_message "${BLUE}" "Running ESLint..."
if npm run lint; then
    print_message "${GREEN}" "✓ ESLint passed"
else
    print_message "${RED}" "✗ ESLint failed"
    exit 1
fi

# Run TypeScript type check
print_message "${BLUE}" "Running TypeScript type check..."
if npm run type-check; then
    print_message "${GREEN}" "✓ Type check passed"
else
    print_message "${RED}" "✗ Type check failed"
    exit 1
fi

# Check code formatting
print_message "${BLUE}" "Checking code formatting..."
if npm run format:check; then
    print_message "${GREEN}" "✓ Code formatting check passed"
else
    print_message "${RED}" "✗ Code formatting check failed"
    exit 1
fi

# Check Prettier formatting for other files
print_message "${BLUE}" "Checking Prettier formatting for other files..."
if npx prettier --check "**/*.{md,json,yaml,yml,css,html}" --ignore-path .prettierignore 2>/dev/null; then
    print_message "${GREEN}" "✓ Prettier formatting check passed"
else
    print_message "${YELLOW}" "⚠ Prettier formatting issues found (non-blocking)"
fi

echo
print_message "${YELLOW}" "=== Step 2: Build ==="
echo

# Build TypeScript
print_message "${BLUE}" "Building TypeScript..."
if npm run build; then
    print_message "${GREEN}" "✓ Build successful"
else
    print_message "${RED}" "✗ Build failed"
    exit 1
fi

echo
print_message "${YELLOW}" "=== Step 3: Unit Tests ==="
echo

# Run unit tests (test suite)
print_message "${BLUE}" "Running unit tests (test suite)..."
if npm run test:unit; then
    print_message "${GREEN}" "✓ Unit tests passed"
else
    print_message "${RED}" "✗ Unit tests failed"
    exit 1
fi

# Generate coverage report
print_message "${BLUE}" "Generating coverage report..."
if npm run test:coverage; then
    print_message "${GREEN}" "✓ Coverage report generated"
else
    print_message "${YELLOW}" "⚠ Coverage report generation failed (non-blocking)"
fi

echo
print_message "${YELLOW}" "=== Step 4: Integration Tests ==="
echo

# Check if PostgreSQL is available
if command -v psql > /dev/null 2>&1; then
    # Check if PostgreSQL is running
    if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        print_message "${GREEN}" "✓ PostgreSQL is running"

        # Setup test database
        print_message "${BLUE}" "Setting up test database..."
        export DB_HOST=localhost
        export DB_PORT=5432
        export DB_NAME=osm_notes_api_test
        export DB_USER=osm_notes_test_user
        export DB_PASSWORD=osm_notes_test_pass
        export REDIS_HOST=localhost
        export REDIS_PORT=6379
        export NODE_ENV=test

        # Try to create test database (may fail if it exists, which is OK)
        PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || true

        # Run integration tests
        print_message "${BLUE}" "Running integration tests..."
        if npm run test:integration; then
            print_message "${GREEN}" "✓ Integration tests passed"
        else
            print_message "${RED}" "✗ Integration tests failed"
            exit 1
        fi
    else
        print_message "${YELLOW}" "⚠ PostgreSQL is not running. Skipping integration tests."
        print_message "${YELLOW}" "   Start PostgreSQL to run integration tests:"
        print_message "${YELLOW}" "   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15"
    fi
else
    print_message "${YELLOW}" "⚠ PostgreSQL client not found. Skipping integration tests."
fi

echo
print_message "${YELLOW}" "=== Step 5: Security Audit ==="
echo

# Run npm audit
print_message "${BLUE}" "Running npm audit..."
if npm audit --audit-level=moderate; then
    print_message "${GREEN}" "✓ Security audit passed"
else
    print_message "${YELLOW}" "⚠ Security audit found issues (non-blocking)"
fi

echo
print_message "${GREEN}" "=== All CI Tests Completed Successfully ==="
echo
print_message "${GREEN}" "✅ Lint and Type Check: PASSED"
print_message "${GREEN}" "✅ Build: PASSED"
print_message "${GREEN}" "✅ Unit Tests: PASSED"
if command -v psql > /dev/null 2>&1 && pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    print_message "${GREEN}" "✅ Integration Tests: PASSED"
fi
print_message "${GREEN}" "✅ Security Audit: COMPLETED"
echo

exit 0
