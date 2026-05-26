# Contributing to Azure DataStudio Stimulator — Enterprise Edition

Thank you for your interest in contributing! This document explains how to contribute effectively.

---

## Project philosophy (non-negotiable)

The project has **four constraints** that every contribution must respect. PRs that violate any of them will be closed.

1. **No build system.** The base app is a single `index.html`. The Enterprise layer is two extra files (`assets/enterprise.css` + `scripts/enterprise.js`). No npm install, no bundler, no transpilation.
2. **No server / no backend.** Everything runs in the browser.
3. **No AI / LLM API calls.** Cost constraint + privacy.
4. **Offline-first.** Must work after first load with the network disabled.

Additionally for the Enterprise folder:
5. **Do not remove any pre-existing feature** of the base app.
6. **Do not modify `index.html` destructively.** Only add the absolute minimum (a `<link>` and `<script>` tag).

CI enforces #3 automatically (`.github/workflows/ci.yml`).

---

## Ways to contribute

### 🐛 Report a bug

Open a GitHub Issue using the **Bug Report** template. Include browser, device, steps, expected vs actual, and any console errors.

### ✨ Suggest a feature

Open a GitHub Issue using the **Feature Request** template. The template includes a checklist to confirm the constraints above.

### 💻 Submit code

```bash
# 1. Fork the repo on GitHub

# 2. Clone your fork
git clone https://github.com/<YOU>/azure-datastudio-stimulator.git
cd azure-datastudio-stimulator/enterprise   # or repo root if you structured differently

# 3. Create a branch
git checkout -b feat/your-feature

# 4. Start a local server while editing
python3 -m http.server 8080

# 5. Make changes — keep the constraints

# 6. Run the testing checklist (see below)

# 7. Commit using conventional commits
git commit -m "feat(jobs): add per-job timezone support"
git push origin feat/your-feature

# 8. Open a Pull Request — fill in the template
```

---

## Code style

| Aspect | Rule |
|---|---|
| JavaScript | Plain ES6+. No TypeScript. No frameworks. |
| CSS | Prefer existing CSS custom properties (`var(--a1)` etc.) defined in `index.html`'s `:root`. |
| HTML | Semantic. Accessible (`aria-label`, keyboard reachable). |
| Naming | `camelCase` for JS, `kebab-case` for CSS classes, prefix Enterprise classes with `ent-`. |
| Comments | Use `// ═══ SECTION ═══` for major blocks. JSDoc for any exported function. |
| Storage | All Enterprise localStorage keys MUST start with `ads.ent.v1.`. |
| External calls | Only `cdnjs.cloudflare.com` and `fonts.googleapis.com`. Any new third-party network call requires explicit maintainer approval. |

---

## Testing checklist (run before every PR)

Manual tests:

- [ ] Chrome desktop (primary target)
- [ ] Firefox desktop
- [ ] Chrome on Android (or DevTools mobile emulation at 360px width)
- [ ] **Offline mode:** load once, kill network, full reload — still works
- [ ] Import a CSV, run a query, check all 8 result views
- [ ] Open the 🏢 Enterprise Hub, switch through all tabs — no console errors
- [ ] Toggle a policy → verify a matching blocked query produces a toast + audit entry
- [ ] Export an encrypted backup, factory-reset, import the backup → state restored
- [ ] PWA install prompt appears on Chrome desktop

Automated checks (run by CI on every PR):

- [ ] `.github/workflows/ci.yml` passes (HTML validate, link check, security scan)
- [ ] No `eval(` in any source file
- [ ] No AI API endpoint in any source file

---

## Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope):     new feature
fix(scope):      bug fix
docs(scope):     docs only
style(scope):    CSS / formatting (no code logic change)
refactor(scope): code restructure, no behaviour change
perf(scope):     performance improvement
test(scope):     tests
chore(scope):    tooling, deps
sec(scope):      security fix
```

Scopes used in this repo: `audit`, `auth`, `policy`, `jobs`, `webhook`, `backup`, `telemetry`, `pwa`, `i18n`, `ci`, `docs`, `deploy`, `editor`, `ui`.

Examples:
- `feat(jobs): per-job timezone selection`
- `fix(policy): allow DROP INDEX for analysts when explicitly enabled`
- `docs(deploy): add Caddy reverse-proxy snippet`

---

## Code of Conduct

Read **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)**. Be kind, focus on technical merit, and remember this project's mission: serving learners and professionals in resource-constrained environments.

---

## Contact

For questions or collaboration:

- **Name:** Adewale Samson Adeagbo
- **GitHub:** <https://github.com/cssadewale>
- **LinkedIn:** <https://linkedin.com/in/adewalesamsonadeagbo>
- **Website:** <https://cssadewale.pages.dev>
- **WhatsApp:** +234 810 086 6322
