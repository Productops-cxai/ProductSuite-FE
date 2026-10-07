# ProductSuite-FE

React (Vite + TypeScript) frontend for **Platform Super Admin** and **PayFlow** — talks to ProductSuite-BE.

## How to start

1. Start the API (`ProductSuite-BE`) on http://127.0.0.1:8000 — see that repo’s `docs/samples/README.md`.
2. Copy `.env.example` → `.env` if needed (`VITE_API_BASE_URL=/api`).
3. From this folder:

```bat
npm install
npm run dev
```

| | |
|--|--|
| UI | http://localhost:5173 |
| Proxy | `/api` → FastAPI `:8000` |

Default admin is whatever the BE seeder / `.env` defines (`SEED_SUPER_ADMIN_*`).

More detail (samples, recent changes): [`docs/samples/README.md`](docs/samples/README.md). Architecture: [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Routes (high level)

| Path | Page |
|------|------|
| `/login` | Sign in |
| `/activate` | Set password from invite link |
| `/reset-password` | Reset password from email link |
| `/platform` | Platform Overview |
| `/platform/products` | Products |
| `/platform/access` | Product Access |
| `/platform/people` | People & Product Assignment |
| `/platform/email-logs` | Email logs (suite admin only) |
| `/platform/deletion-logs` | Platform deletion audit |
| `/products` | Product launcher |
| `/payflow` | PayFlow dashboard |
| `/payflow/clients` | Clients (+ `/new`, `/import`, `/:id`) |
| `/payflow/cases` | Cases / accounts (+ `/import`) |
| `/payflow/imports` | Import run history |
| `/payflow/system-mapping` | Global CRM → PayFlow field catalog |
| `/payflow/users` | Users & roles |
| `/insightiq` | InsightIQ placeholder |

## Notes

- BE menu routes `/platform/overview` and `/platform/product-access` are normalized in the sidebar to `/platform` and `/platform/access`.
- Dev uses Vite `/api` proxy; optional direct BE: `VITE_API_BASE_URL=http://127.0.0.1:8000`.
- PayFlow updates use **POST** `…/update` (aligned with BE), not PATCH/PUT.
