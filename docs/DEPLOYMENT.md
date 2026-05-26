# Deployment Guide — Step-by-step (all free)

This guide walks through **five** deployment options for the Enterprise Edition. Each step is numbered, unambiguous, and copy-pasteable. Pick the one that fits your situation:

| If you want… | Use |
|---|---|
| The fastest possible try-out | [Option 1 — Local server](#option-1-local-server-30-seconds) |
| Permanent free URL with auto-deploy on every commit | [Option 2 — GitHub Pages (recommended)](#option-2-github-pages-recommended) |
| Drag-and-drop, no Git | [Option 3 — Netlify Drop](#option-3-netlify-drop) |
| Same as GitHub Pages but with edge CDN | [Option 4 — Vercel](#option-4-vercel) |
| Self-hosted on your own server / VPS / Pi | [Option 5 — Docker self-host](#option-5-docker-self-host) |

> **Browser warning.** Service worker (offline / install-to-home-screen) only activates over `https://` or `http://localhost`. The double-click-the-file approach therefore works for the **base app** but not for the PWA bits. Use Option 1+ if you want the installable experience.

---

## Option 1 — Local server (30 seconds)

**Prerequisite:** any one of: Python, Node, or PHP installed.

1. Open a terminal in the `enterprise/` folder:
   ```bash
   cd enterprise
   ```

2. Start a one-liner static server (pick whichever you have):

   | Tool | Command |
   |---|---|
   | Python 3 | `python3 -m http.server 8080` |
   | Node | `npx serve .` (or `npx http-server -p 8080`) |
   | PHP | `php -S localhost:8080` |
   | Ruby | `ruby -run -e httpd . -p 8080` |

3. Open <http://localhost:8080> in Chrome / Firefox / Edge / Safari.

4. The base app loads, then **🏢 ENT** badge and **🏢 Enterprise** button appear in the header within a second.

5. (Optional) Install as PWA: Chrome ⋮ menu → **Install app**.

**To stop:** press `Ctrl+C` in the terminal.

---

## Option 2 — GitHub Pages (recommended)

This option is **best for**: permanent shareable URL, free forever, auto-deploys on every commit via the included GitHub Actions workflow.

### 2.1 Create the GitHub repository

1. Sign in at <https://github.com>. (Create a free account if needed.)
2. Click **+** (top-right) → **New repository**.
3. **Repository name:** `azure-datastudio-stimulator` (or any name you like).
4. **Visibility:** **Public** (required for free Pages on personal accounts).
5. **Do NOT** initialise with README, .gitignore, or license — we already have them.
6. Click **Create repository**. Copy the URL shown (it looks like `https://github.com/<you>/azure-datastudio-stimulator.git`).

### 2.2 Push this folder to the repo

In a terminal, from the `enterprise/` folder:

```bash
git init -b main
git add .
git commit -m "feat: enterprise edition initial commit"
git remote add origin https://github.com/<YOUR_USERNAME>/azure-datastudio-stimulator.git
git push -u origin main
```

If git asks for credentials, use a **Personal Access Token** as the password:
GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token** → tick `repo` scope → copy.

### 2.3 Enable GitHub Pages

1. In your repo, click **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. (No further config needed — the included `.github/workflows/pages.yml` is already detected.)

### 2.4 Verify deployment

1. Click the **Actions** tab. Watch the **"Deploy to GitHub Pages"** workflow finish (~30–60 s).
2. Back in **Settings → Pages**, the green banner shows your URL:
   ```
   https://<YOUR_USERNAME>.github.io/azure-datastudio-stimulator/
   ```
3. Open it. Done.

### 2.5 Updating

Every commit you push to `main` triggers an automatic redeploy. To update:

```bash
# edit any file…
git add .
git commit -m "fix: tweak nginx CSP"
git push
```

Site rebuilds in ~30 s.

---

## Option 3 — Netlify Drop

**Best for:** zero Git, just drag and drop.

1. Open <https://app.netlify.com/drop> in any browser.
2. Drag the **entire `enterprise/` folder** (not its contents) onto the drop zone. Or click the zone and select the folder.
3. Wait 10–30 s. Netlify gives you a URL such as `https://sparkly-fox-abc123.netlify.app`.
4. Open it. Done.

### 3.1 Make the URL permanent (optional, free)

1. Sign up free at <https://netlify.com>.
2. Claim the deploy → **Site configuration** → **Change site name** → e.g. `my-ads`.
3. New URL: `https://my-ads.netlify.app`.

### 3.2 Updating

Drag a new folder onto **Deploys** → **Drag and drop your site output folder here**.

> The included `netlify.toml` adds security headers and SPA redirect.

---

## Option 4 — Vercel

**Best for:** edge CDN, automatic preview deploys for PRs.

### Prerequisite
Complete **Option 2 steps 2.1 + 2.2** (push to a GitHub repo) first.

### Steps

1. Sign in at <https://vercel.com> using your GitHub account.
2. Dashboard → **Add New** → **Project**.
3. Find your repo in the list → **Import**.
4. **Framework Preset:** *Other*.
5. **Build & Output Settings:** leave defaults (Vercel detects our `vercel.json`).
6. Click **Deploy**.
7. After ~30 s the production URL appears: `https://<your-repo>.vercel.app`. Open it.

### Updating

Every `git push` triggers an automatic redeploy. Every PR gets a unique preview URL.

---

## Option 5 — Docker self-host

**Best for:** on-prem / VPS / Raspberry Pi / corporate intranet.

### Prerequisites

- Docker 20+ and (optionally) Docker Compose v2.

### Steps

1. From the `enterprise/` folder:
   ```bash
   docker compose up -d
   ```
   (or, without compose: `docker build -t ads-enterprise . && docker run -d -p 8080:80 --name ads ads-enterprise`)

2. Open <http://localhost:8080>. Done.

3. To stop:
   ```bash
   docker compose down
   ```

### 5.1 Expose to the internet (optional)

Use any free tunnel:

| Tool | Command |
|---|---|
| [Cloudflare Tunnel (free)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) | `cloudflared tunnel --url http://localhost:8080` |
| [ngrok free](https://ngrok.com) | `ngrok http 8080` |
| [Tailscale Funnel (free)](https://tailscale.com/funnel) | `tailscale funnel 8080` |

You'll get an HTTPS URL such as `https://abc-123.trycloudflare.com`.

### 5.2 Add HTTPS on your own domain

Easiest path: put the container behind **[Caddy](https://caddyserver.com)** which obtains Let's Encrypt certificates automatically. Sample `Caddyfile`:

```
ads.example.com {
    reverse_proxy localhost:8080
}
```

`caddy run` — done.

### 5.3 Customising the nginx config

Edit `deploy/nginx.conf`. The included config already sets a strict Content-Security-Policy, gzip, immutable cache for static assets, and no-cache for the HTML/SW. Rebuild after edits:

```bash
docker compose build --no-cache
docker compose up -d
```

---

## Post-deployment checklist

After any deployment, run through this list:

- [ ] Open the URL in **Chrome desktop** — base app loads, **🏢 ENT** badge appears in header.
- [ ] Open **DevTools → Application → Service Workers** — sw is `activated and running`.
- [ ] **Application → Manifest** — Add to Home screen button visible.
- [ ] Run a simple query (`SELECT sqlite_version();`) — works.
- [ ] Open **🏢 Enterprise → Audit Log** — boot entry present.
- [ ] Toggle a policy → toast appears.
- [ ] **Settings → Pages** (GitHub) or deploy logs (Netlify/Vercel) — last build was successful.
- [ ] Open URL on mobile (Chrome Android / Safari iOS) — responsive layout works.
- [ ] (Optional) Install as PWA — app icon shows on home screen.

---

## Common pitfalls & fixes

| Symptom | Cause | Fix |
|---|---|---|
| 🏢 button never appears | JS error or `scripts/enterprise.js` 404 | Check DevTools console + Network tab |
| Service worker not registering | Loaded via `file://` | Use a server (Options 1–5) |
| Encrypted bundle won't decrypt | Wrong passphrase | No recovery — try alternative password |
| GitHub Pages stuck on old version | Browser SW cache | DevTools → Application → **Unregister** SW → hard reload |
| CSP errors in console after Docker deploy | Custom CDN you added isn't allow-listed | Edit `deploy/nginx.conf` → add to `script-src`/`connect-src` |
| `policy.block` toast on harmless query | Over-strict policy | Hub → Policies → relax the relevant toggle |

---

## Backup before any redeploy

Before updating a production deployment that users rely on, always:

1. Hub → **Backup** → set a passphrase → **🔒 Export Encrypted Bundle**.
2. Save the `.adsent` file somewhere safe (Google Drive, password manager attachment, USB).
3. Push your new code / redeploy.
4. If anything breaks: Hub → **Backup** → **📥 Import Bundle** to restore.

---

*Last reviewed 2026-05-26.*
