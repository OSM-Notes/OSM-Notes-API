#!/bin/bash

# Script to load mock data into osm_notes_api_test using OSM-Notes-Ingestion's hybrid script
# This ensures all projects use the same mock data
# Author: OSM Notes API Team
# Version: 2025-12-27

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly PROJECT_ROOT

# Default paths
INGESTION_REPO="${INGESTION_REPO:-${PROJECT_ROOT}/../OSM-Notes-Ingestion}"
readonly INGESTION_REPO
HYBRID_SCRIPT="${INGESTION_REPO}/tests/run_processAPINotes_hybrid.sh"
readonly HYBRID_SCRIPT

# Database configuration (for OSM-Notes-API)
DB_NAME="${DB_NAME:-osm_notes_api_test}"
DB_USER="${DB_USER:-$(whoami)}"
DB_HOST="${DB_HOST:-}"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Function to show help
show_help() {
  cat << 'EOF'
Script to load mock data into osm_notes_api_test using OSM-Notes-Ingestion's hybrid script

This script uses the same mock data generation process as OSM-Notes-Ingestion,
ensuring consistency across all projects.

Usage:
  ./scripts/load_mock_data.sh [OPTIONS]

Options:
  --help, -h              Show this help message
  --ingestion-repo PATH   Path to OSM-Notes-Ingestion repository
                          Default: ../OSM-Notes-Ingestion
  --db-name NAME         Database name (default: osm_notes_api_test)
  --db-user USER         Database user (default: current user)
  --db-host HOST         Database host (default: unix socket)
  --db-port PORT         Database port (default: 5432)
  --db-password PASS     Database password (if required)

Environment variables:
  INGESTION_REPO         Path to OSM-Notes-Ingestion repository
  DB_NAME                Database name
  DB_USER                Database user
  DB_HOST                Database host
  DB_PORT                Database port
  DB_PASSWORD            Database password

Examples:
  # Use default settings
  ./scripts/load_mock_data.sh

  # Specify custom database
  ./scripts/load_mock_data.sh --db-name my_test_db --db-user postgres

  # Use remote database
  ./scripts/load_mock_data.sh --db-host localhost --db-port 5432 --db-user postgres --db-password secret

Prerequisites:
  - OSM-Notes-Ingestion repository must be cloned and accessible
  - PostgreSQL database must exist (osm_notes_api_test)
  - Database user must have CREATE, INSERT, UPDATE, DELETE permissions
  - PostGIS extension must be installed in the database

What this script does:
  1. Verifies OSM-Notes-Ingestion repository exists
  2. Verifies hybrid script exists
  3. Sets up database connection parameters
  4. Executes OSM-Notes-Ingestion's hybrid script with API test database
  5. Verifies data was loaded successfully

The hybrid script will:
  - Create/clean database tables
  - Load base country data (processPlanetNotes.sh --base)
  - Insert mock notes from OSM API (processAPINotes.sh)
  - Insert mock comments
  - Set up all required indexes

After running this script, you can:
  - Run API tests: npm test
  - Start the API: npm start
  - Query the database: psql -d osm_notes_api_test
EOF
}

