#!/bin/bash
# Script to run query analysis using environment variables
# Usage: ./scripts/run_analysis.sh

set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set defaults
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-osm_notes_dwh}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-}

# Check if password is set
if [ -z "$DB_PASSWORD" ]; then
    echo "Error: DB_PASSWORD not set. Please set it in .env or as environment variable."
    echo "You can also use: PGPASSWORD=your_password $0"
    exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

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

