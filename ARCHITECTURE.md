# ProductSuite-FE — Architecture

Frontend SPA for **Platform Suite** (super-admin entitlement plane) and **PayFlow** (collections operations product).

**Root:** `ProductSuite-FE/`

---

## 1. Overview

One React SPA serves:

| Area | Who | Routes |
|------|-----|--------|
| Auth | Everyone | `/login`, `/activate`, `/reset-password` |
| Product launcher | Entitled users | `/products`, `/no-access` |
| Platform admin | `platform_super_admin` | `/platform/*` |
| PayFlow product | Users with PAYFLOW entitlement + membership | `/payflow/*` |
| InsightIQ | Placeholder | `/insightiq` |

Shared session via `AuthContext`. PayFlow RBAC via `PayFlowAccessContext` (scoped to PayFlow routes only).

---

## 2. Tech stack

| Layer | Choice |
|--------|--------|
| UI | **React 18** |
| Language | **TypeScript** (strict) |
| Bundler | **Vite 5** |
| Routing | **react-router-dom** v6 |
| Styling | **Tailwind CSS v4** + custom `@theme` tokens |
| UI library | **None** — custom primitives (`components/ui/`, `payflow-ui.tsx`) |
| HTTP | Native **`fetch`** (no axios) |
| State | React **Context** + local page state (no Redux / Zustand / React Query) |
| Fonts | **DM Sans** (body), **Space Grotesk** (display) |

---

## 3. Directory structure

```text
ProductSuite-FE/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
├── ARCHITECTURE.md              ← this file
├── public/assets/               # logos, login visuals
└── src/
    ├── main.tsx                 # entry
    ├── App.tsx                  # route table
    ├── index.css                # Tailwind + design tokens
    ├── vite-env.d.ts
    ├── api/                     # fetch wrappers by domain
    ├── context/                 # Auth + PayFlow access
    ├── hooks/
    ├── lib/                     # theme, routing helpers, cache, utils
    ├── types/
    ├── components/
    │   ├── auth/
    │   ├── layout/              # Platform chrome
    │   ├── ui/                  # shared primitives
    │   └── payflow/             # PayFlow-specific widgets
    └── pages/
        ├── platform/
        └── payflow/
```

There is **no** top-level `services/`, `store/`, or `layouts/` folder. Layouts live under `components/layout/` and `pages/payflow/PayFlowLayout.tsx`.

---

## 4. How the app boots

```text
index.html
  → early theme script (FOUC prevention)
  → /src/main.tsx
       → applyTheme() + watchSystemTheme()
       → import index.css
       → createRoot
            <StrictMode>
              <BrowserRouter>
                <AuthProvider>
                  <App />          ← Routes only
                </AuthProvider>
              </BrowserRouter>
            </StrictMode>
```

| File | Role |
|------|------|
| `index.html` | Mount `#root`, early dark-class, Google Fonts, title |
| `src/main.tsx` | Theme init, router, `AuthProvider`, render `App` |
| `src/App.tsx` | Entire route map (no global layout wrapper here) |
| `src/context/AuthContext.tsx` | On mount: if access token → `GET /auth/me`; else clear session |

`PayFlowAccessProvider` mounts **inside** `PayFlowLayout`, not at app root.

---

## 5. Logical architecture

```text
Browser
  └─ AuthProvider (session + products + next_step)
       └─ Routes (App.tsx)
            ├─ Auth pages (AuthShell)
            ├─ /products (launcher)
            ├─ /platform/* ── PlatformLayout (super admin gate)
            │                    Sidebar + TopBar + Outlet
            └─ /payflow/* ── RequireProductAccess(PAYFLOW)
                               └─ PayFlowAccessProvider
                                    └─ PayFlowShell (nav + Outlet)
                                         └─ Feature pages
                                              └─ api/auth | api/platform | api/payflow
                                                   └─ fetch → VITE_API_BASE_URL
                                                        (/api proxy → BE :8000 in dev)
```

---

## 6. Routing map

Defined entirely in `src/App.tsx`.

### Public / auth

| Path | Component | Notes |
|------|-----------|--------|
| `/login` | `LoginPage` | Sign-in + forgot-password modes |
| `/activate` | `ActivatePage` | `?token=` invite setup |
| `/reset-password` | `ResetPasswordPage` | `?token=` password reset |
| `/no-access` | `NoAccessPage` | Entitled to nothing |
| `/products` | `ProductLauncherPage` | Product picker |
| `/profile` | `AccountProfilePage` | Profile outside product shells |

### Platform admin (`PlatformLayout`)