# Function to check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check if ingestion repo exists
  if [[ ! -d "${INGESTION_REPO}" ]]; then
    log_error "OSM-Notes-Ingestion repository not found: ${INGESTION_REPO}"
    log_error "Please clone the repository or set INGESTION_REPO environment variable"
    log_error "Example: git clone https://github.com/osmlatam/OSM-Notes-Ingestion.git ${INGESTION_REPO}"
    return 1
  fi

  # Check if hybrid script exists
  if [[ ! -f "${HYBRID_SCRIPT}" ]]; then
    log_error "Hybrid script not found: ${HYBRID_SCRIPT}"
    log_error "Please ensure OSM-Notes-Ingestion repository is up to date"
    return 1
  fi

  # Check if script is executable
  if [[ ! -x "${HYBRID_SCRIPT}" ]]; then
    log_info "Making hybrid script executable..."
    chmod +x "${HYBRID_SCRIPT}"
  fi

  # Check PostgreSQL connection
  log_info "Checking PostgreSQL connection..."
  local psql_cmd="psql"
  if [[ -n "${DB_HOST}" ]]; then
    psql_cmd="${psql_cmd} -h ${DB_HOST} -p ${DB_PORT}"
  fi
  if [[ -n "${DB_PASSWORD}" ]]; then
    export PGPASSWORD="${DB_PASSWORD}"
  fi

  if ! ${psql_cmd} -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "Cannot connect to database: ${DB_NAME}"
    log_error "Please ensure:"
    log_error "  1. Database exists: createdb ${DB_NAME}"
    log_error "  2. User has access: GRANT ALL ON DATABASE ${DB_NAME} TO ${DB_USER};"
    log_error "  3. PostGIS is installed: CREATE EXTENSION IF NOT EXISTS postgis;"
    return 1
  fi

  # Check PostGIS extension
  log_info "Checking PostGIS extension..."
  if ! ${psql_cmd} -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT PostGIS_version();" > /dev/null 2>&1; then
    log_warning "PostGIS extension not found, attempting to create it..."
    if ! ${psql_cmd} -U "${DB_USER}" -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS btree_gist;" > /dev/null 2>&1; then
      log_error "Failed to create PostGIS extension"
      log_error "Please install PostGIS: sudo apt-get install postgis"
      return 1
    fi
  fi

  log_success "All prerequisites met"
  return 0
}

# Function to setup ingestion properties
setup_ingestion_properties() {
  log_info "Setting up OSM-Notes-Ingestion properties for API test database..."

  local properties_file="${INGESTION_REPO}/etc/properties_test.sh"
  local properties_backup="${INGESTION_REPO}/etc/properties_test.sh.backup.$$"

  # Backup existing properties if they exist
  if [[ -f "${properties_file}" ]]; then
    log_info "Backing up existing properties file..."
    cp "${properties_file}" "${properties_backup}"
  fi

  # Create/update properties file for API test database
  log_info "Creating properties file for API test database..."
  cat > "${properties_file}" << EOF
#!/bin/bash
# Properties file for OSM-Notes-API test database
# Generated by load_mock_data.sh
# DO NOT EDIT - This file is auto-generated

# Database configuration
export DBNAME="${DB_NAME}"
export DB_USER="${DB_USER}"
export DB_HOST="${DB_HOST:-}"
export DB_PORT="${DB_PORT}"
export DB_PASSWORD="${DB_PASSWORD:-}"

# Other required properties (use defaults from OSM-Notes-Ingestion)
export TMP_DIR="/tmp/osm_notes_ingestion_\${USER:-$(whoami)}"
export LOG_DIR="\${TMP_DIR}/logs"
export DATA_DIR="\${TMP_DIR}/data"
export BACKUP_DIR="\${TMP_DIR}/backup"

# Processing configuration
export MIN_NOTES_FOR_PARALLEL=10
export MAX_PARALLEL_PROCESSES=4
export BATCH_SIZE=1000

# Logging
export LOG_LEVEL="INFO"
EOF

  chmod +x "${properties_file}"
  log_success "Properties file created: ${properties_file}"
}

# Function to restore ingestion properties
restore_ingestion_properties() {
  local properties_file="${INGESTION_REPO}/etc/properties_test.sh"
  local properties_backup="${INGESTION_REPO}/etc/properties_test.sh.backup.$$"

  if [[ -f "${properties_backup}" ]]; then
    log_info "Restoring original properties file..."
    mv "${properties_backup}" "${properties_file}"
  fi
}

# Function to execute hybrid script
execute_hybrid_script() {
  log_info "Executing OSM-Notes-Ingestion hybrid script..."

  # Export database variables for the hybrid script
  export DBNAME="${DB_NAME}"
  export DB_USER="${DB_USER}"
  if [[ -n "${DB_HOST}" ]]; then
    export DB_HOST="${DB_HOST}"
  else
    unset DB_HOST
  fi
  export DB_PORT="${DB_PORT}"
  if [[ -n "${DB_PASSWORD}" ]]; then
    export DB_PASSWORD="${DB_PASSWORD}"
    export PGPASSWORD="${DB_PASSWORD}"
  else
    unset DB_PASSWORD
    unset PGPASSWORD
  fi

  # Change to ingestion repo directory
  cd "${INGESTION_REPO}"

  # Execute hybrid script
  log_info "Running: ${HYBRID_SCRIPT}"
  if bash "${HYBRID_SCRIPT}" 2>&1 | tee /tmp/load_mock_data.log; then
    log_success "Hybrid script completed successfully"
    return 0
  else
    log_error "Hybrid script failed"
    log_error "Check /tmp/load_mock_data.log for details"
    return 1
  fi
}

