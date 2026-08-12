# projectZamin (ज़मीन)

**Track सर सीमांकन (official land boundary demarcation) applications per tehsil — with role handoffs and a 30-day Lok Seva Guarantee clock.**

Staff-first case tracker for collectorate / tehsil operations. Tehsildars intake applications, assign Revenue Inspectors (RIs), and close the loop with order + eCourt; RIs run notice, hearing, objections, and field demarcation. Admin provisions staff and watches district-wide metrics and audit.

> **v1 is not** a citizen portal, GIS map product, live eCourt API, or challan payment gateway.

---

## Why this exists

The paper process already has a clear sequence. What was missing was a shared, tehsil-scoped tracker that:

1. Makes the **eight-stage pipeline** visible (not a single status pill).
2. Enforces **who may advance** each step (tehsildar vs assigned RI vs admin).
3. Surfaces the **Lok Seva Guarantee** (`filedAt + 30 days`) so overdue work is obvious.
4. Keeps tenancy on the **tehsil**, not on an individual officer account.

---

## Product snapshot

|---|---|
| **Domain** | Collectorate / tehsil ops |
| **Stage** | Phase 5 — ops polish |
| **Locales** | Hindi (default) + English |
| **Auth** | Email/password via better-auth (cookie prefix `zamin`); public signup disabled |
| **Stack** | pnpm monorepo — Next.js app (`:3000`) + Express API (`:3001`) + Mongo / Redis / MinIO |

### Roles

```
Tehsil
  ├── Tehsildar(s)  — create cases, memo, order, eCourt flag
  └── RI(s)         — notice / ishtehaar, hearing, objections, demarcation
Admin               — seed + staff import; all tehsils; metrics & audit
```

| Role | Scope |
|------|--------|
| `admin` | All tehsils; provision staff; metrics; audit; eCourt only (when order issued) |
| `tehsildar` | Own `tehsilId` — intake through order / eCourt |
| `ri` | Own `tehsilId` — **only cases assigned to them**, while RI work is active |

- Many tehsildars per tehsil allowed (soft warning when >1 via `WARN_MULTIPLE_TEHSILDAR`).
- Email is globally unique — a user cannot be both tehsildar and RI.
- Tehsil is a master collection; users carry `role` + optional `tehsilId` (null for admin).

---

## Case pipeline

```
SUBMITTED
  → MEMO_ISSUED          (tehsildar — assigns RI, pick or least-loaded)
  → HEARING_SCHEDULED    (assigned RI — requires hearingAt; notice / ishtehaar)
  → OBJECTIONS_WINDOW    (assigned RI — optional)
  → DEMARCATION_DONE     (assigned RI — field work complete)
  → ORDER_ISSUED         (tehsildar)
  → ECOURT_UPLOADED      (tehsildar or admin — terminal)
```

`NOTICE_ISSUED` exists in the enum for filters; the default UX jumps `MEMO_ISSUED` → `HEARING_SCHEDULED`.

### Business rules (intake)

- Fee = **₹50 × khasra count**.
- Optional map + challan file uploads (MinIO / S3-compatible).
- `guaranteeDueAt` = `filedAt + 30` days (Lok Seva).
- Soft per-stage budgets (`stageDueAt`) for display; overall overdue = past guarantee and not eCourt-closed.

### RI visibility

RIs only see cases where `assignedRiId` is themselves **and** stage is still RI-active:

`MEMO_ISSUED` · `NOTICE_ISSUED` · `HEARING_SCHEDULED` · `OBJECTIONS_WINDOW`

Once demarcation is done, the case leaves the RI queue — tehsildar owns order and eCourt.

---

## What’s built (by phase)

| Phase | Focus | Status |
|-------|--------|--------|
| P1 | Admin seed, tehsils, CSV/XLSX staff import, temp passwords, login | Built |
| P2 | Case create, tehsil lists, document uploads | Built |
| P3 | Stage workflow + RI assign (manual / least-loaded) | Built |
| P4 | SLA fields, eCourt flag, overdue filter | Built |
| P5 | Invite email gate, transition audit, HI/EN i18n, admin metrics charts | Built |

### Admin ops

