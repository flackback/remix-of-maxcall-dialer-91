# ═══════════════════════════════════════════════════════════════
# ROOT DOCKERFILE - Proxy to dialer-engine
# Use this if Coolify doesn't support subdirectory Dockerfiles
# ═══════════════════════════════════════════════════════════════
#
# IMPORTANT: Configure Coolify with:
#   Build Pack: Dockerfile
#   Dockerfile Location: Dockerfile (or dialer-engine/Dockerfile)
#   Base Directory: . (or dialer-engine)
#
# ═══════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────
# Stage 1: Builder
# ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files from dialer-engine
COPY dialer-engine/package*.json ./

# Install ALL dependencies (including devDependencies for build)
# Using npm install instead of npm ci for flexibility without package-lock.json
RUN npm install

# Copy source code from dialer-engine
COPY dialer-engine/tsconfig.json ./
COPY dialer-engine/src/ ./src/

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ───────────────────────────────────────────────────────────────
# Stage 2: Production
# ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Labels for container identification
LABEL maintainer="Dialer Engine Team"
LABEL description="Node.js worker for power dialer with AMI/ESL support"
LABEL version="1.0.0"

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    curl \
    tini \
    && rm -rf /var/cache/apk/*

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy scripts from dialer-engine
COPY dialer-engine/scripts/healthcheck.sh ./scripts/

# Make scripts executable
RUN chmod +x ./scripts/*.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose health check port
EXPOSE 3000

# Health check using curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -sf http://localhost:3000/health || exit 1

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/index.js"]