# Function to verify data was loaded
verify_data_loaded() {
  log_info "Verifying data was loaded..."

  local psql_cmd="psql"
  if [[ -n "${DB_HOST}" ]]; then
    psql_cmd="${psql_cmd} -h ${DB_HOST} -p ${DB_PORT}"
  fi
  if [[ -n "${DB_PASSWORD}" ]]; then
    export PGPASSWORD="${DB_PASSWORD}"
  fi

  # Check if tables exist
  local tables_count
  tables_count=$(${psql_cmd} -U "${DB_USER}" -d "${DB_NAME}" -Atq -c "
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('notes', 'note_comments', 'countries');
  " 2>/dev/null | grep -E '^[0-9]+$' | head -1 || echo "0")

  if [[ "${tables_count}" -lt 3 ]]; then
    log_error "Required tables not found (found ${tables_count}/3)"
    return 1
  fi

  # Check if notes exist
  local notes_count
  notes_count=$(${psql_cmd} -U "${DB_USER}" -d "${DB_NAME}" -Atq -c "
    SELECT COUNT(*) FROM public.notes;
  " 2>/dev/null | grep -E '^[0-9]+$' | head -1 || echo "0")

  if [[ "${notes_count}" -eq 0 ]]; then
    log_warning "No notes found in database (this might be OK if hybrid script didn't process notes)"
  else
    log_success "Found ${notes_count} notes in database"
  fi

  # Check if countries exist
  local countries_count
  countries_count=$(${psql_cmd} -U "${DB_USER}" -d "${DB_NAME}" -Atq -c "
    SELECT COUNT(*) FROM public.countries;
  " 2>/dev/null | grep -E '^[0-9]+$' | head -1 || echo "0")

  if [[ "${countries_count}" -eq 0 ]]; then
    log_warning "No countries found in database"
  else
    log_success "Found ${countries_count} countries in database"
  fi

  log_success "Data verification completed"
  return 0
}

# Main function
main() {
  local exit_code=0

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help | -h)
        show_help
        exit 0
        ;;
      --ingestion-repo)
        INGESTION_REPO="$2"
        shift 2
        ;;
      --db-name)
        DB_NAME="$2"
        shift 2
        ;;
      --db-user)
        DB_USER="$2"
        shift 2
        ;;
      --db-host)
        DB_HOST="$2"
        shift 2
        ;;
      --db-port)
        DB_PORT="$2"
        shift 2
        ;;
      --db-password)
        DB_PASSWORD="$2"
        shift 2
        ;;
      *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done

  # Setup trap for cleanup
  trap 'restore_ingestion_properties; cd "${PROJECT_ROOT}"' EXIT SIGINT SIGTERM

  log_info "=================================================================================="
  log_info "Loading mock data into ${DB_NAME} using OSM-Notes-Ingestion hybrid script"
  log_info "=================================================================================="
  log_info ""

  # Check prerequisites
  if ! check_prerequisites; then
    log_error "Prerequisites check failed"
    exit 1
  fi

  # Setup ingestion properties
  if ! setup_ingestion_properties; then
    log_error "Failed to setup ingestion properties"
    exit 1
  fi

  # Execute hybrid script
  if ! execute_hybrid_script; then
    log_error "Failed to execute hybrid script"
    exit_code=1
  fi

  # Verify data was loaded
  if ! verify_data_loaded; then
    log_warning "Data verification had issues (this might be OK)"
  fi

  log_info ""
  log_info "=================================================================================="
  if [[ ${exit_code} -eq 0 ]]; then
    log_success "Mock data loading completed successfully"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Run API tests: npm test"
    log_info "  2. Start the API: npm start"
    log_info "  3. Query the database: psql -d ${DB_NAME}"
  else
    log_error "Mock data loading completed with errors"
    log_info "Check /tmp/load_mock_data.log for details"
  fi
  log_info "=================================================================================="

  exit ${exit_code}
}

# Run main function
main "$@"

