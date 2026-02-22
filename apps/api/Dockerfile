# Build stage
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy everything first
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared package
RUN pnpm --filter @ai-desktop/shared build

# Generate Drizzle migrations
RUN pnpm --filter @ai-desktop/api db:generate || true

# Build API
RUN pnpm --filter @ai-desktop/api build

# Production stage
FROM node:22-alpine AS runner

# Install pnpm and curl for healthcheck
RUN apk add --no-cache curl
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api ./apps/api

# Create uploads directory
RUN mkdir -p /app/uploads

# Copy entrypoint script
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh && sed -i 's/\r$//' /app/docker-entrypoint.sh

# Expose port
EXPOSE 8080

# Set working directory to API
WORKDIR /app/apps/api

# Start with entrypoint
CMD ["/app/docker-entrypoint.sh"]
