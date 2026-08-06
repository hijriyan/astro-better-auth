# Stage 1: Build
FROM node:25-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies, keep only production
RUN npm prune --production

# Stage 2: Production
FROM node:25-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 astro

# Copy production node_modules from builder
COPY --from=builder --chown=astro:nodejs /app/node_modules ./node_modules

# Copy built application from builder
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/package.json ./package.json

# Set environment to production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Switch to non-root user
USER astro

# Expose the port
EXPOSE 4321

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4321/ || exit 1

# Start the application
CMD ["node", "./dist/server/entry.mjs"]
