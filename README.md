# projectZamin

pnpm monorepo — Next.js frontend (`app`, :3000) + Express API (`api`, :3001).

## Quick start

```bash
# 1. Install
pnpm install

# 2. Env (root `.env` for API + compose)
cp .env.example .env
cp app/.env.example app/.env.local

# 3. Data services (Mongo, Redis, MinIO)
pnpm db:up

# 4. Dev
pnpm dev:api   # http://localhost:3001
pnpm dev:app   # http://localhost:3000
```

Auth is email/password only (better-auth). Roles: `admin` (seeded from `ADMIN_*` env), `tehsildar`, `ri` (CSV/XLSX import). Public signup disabled.

VPS-hardened data ports (localhost only):

```bash
pnpm db:up:vps
```

## Packages

| Package | Path | Port |
|---------|------|------|
| `projectzamin-frontend` | `app/` | 3000 |
| `projectzamin-backend` | `api/` | 3001 |

Auth: better-auth under `/api/auth/*`, cookie prefix `zamin`.

## Docker / Coolify

Build from **repo root**:

```bash
docker build -f docker/api.Dockerfile -t projectzamin-api .
docker build -f docker/app.Dockerfile -t projectzamin-app \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com .
```

Point Coolify at `docker/api.Dockerfile` / `docker/app.Dockerfile` with root context. Use `docker-compose.yml` (+ optional `docker-compose.vps.yml`) for Mongo/Redis/MinIO.

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:api` / `dev:app` | Start packages |
| `pnpm build` | Build both |
| `pnpm check:api` | typecheck + lint + test (API) |
| `pnpm db:up` / `db:down` | Compose data stack |

## Nested git cleanup

If `app/.git` still exists (Create Next App leftover), remove it so only the repo root is a git root:

```bash
rm -rf app/.git
```
