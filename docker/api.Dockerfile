# syntax=docker/dockerfile:1
# Build from repo root: docker build -f docker/api.Dockerfile -t projectzamin-api .

FROM node:22-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS deps
ENV HUSKY=0
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY api/package.json ./api/
RUN pnpm install --frozen-lockfile --filter projectzamin-backend...

FROM base AS builder
ENV HUSKY=0
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY api ./api
RUN pnpm --filter projectzamin-backend build

FROM base AS prod-deps
ENV HUSKY=0
# bcrypt native build on alpine
RUN apk add --no-cache python3 make g++
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY api/package.json ./api/
# Strip root prepare (husky); allow package install scripts (bcrypt)
RUN pnpm pkg delete scripts.prepare \
  && pnpm install --frozen-lockfile --filter projectzamin-backend... --prod \
  && npm_config_ignore_scripts=true pnpm --filter projectzamin-backend deploy --prod --legacy /out

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache curl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 api

# pnpm deploy → portable node_modules
COPY --from=prod-deps /out/node_modules ./node_modules
COPY --from=prod-deps /out/package.json ./
COPY --from=builder /app/api/dist ./dist
# serverConfig reads public/logo.svg at import time
COPY --from=builder /app/api/public ./public

RUN mkdir -p /app/logs /app/uploads/temp /app/uploads/persist \
  && chown -R api:nodejs /app

USER api
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3001/health || exit 1
CMD ["node", "dist/index.js"]
