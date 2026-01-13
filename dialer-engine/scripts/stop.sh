#!/bin/bash

# Dialer Engine Stop Script
# Gracefully stops the engine

set -e

echo "========================================"
echo "  DIALER ENGINE - Stopping"
echo "========================================"

# Find and kill the process
PID=$(pgrep -f "node.*dialer-engine" || true)

if [ -z "$PID" ]; then
  echo "No running Dialer Engine process found."
  exit 0
fi

echo "Found process: $PID"
echo "Sending SIGTERM for graceful shutdown..."

kill -SIGTERM "$PID"

# Wait for graceful shutdown (max 30 seconds)
TIMEOUT=30
while [ $TIMEOUT -gt 0 ]; do
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "Process stopped gracefully."
    exit 0
  fi
  sleep 1
  TIMEOUT=$((TIMEOUT - 1))
done

# Force kill if still running
echo "Process did not stop gracefully, forcing..."
kill -9 "$PID" 2>/dev/null || true

echo "Process terminated."
