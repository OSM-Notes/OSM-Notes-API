#!/bin/bash

# Performance Benchmarks Script for OSM Notes API
# This script runs basic performance benchmarks and collects metrics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
USER_AGENT="Benchmark/1.0 (benchmark@example.com)"
RESULTS_DIR="${RESULTS_DIR:-./benchmarks/results}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="${RESULTS_DIR}/benchmark_${TIMESTAMP}.json"

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}OSM Notes API Performance Benchmarks${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "API URL: $API_URL"
echo "Results will be saved to: $RESULTS_FILE"
echo ""

# Check if API is running
echo -e "${YELLOW}Checking API health...${NC}"
if ! curl -s -f -H "User-Agent: $USER_AGENT" "${API_URL}/health" > /dev/null; then
    echo -e "${RED}Error: API is not responding at $API_URL${NC}"
    echo "Please ensure the API is running before running benchmarks."
    exit 1
fi
echo -e "${GREEN}✓ API is healthy${NC}"
echo ""

# Function to run benchmark for an endpoint
run_benchmark() {
    local endpoint=$1
    local name=$2
    local iterations=${3:-10}
    
    echo -e "${YELLOW}Benchmarking: $name${NC}"
    echo "  Endpoint: $endpoint"
    echo "  Iterations: $iterations"
    
    local times=()
    local errors=0
    local total_time=0
    
    for i in $(seq 1 $iterations); do
        local start_time=$(date +%s.%N)
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "User-Agent: $USER_AGENT" \
            "${API_URL}${endpoint}" 2>/dev/null || echo "000")
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc)
        
        if [ "$http_code" = "200" ]; then
            times+=($duration)
            total_time=$(echo "$total_time + $duration" | bc)
        else
            errors=$((errors + 1))
        fi
        
        # Progress indicator
        if [ $((i % 5)) -eq 0 ]; then
            echo -n "."
        fi
    done
    echo ""
    
    if [ ${#times[@]} -eq 0 ]; then
        echo -e "  ${RED}✗ All requests failed${NC}"
        return
    fi
    
    # Calculate statistics
    local count=${#times[@]}
    local avg=$(echo "scale=3; $total_time / $count" | bc)
    
    # Sort times for percentiles
    IFS=$'\n' sorted=($(sort -n <<<"${times[*]}"))
    unset IFS
    
    local p50_idx=$((count * 50 / 100))
    local p95_idx=$((count * 95 / 100))
    local p99_idx=$((count * 99 / 100))
    
    local p50=${sorted[$p50_idx]}
    local p95=${sorted[$p95_idx]}
    local p99=${sorted[$p99_idx]}
    
    local min=${sorted[0]}
    local max=${sorted[-1]}
    
    echo -e "  ${GREEN}✓ Completed: $count successful, $errors errors${NC}"
    echo "  Average: ${avg}s"
    echo "  P50: ${p50}s | P95: ${p95}s | P99: ${p99}s"
    echo "  Min: ${min}s | Max: ${max}s"
    echo ""
    
    # Save to JSON
    cat >> "$RESULTS_FILE" <<EOF
  {
    "name": "$name",
    "endpoint": "$endpoint",
    "iterations": $iterations,
    "successful": $count,
    "errors": $errors,
    "statistics": {
      "avg": $avg,
      "p50": $p50,
      "p95": $p95,
      "p99": $p99,
      "min": $min,
      "max": $max
    }
  },
EOF
}

# Initialize results file
cat > "$RESULTS_FILE" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "api_url": "$API_URL",
  "benchmarks": [
EOF

# Run benchmarks
echo -e "${BLUE}Starting benchmarks...${NC}"
echo ""

# Simple endpoints (fast)
run_benchmark "/health" "Health Check" 20
run_benchmark "/api/v1/notes/1" "Get Note by ID" 20
run_benchmark "/api/v1/users/1" "Get User Profile" 20
run_benchmark "/api/v1/countries/1" "Get Country Profile" 20

# Search endpoints (medium)
run_benchmark "/api/v1/notes?limit=10" "Search Notes" 15
run_benchmark "/api/v1/search/users?q=test" "Search Users" 15

# Analytics endpoints (slower)
run_benchmark "/api/v1/analytics/global" "Global Analytics" 10
run_benchmark "/api/v1/users/rankings?limit=10" "User Rankings" 10

# Close JSON array
sed -i '$ s/,$//' "$RESULTS_FILE"
cat >> "$RESULTS_FILE" <<EOF
  ]
}
EOF

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Benchmarks completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Results saved to: $RESULTS_FILE"
echo ""
echo "To view results:"
echo "  cat $RESULTS_FILE | jq '.'"
echo ""
echo "To compare with previous runs:"
echo "  diff $RESULTS_FILE benchmarks/results/benchmark_YYYYMMDD_HHMMSS.json"
