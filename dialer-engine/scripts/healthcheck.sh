#!/bin/sh

# Health check script for Docker
# Returns 0 (healthy) or 1 (unhealthy)

set -e

HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health}"
TIMEOUT="${HEALTH_TIMEOUT:-5}"

response=$(curl -sf --max-time "$TIMEOUT" "$HEALTH_URL" 2>/dev/null) || exit 1

# Check if response contains "healthy"
echo "$response" | grep -q '"status":"healthy"' || exit 1

exit 0
