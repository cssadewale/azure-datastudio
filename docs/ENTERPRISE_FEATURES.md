# Enterprise Features — Deep Reference

This document explains **every** capability the Enterprise layer adds on top of the base Azure DataStudio Stimulator v7 app. It is organised feature-by-feature with: *what it does → why it matters → how to use → how it works internally → limits & caveats*.

> All Enterprise features live in two files: `assets/enterprise.css` and `scripts/enterprise.js`. The base `index.html` only gets two extra tags (plus the PWA bits). **Nothing in the original app was removed.** You can revert at any time by deleting those tags.

---

## Table of contents

1. [Enterprise Hub](#1-enterprise-hub)
2. [Roles & access control](#2-roles--access-control)
3. [Passphrase gate](#3-passphrase-gate)
4. [Audit log](#4-audit-log)
5. [Governance policies](#5-governance-policies)
6. [Scheduled jobs](#6-scheduled-jobs)
7. [Webhook integration](#7-webhook-integration)
8. [Encrypted backup / restore](#8-encrypted-backup--restore)
9. [Local telemetry dashboard](#9-local-telemetry-dashboard)
10. [Progressive Web App (PWA) + offline](#10-progressive-web-app-pwa--offline)
11. [Toast notifications](#11-toast-notifications)
12. [i18n scaffolding](#12-i18n-scaffolding)
13. [SQL execution interceptor](#13-sql-execution-interceptor)
14. [Query version control (VCS)](#14-query-version-control-vcs)
15. [CI / CD & security headers](#15-ci--cd--security-headers)
16. [Repo hygiene templates](#16-repo-hygiene-templates)
17. [Internal API (window.ADSEnterprise)](#17-internal-api-windowadsenterprise)

---

## 1. Enterprise Hub

**What it does.** A new header button **🏢 Enterprise** opens a tabbed modal containing every Enterprise feature: Overview, Audit Log, Roles, Policies, Jobs, Webhook, Backup, Telemetry, About.

**Why it matters.** One predictable entry point. Discoverable. No sprawl of menus.

**How to use.** Click **🏢 Enterprise** in the top bar → pick a tab.

**Internals.** Created on the fly by `openHub()` in `scripts/enterprise.js`. Lives in DOM only while open — no perf cost otherwise.

---

## 2. Roles & access control

**What it does.** Three roles ship by default:

| Role | Capabilities |
|---|---|
| `admin` | Everything: configure roles/policies/jobs, run any SQL including DROP |
| `analyst` | Read + write data (SELECT/INSERT/UPDATE), but cannot change Enterprise settings or DROP tables (unless policy allows) |
| `viewer` | **Read-only.** UI editor is dimmed; any INSERT/UPDATE/DELETE/DROP/ALTER/CREATE is rejected with a toast |

**Why it matters.** When you share a workspace (e.g. for a class, internal demo, or client), you can give someone the URL with role = viewer and trust they cannot break the data.

**How to use.**
1. Hub → **Roles** → toggle **Enable role enforcement** on.
2. Add users (just a name — no passwords per user).
3. Switch active user with the **Use** button. The role pill in the header updates.

**Internals.** Roles are enforced in two places:
1. **UI:** `body.ent-readonly` CSS class dims editor when viewer is active.
2. **SQL layer:** the `Policy.check()` function inspects the SQL string before every `db.exec()` call (see Feature 13).

**Limits.**
- Client-side only — a determined user with browser DevTools can flip their role. This is **governance, not a security boundary.** For hard isolation, use OS-level access or deploy separate URLs per role.

---

## 3. Passphrase gate

**What it does.** Optional splash screen at app load. User must enter the workspace passphrase before the base app becomes visible.

**Why it matters.** Lightweight protection for shared/public URLs where you don't want random visitors to see your data.

**How to use.**
1. Hub → **Roles** → scroll to **🔐 Workspace Passphrase**.
2. Type a passphrase twice → **Set Passphrase**.
3. Reload — gate appears on every fresh tab.

**Internals.**
- The passphrase is salted (16 random bytes) and hashed with `SHA-256` via Web Crypto.
- Only the salt and the hash are stored in `localStorage` — never the plaintext.
- After successful unlock, a `sessionStorage` flag skips the gate for that tab.

**Limits.** Cleared if user wipes browser data. Reset by deleting `localStorage` key `ads.ent.v1.auth`.

---

## 4. Audit log

**What it does.** Every meaningful action is logged with `{timestamp, actor, role, action, detail}`. Capped at 2 000 entries (oldest discarded). Exportable as JSON or CSV.

**Captured events:**
- `app.boot`, `hub.open`
- `auth.unlock`, `auth.unlock.fail`, `role.change`
- `sql.exec`, `sql.run`, `sql.error`
- `policy.block`
- `job.run`, `job.error`
- `backup.export.encrypted`, `backup.export.plain`, `backup.import`
- `webhook.send`

**Why it matters.** Compliance lite. Trace who did what, when. Export periodically for archive.

**How to use.** Hub → **Audit Log** → browse, **⬇ Export JSON**, **⬇ Export CSV**, or **🗑 Clear**.

**Internals.** `Audit.log()` writes to `localStorage[ads.ent.v1.audit]`. The exports never call out — they construct a `Blob` and trigger a local download.

---

## 5. Governance policies

**What it does.** Enforceable rules that intercept SQL before execution.

| Policy | Default | Behaviour |
|---|---|---|
| Block DROP for non-admins | ON | `DROP TABLE/VIEW/INDEX/TRIGGER` requires admin role |
| Warn on TRUNCATE-equivalent | OFF | Adds warning when `DELETE FROM x;` lacks WHERE |
| Block DELETE without WHERE | ON | Hard block, not just warn |
| Block ATTACH DATABASE | ON | Prevents attaching external SQLite files |
| Warn on full table scans | ON | Reads query plan; warns if SCAN TABLE detected |
| Max rows per query | 100 000 | (Future: auto-LIMIT injection) |

**Why it matters.** Stops common foot-guns. New analysts can experiment freely without fear of dropping prod-shaped tables.

**How to use.** Hub → **Policies** → flip checkboxes. Each change persists immediately.

**Internals.** `Policy.check(sql)` returns `{allowed, reason?}`. The interceptor (Feature 13) calls it before every query. Blocked queries:
1. Toast pops up with reason
2. Audit entry `policy.block` written
3. Original call throws — base app handles it like a normal SQL error

---

## 6. Scheduled jobs

**What it does.** Stores SQL snippets that run automatically every *N* minutes while the tab is open.

**Why it matters.** Refresh a dashboard view every 5 minutes. Compact a staging table every hour. Re-aggregate KPIs.

**How to use.** Hub → **Jobs** → fill the **+ New Scheduled Job** form:
- **Name:** human-readable
- **Interval (minutes):** ≥ 1
- **SQL:** any valid SQLite

Click **Create Job**. The ticker (`setInterval` 30 s) checks for due jobs and runs them.

**Each job card shows.** Enabled toggle, last run timestamp, last output (row count + ms or error), Run-now button, Delete.

**Internals.** Uses the global `window.db` reference exposed by sql.js. All output is recorded in the audit log.

**Limits.**
- Only runs while a tab is open. Closing the tab pauses jobs.
- No retries on failure (next interval simply tries again).
- For true 24/7 scheduling you'd need a server — out of scope (would violate the no-server constraint).

---

## 7. Webhook integration

**What it does.** Optionally POSTs payloads to any URL of your choosing.

**Why it matters.** Bridge the gap to the outside world *only when you explicitly want to*. Compatible free receivers:

| Service | Free tier | Best for |
|---|---|---|
| [webhook.site](https://webhook.site) | Free, unlimited | Testing / debugging |
| Zapier Webhooks (free) | 100 tasks/mo | Pipe data into 5 000+ apps |
| Make.com (Integromat) | 1 000 ops/mo | Visual workflows |
| n8n self-hosted | Free | Full automation, self-host with Docker |
| Pipedream | 100 invocations/day | Code-level flexibility |

**How to use.** Hub → **Webhook** → paste your URL → enable → **📤 Send Test Payload**.

**Future-friendly hook.** You can call from the console after a query:
```js
ADSEnterprise.Webhook.send({ kind:'result', rows: lastResult });
```

**Internals.** Pure `fetch()` POST. The URL is the only network destination Enterprise ever uses. If you never enable webhook, nothing leaves the device.

---

## 8. Encrypted backup / restore

**What it does.** Bundles everything Enterprise + base-app `localStorage` data (projects, snippets, history, settings, jobs, audit log, policies, variables, roles) into a single file.

Two formats:
- **Encrypted (`*.adsent`)** — AES-GCM 256 with PBKDF2-SHA-256 key derivation (120 000 iterations, 16-byte salt, 12-byte IV).
- **Plain (`ads-workspace.json`)** — just JSON, no encryption.

**Why it matters.** Migrate to a new device, onboard a teammate, archive a project state, recover from cleared browser data.

**How to use.** Hub → **Backup**:
- Type a passphrase (≥ 8 chars) → **🔒 Export Encrypted Bundle**.
- To restore: **📥 Import Bundle** → pick file → enter passphrase.

**Internals.** All crypto via the browser's native `crypto.subtle` — zero external dependencies. Look at the `Crypt` object in `scripts/enterprise.js`.

**⚠ Warning.** If you forget the passphrase, the bundle is unrecoverable. Store it in a password manager.

---

## 9. Local telemetry dashboard

**What it does.** Counts queries, errors, imports, exports, and tracks average query latency.

**Why it matters.** Spot regressions ("queries are 4× slower since the last import"). Understand your own usage patterns.

**How to use.** Hub → **Telemetry**. Reset counters at any time.

**Internals.** Counters in `localStorage[ads.ent.v1.telemetry]`. Updated by the SQL interceptor. **Never transmitted.**

---

## 10. Progressive Web App (PWA) + offline

**What it does.** Adds `manifest.webmanifest` + `service-worker.js`. On any HTTPS deployment (or `http://localhost`), the browser offers to **install the app** on your home screen and caches the shell for offline use.

**Why it matters.**
- App icon on phone/tablet home screen.
- Full-screen, no browser chrome.
- First load works; subsequent loads work offline (service worker cache).
- CDN assets (sql.js, PapaParse, fonts) cached after first download via stale-while-revalidate.

**How to use.** Open the deployed URL in Chrome → ⋮ menu → **Install app** (or **Add to home screen** on Android).

**Internals.**
- **Strategy:** cache-first for same-origin shell, stale-while-revalidate for `cdnjs.cloudflare.com` and Google Fonts.
- **Versioning:** bump the `CACHE` constant in `service-worker.js` to force users to a new build.
- **Fallback:** if a navigation fetch fails, returns cached `index.html`.

---

## 11. Toast notifications

**What it does.** Non-blocking messages in the bottom-right corner. Types: `info` (blue), `ok` (green), `warn` (amber), `err` (red).

**Why it matters.** Replaces silent failures and disruptive `alert()` calls.

**How to use programmatically.**
```js
ADSEnterprise.toast('Saved!', 'ok');
ADSEnterprise.toast('Network blocked', 'err', 6000);
```

---

## 12. i18n scaffolding

**What it does.** Two locale files in `locales/` (English + Yorùbá). The Enterprise layer is structured so future PRs can swap strings via a `t(key)` helper.

**Why it matters.** Lowers the barrier for non-English-speaking users — important for the project's resource-constrained-environments mission.

**How to extend.** Copy `locales/en.json` → `locales/<lang>.json` → translate values → submit PR.

---

## 13. SQL execution interceptor

**What it does.** Monkey-patches `window.db.exec` and `window.db.run` (the sql.js handles exposed by the base app) once they are available. Every query then passes through:

1. **Policy check** (Feature 5) — may reject.
2. **Timing start** (`performance.now()`).
3. **Original call** (real SQL execution).
4. **Telemetry update** (Feature 9).
5. **Audit log entry** (Feature 4).
6. **Error capture** (logs `sql.error` if it throws).

**Why it matters.** Zero changes to base-app code. The base app keeps working exactly the same; the Enterprise layer simply observes and gates.

**Implementation note.** Idempotent — sets a `__entWrapped` flag so re-wraps are skipped if the base app re-creates `db`.

---

## 14. Query version control (VCS)

**What it does.** Manual snapshots of named queries. Keeps up to 50 versions each with author + timestamp. Includes a tiny line-level diff helper.

**Why it matters.** "What did this query look like last Tuesday?" answered in two clicks.

**API.**
```js
ADSEnterprise.VCS.snapshot('monthly_report', editor.getValue());
ADSEnterprise.VCS.history('monthly_report');     // [{ts,sql,author},…]
ADSEnterprise.VCS.diff(oldSQL, newSQL);          // [{k:'eq'|'add'|'rem', t:'…'}]
```

UI surfacing is left to a future iteration; the data engine is ready.

---

## 15. CI / CD & security headers

### GitHub Actions

- **`.github/workflows/ci.yml`** — runs on every push & PR:
  - HTML validation (report-only)
  - Markdown link check
  - Security scan: blocks PRs that introduce `eval(` or any AI API endpoint
- **`.github/workflows/pages.yml`** — auto-deploys to GitHub Pages on push to `main`.

### Security headers

Pre-configured in three deployment targets:

| Header | Value |
|---|---|
| `Content-Security-Policy` | locks scripts/styles to self + cdnjs + Google Fonts (nginx only) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | disables geolocation, mic, camera |

Files: `deploy/nginx.conf`, `vercel.json`, `netlify.toml`.

---

## 16. Repo hygiene templates

- **`CODEOWNERS`** — auto-requests reviews from maintainers on PRs.
- **`dependabot.yml`** — keeps the GitHub Actions versions current (no other deps to scan).
- **Issue templates** — Bug / Feature with constraint checklists.
- **PR template** — forces contributors to tick off the project's non-negotiables.

---

## 17. Internal API (`window.ADSEnterprise`)

Power users / advanced PRs can use these from the browser console:

| Member | Purpose |
|---|---|
| `Audit.log(action, detail)` | Add an audit entry |
| `Audit.list()`, `Audit.clear()`, `Audit.toCSV()` | Read / clear / export audit |
| `Auth.config()`, `Auth.currentRole()`, `Auth.can('admin')` | Inspect identity |
| `Policy.get()`, `Policy.check(sql)` | Inspect / dry-run policy |
| `Telemetry.state()`, `Telemetry.reset()` | Inspect / reset counters |
| `Jobs.add({name, intervalMin, sql, enabled})`, `Jobs.list()`, `Jobs.remove(id)` | Manage jobs |
| `Webhook.send(payload)` | Manual webhook ping |
| `Crypt.encrypt(plaintext, pass)`, `Crypt.decrypt(payload, pass)` | Raw crypto primitives |
| `VCS.snapshot(name, sql)`, `VCS.history(name)`, `VCS.diff(a,b)` | Versioning |
| `openHub()` | Open the Hub modal programmatically |
| `toast(msg, type)` | Show toast |
| `version` | Layer version string |

---

## Reverting to the un-enhanced app

In `index.html`, remove these tags near `</body>`:

```html
<link rel="stylesheet" href="assets/enterprise.css">
<script defer src="scripts/enterprise.js"></script>
<link rel="manifest" href="manifest.webmanifest">
<script>if('serviceWorker' in navigator){…}</script>
```

The base app continues to work exactly as before. No data is destroyed by this revert — Enterprise data simply becomes unread (still in `localStorage` under the `ads.ent.v1.` prefix).

---

*Document version: 1.0.0 — last updated 2026-05-26.*
