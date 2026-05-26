# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| **Enterprise 1.x** (this folder) | ✅ Active |
| v7.x (Azure DataStudio Stimulator base) | ✅ Active |
| v6.x (SQLab Pro) | ⚠ Security fixes only |
| v5.x and below | ❌ Not supported |

## Reporting a Vulnerability

**Do not** open a public GitHub Issue for security defects. Use **one** of:

- 🔒 **GitHub Security Advisory** (preferred): repo → **Security** tab → **Report a vulnerability**.
- 💼 **LinkedIn:** <https://linkedin.com/in/adewalesamsonadeagbo>
- 📞 **WhatsApp:** +234 810 086 6322

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Whether you would like to be credited in the changelog

Acknowledgment within **48 hours**. Fix target:
- 🔴 Critical (e.g. XSS that exfiltrates data, broken access boundary that affects multiple users): **3 days**
- 🟠 High: **7 days**
- 🟡 Medium / Low: next minor release

## Security Design

### Core principles
- **No server** — no backend, therefore no server-side attack surface.
- **No external transmission** of user data — unless the user explicitly configures a webhook URL.
- **No AI API calls** — by design and enforced in CI (`.github/workflows/ci.yml`).
- **No analytics, telemetry, tracking, or cookies.**
- **No `eval()`** — enforced in CI.
- **localStorage only** — all persistent state is on the user's device.

### Cryptography
- Encrypted backups use the **browser's native Web Crypto API**:
  - Key derivation: **PBKDF2-SHA-256**, 120 000 iterations, 16-byte random salt
  - Cipher: **AES-GCM 256**, 12-byte random IV
- Passphrase hashing (gate): **SHA-256** with 16-byte random salt
- Zero third-party crypto libraries

### Deployment hardening
Pre-configured security headers in every deployment target:
- `Content-Security-Policy` (nginx) — restricts script/style/font origins
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

Files: `deploy/nginx.conf`, `vercel.json`, `netlify.toml`.

### CI security checks
On every push and PR, `.github/workflows/ci.yml`:
- Scans for accidental `eval(`
- Scans for AI/LLM API endpoints (project policy)
- Validates HTML
- Checks Markdown links

## Threat model (transparency)

**In scope (we protect against):**
- Accidental data destruction (DROP/DELETE without WHERE) → mitigated by policies + role enforcement
- Casual snooping on a shared deployment URL → mitigated by passphrase gate
- Data tampering of exported bundles → mitigated by AES-GCM authenticated encryption

**Out of scope (you must handle separately):**
- A malicious local user with browser DevTools — role enforcement is client-side and can be bypassed by anyone with access to the same machine + DevTools. Use OS-level access controls.
- Supply-chain compromise of the CDN libraries (sql.js, PapaParse, Google Fonts) — pin SRI hashes or self-host if your threat model requires it.
- Physical theft of the device — encrypt your disk.

## Data Privacy

All data you import, query, and analyse stays entirely within your browser. Audit log, telemetry, policies, jobs, roles — all local. The **only** outbound network requests are:

1. Initial CDN loads (sql.js, PapaParse, Google Fonts) — cached after first use.
2. The webhook URL you explicitly configure under **🏢 Enterprise → Webhook** — opt-in only.

That's it. Nothing else, ever.
