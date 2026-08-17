# Cases API — Suchna Patra pipeline

Auth: Better Auth session cookie. Tehsil-scoped for tehsildar; admin sees all. RI/Patwari see cases **assigned to them** while in active field stages.

## Stages

```
SUBMITTED → MEMO_ISSUED → HEARING_SCHEDULED
  ├─ OBJECTION_CLOSED (terminal; reason required)
  └─ REPORT_SUBMITTED → ORDER_ISSUED (terminal)

Legacy drain only: DEMARCATION_WINDOW_OPEN → DEMARCATION_DONE → REPORT_SUBMITTED
```

`NOTICE_ISSUED` is legacy-only (drains → `HEARING_SCHEDULED`). Notice PDF is uploaded on `HEARING_SCHEDULED`; report due = **23:59 IST on the demarcation calendar day** (`reportDueAt`).

While at `HEARING_SCHEDULED`: upload report (`→ REPORT_SUBMITTED`) **or** reschedule via `POST /:id/reschedule`. Miss `reportDueAt` → `alertStatus: 'OVERDUE'`. Reschedule after overdue sets `superiorAlert` (visible to tehsildar/admin).

**OVERDUE alert:** stage in `{HEARING_SCHEDULED, DEMARCATION_WINDOW_OPEN, DEMARCATION_DONE}` and `now >= reportDueAt` → `alertStatus: 'OVERDUE'`. Filter: `?alert=OVERDUE`.

## Create (tehsildar)

`POST /api/v1/cases` JSON body — Suchna fields: applicant + guardian, khasras`[{khasraNumber,rakba}]`, neighbors`[{ownerName,address}]`, demarcationDate/time, patwariHalkaNumber, office defaults. No challan/map required. Fee = ₹50 × khasra count. `demarcationDate` must be after `filedAt`.

## List

`GET /api/v1/cases` — `stage`, `overdue`, `alert=OVERDUE`, `tehsilId` (admin), `q`, pagination. Rows include `assignedRiName`, `assignedPatwariName`, `alertStatus`.

## Transitions

`POST /api/v1/cases/:id/transitions` — JSON or multipart (`report` file for `REPORT_SUBMITTED`).

| toStage | Actor | Extra |
|---------|--------|--------|
| MEMO_ISSUED | tehsildar | `assignedStaffId` — one RI **or** Patwari |
| HEARING_SCHEDULED | RI/Patwari | neighbors, notice date, demarcation datetime, upload `notice` PDF; sets `reportDueAt` |
| OBJECTION_CLOSED | RI/Patwari | objectionReason |
| REPORT_SUBMITTED | RI/Patwari | report PDF (from `HEARING_SCHEDULED` or legacy DEMARCATION_*); overdue still allowed |
| ORDER_ISSUED | tehsildar | |

Also at `HEARING_SCHEDULED`: `POST /:id/reschedule` (`demarcationDate` + `demarcationTime` + `reason`) — resets `reportDueAt`; if already overdue, sets `superiorAlert`.

Staff pickers: `GET /api/v1/tehsils/me/ris`, `GET /api/v1/tehsils/me/patwaris`.

## Legacy

Old stages (`OBJECTIONS_WINDOW`, `ECOURT_UPLOADED`, string khasras) may exist in DB. Prefer one-shot remap: eCourt → ORDER_ISSUED; objections window → HEARING_SCHEDULED; string khasras → `{khasraNumber, rakba:0}` before save. New writes use the enum above only.
