# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/validation/package.json packages/validation/

RUN pnpm install --frozen-lockfile

COPY packages/shared-types/ packages/shared-types/
COPY packages/validation/ packages/validation/
COPY apps/api/ apps/api/

RUN pnpm --filter shared-types build
RUN pnpm --filter validation build
RUN cd apps/api && pnpm exec prisma generate
RUN NODE_OPTIONS="--max-old-space-size=2048" pnpm --filter api build

# Production stage — copy only what's needed
FROM node:20-alpine

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/validation/package.json packages/validation/

# Install production deps only
RUN CI=true pnpm install --frozen-lockfile --prod --ignore-scripts
RUN apk add --no-cache python3 make g++ && cd /app && pnpm rebuild bcrypt 2>/dev/null; apk del python3 make g++ 2>/dev/null; true

# Copy built artifacts from builder
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/prisma apps/api/prisma
COPY --from=builder /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=builder /app/packages/validation/dist packages/validation/dist

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.pnpm node_modules/.pnpm

EXPOSE 3000

CMD ["node", "apps/api/dist/src/main.js"]
