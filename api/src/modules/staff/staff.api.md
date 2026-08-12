# Staff module

Admin-only staff provisioning for tehsildars and RIs. Public signup is disabled; users are created via seed or CSV/XLSX import.

Auth: Better Auth session cookie (`zamin.session_token`). Role must be `admin`.

## API map

| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| POST | `/api/v1/admin/staff/import/tehsildars` | admin | Import tehsildars (`name,email,tehsil`) |
| POST | `/api/v1/admin/staff/import/ris` | admin | Import RIs (`name,email,tehsil`) |
| GET | `/api/v1/admin/staff` | admin | List staff (`role`, `tehsilId`, `q`, `page`, `limit`) |
| GET | `/api/v1/admin/staff/credentials.csv` | admin | Download all temp passwords |
| GET | `/api/v1/admin/staff/:userId/password` | admin | Reveal one temp password |
| POST | `/api/v1/admin/staff/:userId/reset-password` | admin | Reset + return new temp password |

Related: `GET /api/v1/me`, `GET /api/v1/tehsils`.

## POST `/api/v1/admin/staff/import/tehsildars`

Multipart field `file` (`.csv` or `.xlsx`). Columns: `name`, `email`, `tehsil`.

Duplicate emails are skipped. Tehsil is resolved or created. Multi-tehsildar tehsils emit warnings when `WARN_MULTIPLE_TEHSILDAR=true`.

```json
{
  "success": true,
  "data": {
    "batchId": "uuid",
    "role": "tehsildar",
    "created": 2,
    "skipped": 1,
    "rows": [
      { "line": 2, "email": "a@x.gov.in", "status": "created", "userId": "...", "tehsilId": "..." },
      { "line": 3, "email": "b@x.gov.in", "status": "skipped", "reason": "email already registered" }
    ],
    "warnings": ["Tehsil \"Seoni\" now has 2 tehsildars (suggested: one)"]
  }
}
```

## POST `/api/v1/admin/staff/import/ris`

Same as tehsildars; `role` in result is `ri`.

## GET `/api/v1/admin/staff`

Query: `role`, `tehsilId`, `q` (name/email search), `page`, `limit` (default 20).

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Ram Kumar",
      "email": "ram@example.gov.in",
      "role": "tehsildar",
      "tehsilId": "...",
      "emailVerified": true,
      "createdAt": "2026-08-11T00:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## GET `/api/v1/admin/staff/credentials.csv`

Returns `text/csv` with columns: `email,name,role,tehsilId,password,userId,importBatchId`.

## GET `/api/v1/admin/staff/:userId/password`

```json
{
  "success": true,
  "data": {
    "userId": "...",
    "email": "ram@example.gov.in",
    "name": "Ram Kumar",
    "role": "tehsildar",
    "password": "temp..."
  }
}
```

Error `CREDENTIAL_NOT_FOUND` (404) if no stored temp password.

## POST `/api/v1/admin/staff/:userId/reset-password`

Generates a new temp password, updates Better Auth credential hash + `staff_credentials` row. When `INVITE_EMAIL_ENABLED=true`, sends invite email.

## Invite email

Gate: `INVITE_EMAIL_ENABLED` (default `false` in `.env.example`). Import create and password reset both call `maybeSendInvite` when enabled. Requires a working `EMAIL_PROVIDER` (nodemailer/resend). `GET /api/v1/me` returns `inviteEmailEnabled` so Admin UI can show On/Off. Password CSV download still works either way.

## Frontend notes

1. Login via Better Auth `/api/auth/sign-in/email`.
2. Call `GET /api/v1/me` for role routing (includes `inviteEmailEnabled`).
3. Upload imports with `credentials: 'include'`.
4. Download credentials with cookie session (browser navigation or blob fetch).
5. Do not cache password reveal responses.
