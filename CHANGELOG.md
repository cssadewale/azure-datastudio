# Changelog

All notable changes to this project are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: [SemVer](https://semver.org/).

## [Enterprise 1.0.0] — 2026-05-26

### Added — Enterprise layer (built on top of base v7)
- 🏢 **Enterprise Hub** modal with tabbed UI (Overview, Audit, Roles, Policies, Jobs, Webhook, Backup, Telemetry, About)
- 🔐 **Roles & access control:** Admin / Analyst / Viewer
  - Viewer role enforces a read-only UI overlay
  - All mutating SQL blocked for viewers at the interceptor level
- 🛡 **Passphrase gate** with SHA-256 + 16-byte salt, sessionStorage cache
- 📋 **Audit log** — capped at 2 000 entries, JSON/CSV export
- ⚙ **Governance policies:** Block DROP for non-admins, Block ATTACH, Block DELETE without WHERE, Warn on full scans, Max rows per query
- 🔄 **Scheduled jobs** — `setInterval`-based ticker, runs while tab is open
- 📤 **Webhook integration** — POST results/events to any URL (free receivers supported)
- 🔒 **Encrypted backup** using AES-GCM 256 + PBKDF2-SHA-256 (120 000 iterations)
- 📦 **Plain JSON backup** for quick migration
- 📊 **Local telemetry dashboard** — query count, avg latency, error rate
- 🚦 **SQL execution interceptor** — wraps `db.exec` and `db.run` for policy + audit + telemetry
- 🧾 **Query version control (VCS)** — snapshot + line-diff helpers
- 🌐 **PWA support** — `manifest.webmanifest` + `service-worker.js` (cache-first shell, stale-while-revalidate CDNs)
- 🔔 **Toast notification system** (info / ok / warn / err)
- 🌍 **i18n scaffolding** — `locales/en.json`, `locales/yo.json`
- 🐳 **Dockerfile** (nginx-alpine, ~25 MB) + `docker-compose.yml`
- ⚙ **Hardened nginx config** with CSP and gzip
- 🚀 **Vercel** (`vercel.json`) and **Netlify** (`netlify.toml`) configs with security headers
- 🧪 **GitHub Actions:**
  - `ci.yml` — HTML validation, markdown link check, eval/AI-API security scan
  - `pages.yml` — auto-deploy to GitHub Pages on push to main
- 📝 **Repo hygiene:** Issue templates, PR template, CODEOWNERS, Dependabot config
- 📖 **Documentation:** `docs/ENTERPRISE_FEATURES.md`, `docs/DEPLOYMENT.md`, enhanced `README.md`, `SECURITY.md`, `CONTRIBUTING.md`
- 🆕 `CODE_OF_CONDUCT.md`, this `CHANGELOG.md`, `.editorconfig`, `.gitignore`

### Changed
- `index.html` — added **only** four extra tags near `</body>` (CSS, JS, manifest link, SW registration). No base-app code modified.

### Removed
- Nothing. Every base-app feature continues to work identically.

### Security
- All new code respects the project's no-server, no-AI-API, no-`eval()` constraints (enforced in CI).
- Encryption uses Web Crypto only — no third-party libs.

---

## [v7] — Azure DataStudio Stimulator base (pre-Enterprise)

See base app README for v7 feature set (SQL editor, 8 result views, 12 export formats, pivot, charts, ER diagram, etc.).

## [v6 / SQLab Pro] — earlier release
## [v5 and below] — historical