| Path | Page |
|------|------|
| `/platform` | `OverviewPage` |
| `/platform/profile` | `ProfilePage` |
| `/platform/products` | `ProductsPage` |
| `/platform/products/:productId` | `ProductDetailPage` |
| `/platform/access` | `AccessPage` |
| `/platform/people` | `PeoplePage` |
| `/platform/email-logs` | `EmailLogsPage` |

### PayFlow (`PayFlowLayout`)

| Path | Page |
|------|------|
| `/payflow` | Dashboard |
| `/payflow/profile` | Profile |
| `/payflow/clients` | Clients list |
| `/payflow/clients/new` | Create client |
| `/payflow/clients/:clientId` | Client detail |
| `/payflow/clients/:clientId/portfolios/:portfolioId` | Portfolio detail |
| `/payflow/cases` | Cases / accounts list |
| `/payflow/cases/:accountId` | Case detail |
| `/payflow/review` | Review queue |
| `/payflow/review/:reviewId` | Review detail |
| `/payflow/rules` | Rules list |
| `/payflow/rules/new` | Create rule |
| `/payflow/rules/:ruleId` | Rule detail |
| `/payflow/workflows` | Workflows list |
| `/payflow/workflows/new` | Create workflow |
| `/payflow/workflows/:strategyId` | Workflow detail |
| `/payflow/comms` | Communications list |
| `/payflow/comms/:communicationId` | Comm detail |
| `/payflow/integrations` | Integrations list |
| `/payflow/integrations/:integrationId` | Integration detail |
| `/payflow/users` | Users & roles |
| `/payflow/users/:userId` | User detail |

### Other

| Path | Behavior |
|------|----------|
| `/insightiq` | Placeholder |
| `/` and `*` | `HomeRedirect` → login or path from `next_step` |

---

## 7. Auth flow

```text
Login (POST /auth/login)
  → setTokens(access, refresh) in localStorage
  → AuthContext sets user, products, next_step
  → resolvePostAuthDestination(next_step, products)
       platform_admin  → /platform
       no_access       → /no-access
       direct_entry    → POST /products/{code}/enter → /payflow (or /insightiq)
       else            → /products

Session restore
  → getAccessToken() ? GET /auth/me : clear

Token refresh
  → apiRequest on 401 → POST /auth/refresh → retry once

Logout
  → POST /auth/logout (+ X-Refresh-Token) → clearTokens

Activate
  → GET /auth/activation/{token} → POST /auth/activate

Reset
  → POST /auth/forgot-password
  → GET /auth/password-reset/{token}
  → POST /auth/reset-password
```

### Guards

| Guard | Where | Rule |
|--------|--------|------|
| Must be logged in | Layouts / pages | `!user` → `/login` |
| Super Admin | `PlatformLayout` | `user.role === "platform_super_admin"` |
| Product entitlement | `RequireProductAccess` | session `products` includes code |
| Email Logs menu | `PlatformLayout` | email matches `VITE_EMAIL_LOGS_ADMIN_EMAIL` |

### Token storage

| Key | Purpose |
|-----|---------|
| `ps_access_token` | Access JWT |
| `ps_refresh_token` | Refresh JWT |
| `ps_theme_mode` | Theme preference |

Sent as `Authorization: Bearer …`.

---

## 8. API layer

**Pattern:** thin domain modules over a shared `fetch` client.

| File | What it does |
|------|----------------|
| `src/api/client.ts` | `API_BASE` from `VITE_API_BASE_URL` (default `/api`); `apiRequest` / blob / multipart; JWT attach; 401 refresh; `ApiError` |
| `src/api/auth.ts` | Login, me, profile/avatar, password, activate/reset, logout |
| `src/api/platform.ts` | Overview, menus, products/orgs, entitlements, people, email logs, `enterProduct` |
| `src/api/payflow.ts` | All PayFlow domain endpoints |

**Dev proxy** (`vite.config.ts`): `/api` → `http://127.0.0.1:8000` (path rewrite strips `/api`).

**Caching:** `lib/dedupeAsync.ts` — in-flight dedupe + short TTL for GETs (helps StrictMode double-mount).

**Update convention:** PayFlow updates use **POST** `…/update` (and similar action POSTs), matching BE — not PATCH/PUT (except `PATCH /auth/me` for profile name).

---

## 9. File-by-file: contexts, lib, hooks, types

### `src/context/`

| File | What it does |
|------|----------------|
| `AuthContext.tsx` | Global session: `user`, `products`, `nextStep`, `login` / `logout` / `refreshMe` / `applyMe`, `isSuperAdmin` |
| `PayFlowAccessContext.tsx` | PayFlow role, client scope, dynamic menus; `useOptionalPayFlowAccess` for outside shell |

