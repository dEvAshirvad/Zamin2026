# Cases module

सर सीमांकन case intake + stage workflow through `ECOURT_UPLOADED` (Phase 4 SLA + eCourt).

Auth: Better Auth session cookie. Tehsil-scoped for tehsildar; admin sees all. RI sees only cases **assigned to them** while stage is in RI-active work (`MEMO_ISSUED` … `OBJECTIONS_WINDOW`). After `DEMARCATION_DONE`, the case leaves the RI list (tehsildar owns order/eCourt). Admin may only transition `ORDER_ISSUED` → `ECOURT_UPLOADED`.

## Stages

`SUBMITTED` → `MEMO_ISSUED` (tehsildar, assigns RI) → `HEARING_SCHEDULED` (assigned RI, requires `hearingAt`) → optional `OBJECTIONS_WINDOW` → `DEMARCATION_DONE` (RI) → `ORDER_ISSUED` (tehsildar) → `ECOURT_UPLOADED` (tehsildar or admin).

`NOTICE_ISSUED` exists in the enum for filters; UX uses one jump `MEMO_ISSUED` → `HEARING_SCHEDULED`.

## SLA fields (list + detail)

| Field | Meaning |
|-------|---------|
| `guaranteeDueAt` | `filedAt + 30d` (Lok Seva) |
| `slaStatus` | `closed` \| `overdue` \| `on_track` |
| `daysToGuarantee` | Days left (negative if overdue) |
| `stageDueAt` | Soft stage budget (display only) |
| `stageSlaStatus` | `none` \| `on_track` \| `overdue` |
| `ecourtReference` | Optional string when marked uploaded |

Overdue: `now > guaranteeDueAt` and stage ≠ `ECOURT_UPLOADED`. Closed eCourt → `slaStatus=closed`.

## Soft stage budgets (set on enter)

| Stage | `stageDueAt` |
|-------|--------------|
| `SUBMITTED` | `filedAt + 5d` |
| `MEMO_ISSUED` | `stageChangedAt + 15d` |
| `HEARING_SCHEDULED` | `hearingAt` or `+7d` |
| `OBJECTIONS_WINDOW` | `+7d` |
| `DEMARCATION_DONE` | `+2d` |
| `ORDER_ISSUED` / `ECOURT_UPLOADED` | `null` |

## API map

| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| POST | `/api/v1/cases` | tehsildar | Create case; optional map/challan files |
| GET | `/api/v1/cases` | admin, tehsildar, ri | List; `stage`, `overdue=true`, `tehsilId` (admin), `q`, `page`, `limit` (default 20). RI: assigned + active stages only |
| GET | `/api/v1/cases/:id` | admin, tehsildar, assigned RI (active) | Detail + download URLs + `allowedNext` |
| GET | `/api/v1/cases/:id/transitions` | staff with case access (same RI rules) | Transition audit timeline |
| POST | `/api/v1/cases/:id/transitions` | tehsildar, assigned RI, admin (eCourt only) | Advance stage (writes audit row) |
| PATCH | `/api/v1/cases/:id/documents` | tehsildar | Add/replace map and/or challan |
| GET | `/api/v1/tehsils/me/ris` | tehsildar, ri | RIs in caller tehsil (memo picker) |
| GET | `/api/v1/admin/audit/transitions` | admin | Paginated global transition log |
| GET | `/api/v1/admin/metrics/cases` | admin | Totals, by stage, by tehsil |

## POST `/api/v1/cases`

Multipart: `applicantName`, `village`, `khasras`, `challanReference` required; optional contact, filedAt, map, challan.

`feeAmount` = `50 * khasras.length`. `stage` = `SUBMITTED`. Sets `stageDueAt` (memo budget).

## GET `/api/v1/cases?overdue=true`

Returns cases with `guaranteeDueAt < now` and `stage != ECOURT_UPLOADED` (still tehsil-scoped for staff).

Optional `q` searches `caseNo`, `applicantName`, `village`, `challanReference` (case-insensitive). Pagination defaults: `page=1`, `limit=20` (max 100).

## POST `/api/v1/cases/:id/transitions`

```json
{
  "toStage": "ECOURT_UPLOADED",
  "assignedRiId": "optional-ri-user-id",
  "hearingAt": "2026-09-01T10:00:00.000Z",
  "ecourtReference": "optional-ref",
  "note": "optional"
}
```

- Memo: omit `assignedRiId` → auto least-loaded RI; 0 RIs → `NO_RI_IN_TEHSIL`.
- Notice (`HEARING_SCHEDULED`): `hearingAt` required.
- eCourt: sets `ecourtUploaded=true`, optional `ecourtReference`, clears `stageDueAt`.
- Admin may only post `toStage=ECOURT_UPLOADED`; other stages → `ACCESS_DENIED`.
- Wrong RI → `ACCESS_DENIED`. Illegal edge → `INVALID_TRANSITION`.

Response includes updated case + SLA fields + `allowedNext`.

## GET `/api/v1/cases/:id`

Includes hearing/stage/SLA fields, `ecourtReference`, `allowedNext` (admin gets eCourt only when `ORDER_ISSUED`), and `assignedRiName` (resolved display name for `assignedRiId`, or `null`).

## Frontend notes

1. Invalidate `['cases']` and `['cases', id]` after transitions (and transition history).
2. Tehsildar: memo, order, eCourt.
3. Assigned RI: notice, objections, demarcation.
4. Admin: eCourt only when order issued; metrics at `/admin/metrics`; audit at `/admin/audit`.
5. Lists: overdue badge + optional “Overdue only” filter.
6. Locale: HI/EN toggle (`localStorage` `pz-locale`, default `hi`).
