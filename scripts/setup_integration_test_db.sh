#!/usr/bin/env bash
#
# Populate osm_notes_api_test by running the sibling project's
# run_processAPINotes_with_etl.sh (Ingestion + ETL). After this script,
# the API integration tests can run against a DB with public.notes and dwh.*.
#
# Prerequisites:
#   - OSM-Notes-Analytics and OSM-Notes-Ingestion at same filesystem level as OSM-Notes-API
#   - PostgreSQL running; DB credentials via env or Ingestion etc/properties_test.sh
#
# Usage:
#   ./scripts/setup_integration_test_db.sh
#
# Environment (optional):
#   DB_HOST, DB_PORT, DB_USER_INGESTION, etc. as required by the Analytics script
#
# Author: OSM-Notes-API
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# Sibling repo: same parent as OSM-Notes-API
ANALYTICS_ROOT="$(cd "${API_ROOT}/../OSM-Notes-Analytics" && pwd)"
RUN_SCRIPT="${ANALYTICS_ROOT}/tests/run_processAPINotes_with_etl.sh"

readonly API_ROOT ANALYTICS_ROOT RUN_SCRIPT

if [[ ! -f "${RUN_SCRIPT}" ]]; then
  echo "Error: Sibling script not found: ${RUN_SCRIPT}" >&2
  echo "Ensure OSM-Notes-Analytics is checked out at: ${ANALYTICS_ROOT}" >&2
  exit 1
fi

echo "=== Setting up integration test DB (osm_notes_api_test) via Analytics pipeline ==="
echo "  API root:      ${API_ROOT}"
echo "  Analytics:     ${ANALYTICS_ROOT}"
echo "  Run script:    ${RUN_SCRIPT}"
echo "  DB (ingestion + analytics): osm_notes_api_test"
echo ""

# Use single DB for both ingestion and DWH so API tests have both public.notes and dwh
export DBNAME=osm_notes_api_test
export ANALYTICS_DBNAME=osm_notes_api_test

cd "${ANALYTICS_ROOT}/tests"
bash "${RUN_SCRIPT}"
EXIT_CODE=$?

cd "${API_ROOT}"
if [[ ${EXIT_CODE} -eq 0 ]]; then
  echo ""
  echo "=== Setup complete. Run API integration tests with: ==="
  echo "  export DB_NAME=osm_notes_api_test"
  echo "  npm run test:integration"
  echo "  # or: ./scripts/run_ci_tests.sh"
fi
exit ${EXIT_CODE}
