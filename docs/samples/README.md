# ProductSuite-FE — samples notes, recent changes & how to start

Account **Excel templates** live in the backend (`ProductSuite-BE/docs/samples/`). This FE folder documents how the UI uses those samples, recent PayFlow UI changes, and how to run the SPA.

---

## How to start the application

Run **ProductSuite-BE** first (API on `:8000`), then this frontend.

### Prerequisites

- Node.js **18+** (npm)
- Backend running with CORS / Vite proxy available
- Copy `.env.example` → `.env` if needed (`VITE_API_BASE_URL=/api` is the default)

### Frontend (this repo)

From `ProductSuite-FE/`:

```bat
npm install
npm run dev
```

| Item | Value |
|------|--------|
| UI | http://localhost:5173 |
| Dev API base | `/api` (Vite proxy → `http://127.0.0.1:8000`) |

### Backend (sibling repo)

From `ProductSuite-BE/` (see that repo’s `docs/samples/README.md`):

```bat
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

| Item | Value |
|------|--------|
| API | http://127.0.0.1:8000 |
| Swagger | http://127.0.0.1:8000/docs |

Default admin comes from BE seeder / `.env` (`SEED_SUPER_ADMIN_*`).

---

## Samples & import UX

| Sample / action | Where |
|-----------------|--------|
| Daily accounts Excel | BE `docs/samples/payflow_daily_accounts_sample.xlsx` (also **Download sample template** on account import) |
| Client hierarchy CSV/XLSX | Upload via **Clients → Import** (`/payflow/clients/import`) |
| Import history | `/payflow/imports` and `/payflow/imports/:importId` |
| Account import | `/payflow/cases/import` |

Shared import UI: `src/components/payflow/import-flow.tsx` + `src/lib/import-data.ts`.

Seed client / portfolio codes for the account sample: see **BE** `docs/samples/README.md`.

---

## Recent product changes (this FE workstream)

### Clients

- Create/detail: **file data source** (CRM toggle disabled for new onboarding).
- Profile address: searchable cascading **Country → Province → City** (+ language / currency from country meta).
- Per-client **Data Mapping** section removed; mapping is global **System Mapping**.
- Client import page + hierarchy support (master / sub-client).

### System Mapping

- Nav: **System Mapping** (`/payflow/system-mapping`; legacy `/payflow/integrations` still opens the same catalog page).
- Shows global CRM inbound/outbound catalog from `GET /payflow/clients/mapping-catalog`.
- `loan_identifier` appears as a normal inbound payload id (required / available), not a placement blocker.

### Geo dropdowns

- `src/lib/geo-api.ts` → `/payflow/geo/countries|states|cities` (BE proxy / bundled countries).
- `SearchableSelect` portals the menu to `document.body` so lists are not clipped by panel `overflow`.

### Other UI

- Favicon via `public/` + `index.html` (no `/favicon.ico` 404).
- Soft-delete confirmations / deletion logs pages where wired.
- Import run list + detail pages.

---

## Related docs

| Doc | Location |
|-----|----------|
| Architecture | `../../ARCHITECTURE.md` |
| Root README | `../../README.md` |
| BE samples + start | `ProductSuite-BE/docs/samples/README.md` |
