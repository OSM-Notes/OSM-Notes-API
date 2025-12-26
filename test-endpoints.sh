#!/bin/bash
# Script de prueba rápida para endpoints

BASE_URL="http://localhost:3000"
USER_AGENT="TestApp/1.0 (test@example.com)"

echo "=== Testing OSM Notes API Endpoints ==="
echo ""

echo "1. Health Check:"
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/health" | jq '.' || echo "Error or jq not installed"
echo ""

echo "2. API Version Info:"
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/api/v1" | jq '.' || echo "Error or jq not installed"
echo ""

echo "3. Get Note (ID: 12345):"
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/api/v1/notes/12345" | jq '.' || echo "Error or jq not installed"
echo ""

echo "4. Search Notes (status=open, limit=5):"
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/api/v1/notes?status=open&limit=5" | jq '.' || echo "Error or jq not installed"
echo ""

echo "5. Get User Profile (ID: 12345):"
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/api/v1/users/12345" | jq '.' || echo "Error or jq not installed"
echo ""

echo "6. Get Country Profile (ID: 42):"
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/api/v1/countries/42" | jq '.' || echo "Error or jq not installed"
echo ""

echo "7. Get Global Analytics:"
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/api/v1/analytics/global" | jq '.' || echo "Error or jq not installed"
echo ""

echo "=== Testing Error Cases ==="
echo ""

echo "8. Request without User-Agent (should fail):"
curl -s "$BASE_URL/api/v1/notes/12345" | jq '.' || echo "Error or jq not installed"
echo ""

echo "9. Invalid Note ID (should return 400):"
curl -s -H "User-Agent: $USER_AGENT" "$BASE_URL/api/v1/notes/invalid" | jq '.' || echo "Error or jq not installed"
echo ""

echo "=== Tests Complete ==="
