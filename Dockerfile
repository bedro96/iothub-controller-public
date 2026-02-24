# Multi-stage build for production-optimized Next.js application
# Stage 1: Dependencies
FROM node:20-bullseye AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Builder
FROM node:20-bullseye AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client (required so @prisma/client can find .prisma files.)
RUN pnpm prisma generate

# Build the application
ARG CACHEBUST=1
RUN pnpm run build

# Stage 3: Runner (Production)
FROM node:20-bullseye AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy runtime artifacts from builder for custom server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
# Prisma runtime files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
### .gitignore, .dockerignore, and bottom line is needed to ensure .env in place.
COPY --from=builder /app/.env ./.env 

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set port environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the custom server compiled by tsc
CMD ["node", "dist/server.js"]