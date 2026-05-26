# Azure DataStudio Stimulator — Enterprise Edition

<div align="center">

![Version](https://img.shields.io/badge/App-v7%20Enterprise%201.0.0-0078d4?style=for-the-badge)
![SQLite](https://img.shields.io/badge/Engine-SQLite%201.10-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![No Server](https://img.shields.io/badge/Server-None%20Required-00ffb3?style=for-the-badge)
![Offline](https://img.shields.io/badge/PWA-100%25%20Offline-7c5cfc?style=for-the-badge)
![Free](https://img.shields.io/badge/Cost-Free%20Forever-ffd23f?style=for-the-badge)
![No AI](https://img.shields.io/badge/No%20AI%20APIs-By%20Design-ff6b35?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-ff3366?style=for-the-badge)

**A professional SQL workbench with enterprise governance — that still runs entirely in your browser.**
No installation. No server. No cost. Works fully offline (installable PWA) on any device.

</div>

---

## 🆕 What's new in the Enterprise Edition

The Enterprise Edition **adds** the following capabilities on top of every existing feature of Azure DataStudio Stimulator v7. **Nothing was removed.** The base app's 28 features (SQL editor, 8 result views, 12 export formats, pivot tables, charts, ER diagram, etc.) all still work exactly as before.

| # | Feature | One-liner |
|---|---|---|
| 1 | 🏢 **Enterprise Hub** | Single command-centre modal grouping all governance features |
| 2 | 🔐 **Roles & access control** | Admin / Analyst / Viewer roles with UI lock for read-only users |
| 3 | 🛡 **Passphrase gate** | SHA-256-hashed splash screen for shared deployments |
| 4 | 📋 **Audit log** | Every SQL execution, login, policy block — timestamped, exportable (JSON/CSV) |
| 5 | ⚙ **Governance policies** | Block DROP, ATTACH, DELETE-without-WHERE, row caps, configurable per workspace |
| 6 | 🔄 **Scheduled jobs** | Auto-run any SQL at fixed intervals while the tab is open |
| 7 | 📤 **Webhook integration** | Push results to free webhook receivers (webhook.site, Zapier free, Make free, n8n) |
| 8 | 🔒 **AES-GCM 256 encrypted backup** | Share whole workspaces (queries, settings, jobs) as a single encrypted file |
| 9 | 📊 **Local telemetry dashboard** | Queries/avg latency/error rate — all stored locally, never transmitted |
| 10 | 🌐 **PWA + service worker** | Installable, true offline, app icon on home screen |
| 11 | 🔔 **Toast notifications** | Non-blocking status messages for every action |
| 12 | 🌍 **i18n scaffolding** | Locale files for English + Yorùbá; easy to add more |
| 13 | 🚦 **SQL execution interceptor** | Wraps every query with policy + telemetry + audit transparently |
| 14 | 🧾 **Query version control** | Snapshot saved queries; small line-level diff viewer |
| 15 | 📦 **Free deployment configs** | GitHub Actions CI + Pages, Vercel, Netlify, Docker — all preconfigured |
| 16 | 🔐 **Security headers** | CSP, X-Frame-Options, etc. baked into nginx / vercel.json / netlify.toml |
| 17 | 🧪 **CI security scan** | GitHub Action blocks accidental `eval()` or AI API endpoints in PRs |
| 18 | 🧑‍💼 **Issue / PR / CODEOWNERS templates** | Professional repo hygiene out of the box |

A full, deep explanation of each item lives in **[docs/ENTERPRISE_FEATURES.md](docs/ENTERPRISE_FEATURES.md)**.

---

## 📦 What's inside this folder

```
enterprise/
├── index.html                  ← Original app + 1 extra <script> + <link> tag (nothing removed)
├── assets/
│   ├── enterprise.css          ← Styling for the Enterprise UI layer
│   ├── icon-192.svg            ← PWA icon (small)
│   └── icon-512.svg            ← PWA icon (large)
├── scripts/
│   └── enterprise.js           ← The whole Enterprise Layer (audit, roles, policies, jobs…)
├── locales/
│   ├── en.json                 ← English strings
│   └── yo.json                 ← Yorùbá strings
├── deploy/
│   └── nginx.conf              ← Hardened nginx config (used by Dockerfile)
├── docs/
│   ├── ENTERPRISE_FEATURES.md  ← Deep dive on every new feature
│   └── DEPLOYMENT.md           ← Step-by-step for each free deployment path
├── .github/
│   ├── workflows/ci.yml        ← Lint + link check + security scan
│   ├── workflows/pages.yml     ← Auto-deploy to GitHub Pages on push to main
│   ├── ISSUE_TEMPLATE/         ← Bug / Feature templates
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   └── dependabot.yml
├── manifest.webmanifest        ← PWA manifest (installable)
├── service-worker.js           ← Offline cache (cache-first for shell, SWR for CDNs)
├── Dockerfile                  ← nginx-alpine, ~25MB image
├── docker-compose.yml          ← One-command self-host
├── vercel.json                 ← Vercel free tier config with security headers
├── netlify.toml                ← Netlify free tier config with security headers
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md             ← Enhanced contributing guide
├── SECURITY.md                 ← Enhanced security policy
├── LICENSE                     ← MIT
├── .gitignore
└── .editorconfig
```

---

## 🚀 Quick start

### Try locally in 10 seconds

```bash
cd enterprise
python3 -m http.server 8080
# or:  npx serve .   (Node)
# or:  php -S localhost:8080
```
Open <http://localhost:8080>. Click **🏢 Enterprise** in the header to explore the Hub.

> **Why a tiny server and not double-click?** The service worker and manifest only register over `http://`/`https://`, not `file://`. The base app still works double-clicked, but you won't get the PWA / offline-install behaviour.

---

## ⌨ Original feature list (still 100% intact)

> The base SQLab/Azure DataStudio Stimulator v7 features below all continue to work. The Enterprise layer **only adds** capabilities.

- Full SQLite 1.10.2 via WebAssembly
- Multi-tab SQL editor with autocomplete, format, find/replace, bookmarks
- 8 result views: Table, Chart, Pivot, Profile, JSON, Plan, Dashboard, Stats
- Import: CSV / TSV / JSON / NDJSON / SQL / URL / paste / synthetic generator
- Export: 12+ formats (CSV, JSON, Excel, Markdown, SQL INSERT, HTML, XML, LaTeX, .sqlite, dump, schema…)
- Analysis: Search All Tables, Macros (record/replay), Pagination, Templates (14), Regex Tester, Heatmap, Split View, Table Diff, ER Diagram, Visual Query Builder, Column Freeze, Schema History
- Workspace: Projects with tags/colour/pin, 35+ snippets, query variables `{{var}}`, line bookmarks, dark/light theme, configurable font/tab/auto-save

See [docs/ENTERPRISE_FEATURES.md](docs/ENTERPRISE_FEATURES.md) for the new capabilities and the original [README of base app](#) for the full base feature reference.

---

## 🌐 Deployment

Five free deployment paths, each with a complete step-by-step walkthrough in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**:

1. **Local file** — copy `index.html` (+ `assets/`, `scripts/`) to your device. Works offline.
2. **GitHub Pages** — push to a public repo; CI workflow auto-deploys.
3. **Netlify Drop / free tier** — drag-and-drop the whole folder.
4. **Vercel free tier** — one-click import the GitHub repo.
5. **Docker self-host** — `docker compose up -d`. Includes hardened nginx config.

---

## 🔐 Security & privacy

- **No data ever leaves your device** unless you explicitly configure a webhook URL.
- **No AI API calls** anywhere — by design and enforced in CI.
- **No analytics, no telemetry, no tracking, no cookies.**
- Encryption uses the browser's native **Web Crypto API** (AES-GCM 256 + PBKDF2-SHA-256, 120 000 iterations) — no third-party crypto libraries.
- Hardened security headers (CSP, X-Frame-Options, Permissions-Policy, Referrer-Policy) are pre-configured for every deployment target.

Full policy: **[SECURITY.md](SECURITY.md)**.

---

## 🤝 Contributing

Read **[CONTRIBUTING.md](CONTRIBUTING.md)** and **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)**. PRs welcome — every PR must:
- Keep the no-build / no-server / no-AI-API constraints
- Not remove any pre-existing feature
- Pass the CI security scan

---

## 👤 Author

**Adewale Samson Adeagbo** — Data Scientist · EdTech Builder · AI-Augmented Solutions Developer

| | |
|---|---|
| 🌐 Website | <https://cssadewale.pages.dev> |
| 💼 LinkedIn | <https://linkedin.com/in/adewalesamsonadeagbo> |
| 🐙 GitHub | <https://github.com/cssadewale> |
| 📞 WhatsApp | +234 810 086 6322 |

---

## 📄 License

MIT — see [LICENSE](LICENSE). Free for personal and commercial use.

<div align="center">

Built with ❤️ in Nigeria 🇳🇬 — *"Democratising data tools — one browser tab at a time."*

</div>
