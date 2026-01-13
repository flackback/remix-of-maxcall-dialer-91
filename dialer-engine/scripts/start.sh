#!/bin/bash

# Dialer Engine Start Script
# Usage: ./scripts/start.sh [dev|prod]

set -e

MODE="${1:-prod}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "========================================"
echo "  DIALER ENGINE - Starting ($MODE)"
echo "========================================"

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found!"
  echo "Copy .env.example to .env and configure it."
  exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Validate required variables
REQUIRED_VARS="SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY VOICE_ADAPTER"
for var in $REQUIRED_VARS; do
  if [ -z "${!var}" ]; then
    echo "ERROR: Required variable $var is not set!"
    exit 1
  fi
done

echo "Configuration:"
echo "  - Supabase URL: ${SUPABASE_URL:0:40}..."
echo "  - Voice Adapter: $VOICE_ADAPTER"
echo "  - Log Level: ${LOG_LEVEL:-info}"
echo ""

if [ "$MODE" = "dev" ]; then
  echo "Starting in DEVELOPMENT mode..."
  npm run dev
else
  echo "Starting in PRODUCTION mode..."
  
  # Build if dist doesn't exist
  if [ ! -d "dist" ]; then
    echo "Building TypeScript..."
    npm run build
  fi
  
  npm start
fi
