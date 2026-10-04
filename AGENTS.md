# Hiker ERP (Shoes Factory) — Base44 dev environment

## Stack
- **backend/** — Node + Express + better-sqlite3 (SQLite, WAL). REST API on port 4000, `node --watch` for live reload. Schema + demo seed in `backend/db.js` (seed only runs on an empty database; the SQLite file lives in the `api_data` compose volume).
- **frontend/** — React 18 + Vite dev server on port 5173 (mapped to host port 3000), proxies `/api` to the API service via `VITE_PROXY_TARGET`.
- Single origin: the browser talks only to port 3000; Vite forwards `/api/*` internally. No CORS needed.

## Running
`docker compose -f docker-compose.base44.yml up -d`
- `api` — node:22-slim, installs deps on start, healthchecks `/api/health`.
- `web` — node:22-alpine, installs deps on start, healthchecks the Vite dev server.
- Sandbox repo root can be mode 700 — if containers can't read mounted files, run `chmod o+rx .`.

## Modules
Overview: Dashboard (KPIs, sales chart, stock alerts). Stock: Raw Stock (categories with custom fields), Ready Shoes (balance + movements), Articles. Production: Production, Purchase. Sales: Invoices + New Invoice (live teal preview), Sales, Customers. Accounts: Suppliers, Payments, Roznamcha, Kharcha. System: Reports (CSV/print), Settings, Recycle Bin (restore/purge).

## Auth
Email/password login (scrypt hashes, Bearer token sessions). Seeded account: `admin@hiker.pk` / `admin123`. Google OAuth button exists but needs credentials — not configured.

## Stock automations (backend/lib/stock-ops.js — all atomic)
- Production deducts uppers from Raw Stock (newest first) and adds pairs to Ready Shoes; refuses if short.
- Purchase adds into Raw Stock and raises supplier payable.
- Invoice converts cartons→pairs, checks Ready Shoes stock (refuses if short), deducts it, and any received amount auto-creates a Payment + Roznamcha customer_receipt entry.
- Payments auto-post to Roznamcha and party ledger; Kharcha posts as source kharcha.
- Every table uses soft delete (`is_deleted`, `deleted_date`); Recycle Bin restores or purges.

## Desktop/Android builds (.exe / .apk)
- `desktop/` — Electron wrapper; loads `APP_URL` (env var or `app-url.txt` baked at build time).
- `.github/workflows/build-exe.yml` — Windows runner, electron-builder NSIS installer, uploads `.exe` artifact. Trigger: `workflow_dispatch` or push to an `exe` branch.
- `.github/workflows/build-apk.yml` — Ubuntu runner, Capacitor WebView wrapper, Gradle debug APK artifact. Trigger: `workflow_dispatch` or push to an `apk` branch.
- Both need the `APP_URL` GitHub repository variable pointing at the deployed web app (the workflows were not exercised in CI from this sandbox).

## Verification
- `curl http://localhost:3000/api/health` → `{"ok":true}`
- `curl http://localhost:3000/api/dashboard` → stats JSON
- Preview at port 3000 shows the Hiker ERP dashboard.