### `src/lib/`

| File | What it does |
|------|----------------|
| `theme.ts` | Light / dark / system theme persistence and DOM class |
| `productRouting.ts` | `next_step` → path; product shell homes; post-auth enter |
| `dedupeAsync.ts` | In-flight dedupe + TTL cache for GETs |
| `utils.ts` | `cn`, menu route normalize, status/org helpers |
| `ui.ts` | Shared Tailwind class recipes for platform screens |

### `src/hooks/`

| File | What it does |
|------|----------------|
| `useIsMobile.ts` | `true` below 768px; drives PayFlow drawer vs collapse |

### `src/types/`

| File | What it does |
|------|----------------|
| `index.ts` | Single barrel of auth/platform DTOs + PayFlow models |

---

## 10. File-by-file: components

### Layout (Platform)

| File | What it does |
|------|----------------|
| `components/layout/PlatformLayout.tsx` | Auth + Super Admin gate; loads menus (API + hardcoded fallback); `Sidebar` + `TopBar` + mobile nav + `<Outlet />` |
| `components/layout/Sidebar.tsx` | Desktop navy rail for platform menu sections |
| `components/layout/TopBar.tsx` | Sticky header + `ProductSwitcher` |

### Auth / shared

| File | What it does |
|------|----------------|
| `components/auth/AuthShell.tsx` | Split-screen chrome for login / activate / reset |
| `components/auth/AccessDenied.tsx` | Full-page deny with optional launcher link |
| `components/auth/RequireProductAccess.tsx` | Product entitlement guard from session products |
| `components/ProductSwitcher.tsx` | Switch platform ↔ products; enter product; logout |

### UI primitives

| File | What it does |
|------|----------------|
| `components/ui/Button.tsx` | Token-based button variants |
| `components/ui/Badge.tsx` | Status / label chips |
| `components/ui/Icon.tsx` | Named SVG icons for menus |
| `components/ui/Modal.tsx` | Modal dialog |
| `components/ui/PasswordInput.tsx` | Password field with show/hide |
| `components/ui/UserAvatar.tsx` | Avatar image / initials |
| `components/payflow-ui.tsx` | Shared PageHeader, Panel, KpiCard, tables, form controls |

### PayFlow widgets

| File | What it does |
|------|----------------|
| `components/payflow/PermissionPicker.tsx` | Grouped permission checkboxes for roles/users |
| `components/payflow/ClientAssignmentPicker.tsx` | Searchable multi-select of clients for supervisors |
| `components/payflow/client-config-sections.tsx` | Client settings: channels, AI mode, mappings, etc. |
| `components/payflow/client-detail-tabs.tsx` | Related tabs: accounts, reviews, rules, workflows, comms |
| `components/payflow/portfolio-section.tsx` | Portfolio list/create on client detail |
| `components/payflow/lovable/payflow-ui.tsx` | Extended UI kit used by client config |

---

## 11. File-by-file: pages

### Root auth / launcher

| File | What it does |
|------|----------------|
| `pages/LoginPage.tsx` | Sign-in and forgot-password; navigates via `resolvePostAuthDestination` |
| `pages/ActivatePage.tsx` | Invite token password setup with preview validation |
| `pages/ResetPasswordPage.tsx` | Email reset-token password form |
| `pages/ProductLauncherPage.tsx` | Lists entitled products; enter via API; exports `NoAccessPage` |
| `pages/AccountProfilePage.tsx` | Standalone profile shell outside PayFlow/platform chrome |
| `pages/ProfilePage.tsx` | Shared profile editor (name, avatar, password, theme) |

### Platform (`pages/platform/`)

| File | What it does |
|------|----------------|
| `OverviewPage.tsx` | KPI/summary of products and org entitlements |
| `ProductsPage.tsx` | Register / list products in the catalog |
| `ProductDetailPage.tsx` | Single product view / edit |
| `AccessPage.tsx` | Grant / revoke org ↔ product entitlements |
| `PeoplePage.tsx` | People CRUD, product assignment, resend invite |
| `EmailLogsPage.tsx` | Outbound email audit (restricted admin email) |

### PayFlow (`pages/payflow/`)

