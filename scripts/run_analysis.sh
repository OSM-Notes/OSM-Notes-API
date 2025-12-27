#!/bin/bash
# Script to run query analysis using environment variables
# Usage: ./scripts/run_analysis.sh

set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set defaults
# Note: For local testing, use osm_notes_api_test
# For production analysis, use osm_notes_dwh
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-osm_notes_api_test}
DB_USER=${DB_USER:-$(whoami)}
DB_PASSWORD=${DB_PASSWORD:-}

# Set password if provided, otherwise use peer authentication
if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD="$DB_PASSWORD"
fi

echo "=================================================================================="
echo "Running Query Performance Analysis"
echo "=================================================================================="
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Run analysis script
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/analyze_queries.sql

echo ""
echo "=================================================================================="
echo "Analysis complete!"
echo "=================================================================================="

