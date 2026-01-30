#!/bin/bash
# Test script to verify mobile API read-only enforcement
# Usage: ./scripts/test_mobile_readonly.sh [API_URL]

API_URL="${1:-http://localhost:8000}"
API_KEY="demo_mobile_key"

echo "=============================================="
echo "Mobile API Read-Only Enforcement Test"
echo "=============================================="
echo "API URL: $API_URL"
echo "API Key: $API_KEY"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4

    response=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "X-MOBILE-API-KEY: $API_KEY" \
        -H "Content-Type: application/json" \
        "$API_URL$endpoint")

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}[PASS]${NC} $method $endpoint - $description"
        echo "       Status: $status_code (expected: $expected_status)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}[FAIL]${NC} $method $endpoint - $description"
        echo "       Status: $status_code (expected: $expected_status)"
        echo "       Body: $body"
        ((TESTS_FAILED++))
    fi
    echo ""
}

echo "Testing READ operations (should succeed)..."
echo "----------------------------------------------"

# Test health endpoint (no auth)
response=$(curl -s -w "\n%{http_code}" "$API_URL/api/v2/mobile/health")
status=$(echo "$response" | tail -n1)
if [ "$status" = "200" ]; then
    echo -e "${GREEN}[PASS]${NC} GET /health - Health check (no auth)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}[FAIL]${NC} GET /health - Health check"
    ((TESTS_FAILED++))
fi
echo ""

test_endpoint "GET" "/api/v2/mobile/projections/BTCUSDT?feed=binanceus" "200" "Get projections"
test_endpoint "GET" "/api/v2/mobile/interpretation/BTCUSDT?feed=binanceus" "200" "Get interpretation"
test_endpoint "GET" "/api/v2/mobile/pulse/BTCUSDT?feed=binanceus" "200" "Get pulse"
test_endpoint "GET" "/api/v2/mobile/symbols?feed=binanceus" "200" "Get symbols"

echo "Testing WRITE operations (should be rejected with 403)..."
echo "----------------------------------------------"

test_endpoint "POST" "/api/v2/mobile/test-write" "403" "POST should be rejected"
test_endpoint "PUT" "/api/v2/mobile/test-write" "403" "PUT should be rejected"
test_endpoint "DELETE" "/api/v2/mobile/test-write" "403" "DELETE should be rejected"

# Test POST with body
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "X-MOBILE-API-KEY: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"data":"test"}' \
    "$API_URL/api/v2/mobile/test-write")
status=$(echo "$response" | tail -n1)
if [ "$status" = "403" ]; then
    echo -e "${GREEN}[PASS]${NC} POST with body should be rejected"
    ((TESTS_PASSED++))
else
    echo -e "${RED}[FAIL]${NC} POST with body should be rejected (got $status)"
    ((TESTS_FAILED++))
fi
echo ""

echo "Testing authentication..."
echo "----------------------------------------------"

# Test without API key
response=$(curl -s -w "\n%{http_code}" "$API_URL/api/v2/mobile/projections/BTCUSDT")
status=$(echo "$response" | tail -n1)
if [ "$status" = "401" ]; then
    echo -e "${GREEN}[PASS]${NC} Request without API key returns 401"
    ((TESTS_PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Request without API key should return 401 (got $status)"
    ((TESTS_FAILED++))
fi
echo ""

# Test with invalid API key
response=$(curl -s -w "\n%{http_code}" \
    -H "X-MOBILE-API-KEY: invalid_key" \
    "$API_URL/api/v2/mobile/projections/BTCUSDT")
status=$(echo "$response" | tail -n1)
if [ "$status" = "403" ]; then
    echo -e "${GREEN}[PASS]${NC} Request with invalid API key returns 403"
    ((TESTS_PASSED++))
else
    echo -e "${RED}[FAIL]${NC} Request with invalid API key should return 403 (got $status)"
    ((TESTS_FAILED++))
fi
echo ""

echo "=============================================="
echo "Test Results"
echo "=============================================="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! Read-only enforcement is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the mobile API implementation.${NC}"
    exit 1
fi