| File | What it does |
|------|----------------|
| `PayFlowLayout.tsx` | PayFlow shell: product gate, access provider, nav, notifications, outlet |
| `DashboardPage.tsx` | Ops dashboard: KPIs, funnel, attention, activity |
| `ClientsPage.tsx` | Client list with filters |
| `ClientNewPage.tsx` | Create client form / wizard |
| `ClientDetailPage.tsx` | Client config, logo, onboarding, related tabs |
| `PortfolioDetailPage.tsx` | Portfolio under a client |
| `CasesPage.tsx` | Account / case list |
| `CaseDetailPage.tsx` | Single account / case detail |
| `ReviewsPage.tsx` | Human-in-the-loop review queue |
| `ReviewDetailPage.tsx` | Approve / modify / reject / hold |
| `RulesPage.tsx` | Decision / automation rules list |
| `RuleNewPage.tsx` | Create rule |
| `RuleDetailPage.tsx` | Rule detail + activate / deactivate |
| `WorkflowsPage.tsx` | Strategies / workflows list |
| `WorkflowNewPage.tsx` | Create workflow |
| `WorkflowDetailPage.tsx` | Edit, draft, approve / reject |
| `CommsPage.tsx` | Communications list |
| `CommDetailPage.tsx` | Communication detail / timeline |
| `IntegrationsPage.tsx` | Integration connectors list |
| `IntegrationDetailPage.tsx` | Integration detail + test connection |
| `UsersPage.tsx` | PayFlow users **and** roles / permissions UI |
| `UserDetailPage.tsx` | User detail, role, clients, deactivate / reactivate |
| `ProfilePage.tsx` | Re-exports shared profile for PayFlow |
| `ProductSwitcher.tsx` | Re-export of shared switcher |
| `InsightIqPlaceholder.tsx` | Stub until InsightIQ screens exist |

---

## 12. Feature modules (what the UI covers)

### A. Platform Suite (Super Admin)

Entitlement plane only — **not** product RBAC.

- Overview — product / org counts
- Products — catalog CRUD
- Product Access — org entitlements grant / revoke
- People — invite / assign users to products
- Email Logs — restricted to configured admin email

### B. Product launcher

Cross-product entry after login when user has multiple products (or no single direct entry).

### C. PayFlow

| Area | Capability |
|------|------------|
| Dashboard | KPIs, attention, funnel, activity |
| Clients | CRUD, logo, bulk upload, portfolios, mappings, channels, AI mode |
| Cases | Account list / detail |
| Human Review | Queue + approve / modify / reject / hold |
| Rules | Create / list / activate decision rules |
| Workflows | Strategy create / edit / approve lifecycle |
| Comms | Communication listing / detail |
| Integrations | Connectors + connectivity test |
| Users & Roles | Users, custom roles, permission groups, client assignment |

### D. InsightIQ

Placeholder route only (`/insightiq`).

---

## 13. State management

1. **Global auth session** — `AuthProvider` (Context)
2. **PayFlow access / menus** — `PayFlowAccessProvider` (scoped to PayFlow routes)
3. **Server cache** — module-level Maps in `dedupeAsync` (not a global store)
4. **Page state** — each page uses `useEffect` + `useState`; mutations call API then refresh / invalidate cache
5. **No** Redux, Zustand, Jotai, or React Query

UI prefs: theme in `localStorage`; tokens in `localStorage`.

---

## 14. Styling

- **Tailwind v4** with `@import "tailwindcss"` and `@theme { … }` CSS variables
- **Dark mode** via `html.dark` + `@custom-variant dark`
- **Typography:** `font-sans` = DM Sans; `font-display` = Space Grotesk
- **Design system:** hand-rolled — `lib/ui.ts` + `components/payflow-ui.tsx` + Lovable port kit
- **No** CSS Modules / styled-components / Emotion
- Brand assets under `public/assets/`

---

## 15. Environment / config

| Source | Keys / behavior |
|--------|------------------|
| `.env.example` | `VITE_API_BASE_URL=/api`; `VITE_EMAIL_LOGS_ADMIN_EMAIL=…` |
| `src/vite-env.d.ts` | Types for those env vars |
| `vite.config.ts` | Port **5173**, `/api` proxy → FastAPI `:8000` |
| `tsconfig.json` | Strict TS, JSX `react-jsx` |

Runtime: `import.meta.env.VITE_*` only (Vite convention).

---

## 16. Architectural decisions (summary)

1. **Multi-product suite FE** — platform entitlement admin and PayFlow share one SPA.
2. **Guards are compositional** — layout + `RequireProductAccess`, not a central route-config ACL.
3. **Menus are largely server-driven** for PayFlow; platform has API menus with hardcoded fallback.
4. **Updates prefer POST action URLs** on PayFlow (aligned with BE).
5. **Minimal dependencies** — React + Router + Tailwind only.
6. **API modules are pure functions** — no hooks inside `api/`; pages own fetch lifecycle.
