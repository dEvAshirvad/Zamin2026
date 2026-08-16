# Cases API — Suchna Patra pipeline

Auth: Better Auth session cookie. Tehsil-scoped for tehsildar; admin sees all. RI/Patwari see cases **assigned to them** while in active field stages.

## Stages

```
SUBMITTED → MEMO_ISSUED → HEARING_SCHEDULED
  ├─ OBJECTION_CLOSED (terminal; reason required)
  └─ DEMARCATION_WINDOW_OPEN → DEMARCATION_DONE → REPORT_SUBMITTED → ORDER_ISSUED (terminal)
```

`NOTICE_ISSUED` is legacy-only (drains → `HEARING_SCHEDULED`). Notice PDF is generated on `HEARING_SCHEDULED`; `hearingAt` is auto-set from intake `demarcationDate` + `demarcationTime`.

Reschedule from `HEARING_SCHEDULED` via `POST /:id/reschedule` with `demarcationDate` + `demarcationTime` + `reason`; regenerates a **पुनर्निर्धारण** notice PDF (previous vs new schedule + reason).

**OVERDUE alert:** `stage === DEMARCATION_DONE` and `now > reportDueAt` → `alertStatus: 'OVERDUE'`. Filter: `?alert=OVERDUE`.

## Create (tehsildar)

`POST /api/v1/cases` JSON body — Suchna fields: applicant + guardian, khasras`[{khasraNumber,rakba}]`, neighbors`[{ownerName,address}]`, demarcationDate/time, patwariHalkaNumber, office defaults. No challan/map required. Fee = ₹50 × khasra count. `demarcationDate` must be after `filedAt`.

## List

`GET /api/v1/cases` — `stage`, `overdue`, `alert=OVERDUE`, `tehsilId` (admin), `q`, pagination. Rows include `assignedRiName`, `assignedPatwariName`, `alertStatus`.

## Transitions

`POST /api/v1/cases/:id/transitions` — JSON or multipart (`report` file for `REPORT_SUBMITTED`).

| toStage | Actor | Extra |
|---------|--------|--------|
| MEMO_ISSUED | tehsildar | `assignedRiId` + `assignedPatwariId` required |
| HEARING_SCHEDULED | RI/Patwari | auto hearingAt from demarcation; generates notice PDF |
| OBJECTION_CLOSED | RI/Patwari | objectionReason |
| DEMARCATION_WINDOW_OPEN | RI/Patwari | only on demarcationDate |
| DEMARCATION_DONE | RI/Patwari | sets reportDueAt = now+12h |
| REPORT_SUBMITTED | RI/Patwari | report PDF file |
| ORDER_ISSUED | tehsildar | |

Also: `POST /:id/reschedule`, `POST /:id/notice-pdf`.

Staff pickers: `GET /api/v1/tehsils/me/ris`, `GET /api/v1/tehsils/me/patwaris`.

## Legacy

Old stages (`OBJECTIONS_WINDOW`, `ECOURT_UPLOADED`, string khasras) may exist in DB. Prefer one-shot remap: eCourt → ORDER_ISSUED; objections window → HEARING_SCHEDULED; string khasras → `{khasraNumber, rakba:0}` before save. New writes use the enum above only.
