# Multi-stage production Dockerfile for FeatureOS Core API Gateway
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

# Stage 2: Build source
FROM base AS builder
COPY --from=deps /app ./
COPY apps/api/ ./apps/api/

# Generate Prisma Client & Build
RUN pnpm --filter @feature-os/db generate
RUN pnpm --filter @feature-os/types build
RUN pnpm --filter @feature-os/api build

# Stage 3: Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

USER nodejs

EXPOSE 4000

WORKDIR /app/apps/api

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