- Seeded admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` (skip if admin exists).
- Separate imports for tehsildars vs RIs (`name,email,tehsil`).
- Temp password reveal, reset, and bulk credentials CSV (admin-only).
- Invite email implemented but gated by `INVITE_EMAIL_ENABLED` (default off).
- Paginated staff / cases / audit lists with debounced search.
- Metrics dashboard: KPIs, radial rates, stage bar, tehsil load + health radar.

---

## Repository layout

| Package | Path | Port | Role |
|---------|------|------|------|
| `projectzamin-frontend` | `app/` | 3000 | Next.js UI |
| `projectzamin-backend` | `api/` | 3001 | Express API + better-auth |

Supporting:

- `docker/` — Coolify-oriented Dockerfiles (`api.Dockerfile`, `app.Dockerfile`)
- `docker-compose.yml` (+ optional `docker-compose.vps.yml`) — Mongo, Redis, MinIO
- Root `.env` — API + compose; `app/.env.local` — Next public vars

Auth routes live under `/api/auth/*` on the API. Session cookies use the `zamin` prefix.

---

## Quick start

**Requirements:** Node ≥ 20, pnpm ≥ 10.11, Docker (for data services).

```bash
# 1. Install
pnpm install

# 2. Env
cp .env.example .env
cp app/.env.example app/.env.local

# 3. Data services (Mongo, Redis, MinIO)
pnpm db:up

# 4. Dev (two terminals, or use your process manager)
pnpm dev:api   # http://localhost:3001
pnpm dev:app   # http://localhost:3000
```

VPS-hardened data ports (bind localhost only):

```bash
pnpm db:up:vps
```

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:api` / `dev:app` | Start API or frontend |
| `pnpm build` | Build both packages |
| `pnpm check:api` | API typecheck + lint + tests |
| `pnpm db:up` / `db:down` | Start / stop compose data stack |
| `pnpm db:up:vps` | Compose with VPS overlay |
| `pnpm db:up:prod` / `db:down:prod` | Full prod stack (`docker-compose.prod.yml`) |

---

## Configuration (essentials)

Copy `.env.example` → `.env` and set at least:

| Area | Variables |
|------|-----------|
| App URL | `NEXT_PUBLIC_API_URL`, `CORS_ORIGINS` / cookie domain |
| Mongo | `MONGODB_URI` (+ init user/password for compose) |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |
| Object storage | `MINIO_*` or S3-compatible equivalents |
| Admin seed | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` |
| Ops toggles | `INVITE_EMAIL_ENABLED`, `WARN_MULTIPLE_TEHSILDAR` |

See `.env.example` and `api/.env.example` for the full list (timeouts, rate limits, mail, etc.).

---

## Deploy (VPS / Coolify — recommended)

Use **`docker-compose.prod.yml`**: one private Docker network (`zamin_internal`). App/API listen on loopback only; data stores are not on the public interface.

| Service | Host bind | Notes |
|---------|-----------|--------|
| Frontend | `127.0.0.1:7854` | Coolify/proxy → HTTPS |
| API | `127.0.0.1:7855` | Coolify/proxy → HTTPS |
| Mongo | `127.0.0.1:27027` | SSH tunnel for Compass |
| Redis | `127.0.0.1:6389` | SSH tunnel for Redis Insight |
| MinIO | `127.0.0.1:9100` / `9101` | SSH tunnel for API / console |
| Databasus | `127.0.0.1:4105` | Optional backup UI |

```bash
cp .env.production.example .env   # fill secrets + public URLs
pnpm db:up:prod                   # or: docker compose -f docker-compose.prod.yml up -d --build
```

On a host that already uses nginx (e.g. `*.rdmp.in`): copy configs from `deploy/nginx/`, then Certbot. Print the full command checklist with `bash deploy/vps-checklist.sh`.

Coolify alternative: Compose resource → `docker-compose.prod.yml`, env from `.env.production.example`, domains → container ports `3000` / `3001`.

Laptop DB access (Atlas-style — never open Mongo to the internet):

```bash
ssh -N \
  -L 27027:127.0.0.1:27027 \
  -L 6389:127.0.0.1:6389 \
  -L 9100:127.0.0.1:9100 \
  -L 9101:127.0.0.1:9101 \
  deploy@YOUR_VPS_IP
```

Then Compass → `mongodb://USER:PASS@127.0.0.1:27027/projectzamin?authSource=admin`.

### Manual image builds (optional)

```bash
docker build -f docker/api.Dockerfile -t projectzamin-api .

docker build -f docker/app.Dockerfile -t projectzamin-app \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com .
```

---

## API surface (high level)

Documented per module under `api/src/modules/**/**.api.md`. Common prefixes:

| Area | Base |
|------|------|
| Auth | `/api/auth/*` |
| Session / me | `/api/v1/me` |
| Cases | `/api/v1/cases` |
| Staff (admin) | `/api/v1/admin/staff` |
| Audit (admin) | `/api/v1/admin/audit` |
| Metrics (admin) | `/api/v1/admin/metrics` |
| Tehsils | `/api/v1/tehsils` |

List endpoints support pagination (`page`, `limit`, default **20**) and, where noted, search (`q`).

---

## Guiding principles

- **Wedge first:** staff tracker now; citizen portal later.
- **Tehsil tenancy:** cases belong to a tehsil, not “to a tehsildar user”.
- **Short path:** timestamps + stage graph — not a BPM engine.
- **Password export is an ops tool** — admin-only, never a public feature.
- **Hindi is default** — Devanagari is a first-class face in the type stack, not an afterthought.

---

## Nested git cleanup

If `app/.git` still exists (Create Next App leftover), remove it so only the repo root is a git root:

```bash
rm -rf app/.git
```

---

## License / status

Private collectorate tooling.
