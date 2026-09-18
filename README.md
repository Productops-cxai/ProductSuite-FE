# ProductSuite-FE

React (Vite + TypeScript) frontend for **Platform Super Admin** — connected to ProductSuite-BE.

## Routes

| Path | Page |
|------|------|
| `/login` | Sign in |
| `/activate` | Set password from invite link |
| `/reset-password` | Reset password from email link |
| `/platform` | Overview |
| `/platform/products` | Products |
| `/platform/access` | Product Access |
| `/platform/people` | People & Product Assignment |
| `/platform/email-logs` | Email logs (SMTP stub — copy action links) |
| `/products` | Non-admin product launcher |

## Setup

1. Copy `.env.example` to `.env` (already points at `http://127.0.0.1:8000`).
2. Start the API (ProductSuite-BE).
3. Install and run the FE (ask if you want the exact commands pasted).

Default admin (from BE seeder): `admin@suitencri.com` / `@123@123`

## Notes

- BE menu routes `/platform/overview` and `/platform/product-access` are normalized in the sidebar to `/platform` and `/platform/access`.
- CORS is open on the API; FE calls the API base URL from `VITE_API_BASE_URL`.
