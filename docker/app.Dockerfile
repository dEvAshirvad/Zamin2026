# syntax=docker/dockerfile:1
# Build from repo root: docker build -f docker/app.Dockerfile -t projectzamin-app .

FROM node:22-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS deps
ENV HUSKY=0
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY app/package.json ./app/
RUN pnpm install --frozen-lockfile --filter projectzamin-frontend...

FROM base AS builder
ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/app/node_modules ./app/node_modules
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY app ./app
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter projectzamin-frontend build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/app/public ./app/public
COPY --from=builder --chown=nextjs:nodejs /app/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/app/.next/static ./app/.next/static

USER nextjs
EXPOSE 3000
# Monorepo standalone emits server at app/server.js
CMD ["node", "app/server.js"]
