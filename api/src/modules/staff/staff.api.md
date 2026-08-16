# Staff module

Admin-only staff provisioning for tehsildars, RIs, and patwaris. Public signup is disabled; users are created via seed, single create, or CSV/XLSX import.

Auth: Better Auth session cookie (`zamin.session_token`). Role must be `admin`.

## API map

| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| POST | `/api/v1/admin/staff` | admin | Create one staff (`name`, `email`, `role`, `tehsil`) |
| DELETE | `/api/v1/admin/staff` | admin | Delete staff by ids (`{ userIds: string[] }`; never admins) |
| POST | `/api/v1/admin/staff/import/tehsildars` | admin | Import tehsildars (`name,email,tehsil`) |
| POST | `/api/v1/admin/staff/import/ris` | admin | Import RIs (`name,email,tehsil`) |
| POST | `/api/v1/admin/staff/import/patwaris` | admin | Import patwaris (`name,email,tehsil`) |
| GET | `/api/v1/admin/staff/import-template.csv` | admin | CSV import template |
| GET | `/api/v1/admin/staff/import-template.xlsx` | admin | Excel import template |
| GET | `/api/v1/admin/staff` | admin | List staff (`role`, `tehsilId`, `q`, `page`, `limit`) |
| GET | `/api/v1/admin/staff/credentials.csv` | admin | Download all temp passwords |
| GET | `/api/v1/admin/staff/:userId/password` | admin | Reveal one temp password |
| POST | `/api/v1/admin/staff/:userId/reset-password` | admin | Reset + return new temp password |

Related: `GET /api/v1/me`, `GET /api/v1/tehsils`.

## POST `/api/v1/admin/staff`

Body: `{ "name", "email", "role": "tehsildar"|"ri"|"patwari", "tehsil" }`.

Tehsil is resolved or created by name. Returns created user + temporary `password`.

## DELETE `/api/v1/admin/staff`

Body: `{ "userIds": ["..."] }`.

Skips admins and unknown ids. Also removes Better Auth `account`/`session` rows and `staff_credentials`.

```json
{
  "success": true,
  "data": {
    "deleted": 2,
    "deletedIds": ["..."],
    "skipped": [{ "userId": "...", "reason": "cannot delete admin" }]
  }
}
```

## POST `/api/v1/admin/staff/import/tehsildars`

Multipart field `file` (`.csv` or `.xlsx`). Columns: `name`, `email`, `tehsil`.

Duplicate emails are skipped. Tehsil is resolved or created. Multi-tehsildar tehsils emit warnings when `WARN_MULTIPLE_TEHSILDAR=true`.

## GET `/api/v1/admin/staff/import-template.csv` / `.xlsx`

Downloadable blank template with header + example row (`name`, `email`, `tehsil`).

## Invite email

Gate: `INVITE_EMAIL_ENABLED` (default `false` in `.env.example`). Create, import, and password reset call `maybeSendInvite` when enabled.

## Clear cases script

From `api/`:

```bash
pnpm clear-cases -- --yes
```

Deletes `cases`, `case_transition_logs`, and `case_counters` only.
