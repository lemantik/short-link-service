# slink — URL Shortener

Self-hosted URL shortener with QR codes, click tracking, and dynamic redirects.

**Stack**: Cloudflare Workers + D1 (SQLite) + GitHub Pages

---

## Setup

### 1. Install dependencies

```bash
cd worker && npm install
```

### 2. Create the D1 database

```bash
npx wrangler d1 create short-link-db
```

Copy the `database_id` from the output and paste it into `worker/wrangler.toml`.

### 3. Apply the schema

```bash
cd worker
npm run db:init          # local dev DB
npm run db:init:remote   # production DB (after deploy)
```

### 4. Set your API key

```bash
npx wrangler secret put API_KEY
# enter any strong secret when prompted
```

### 5. Deploy the Worker

```bash
cd worker && npm run deploy
```

Note the Worker URL printed at the end (e.g. `https://short-link-worker.you.workers.dev`).

### 6. Deploy the frontend

Push the `frontend/` folder to a GitHub repo and enable GitHub Pages (Settings → Pages → Deploy from branch → `main` / `docs` or root).

### 7. Configure the dashboard

Open `index.html` in a browser, click the ⚙ gear icon, and enter:
- **Worker URL**: the URL from step 5
- **API Key**: the secret from step 4

---

## How dynamic QR codes work

The QR image encodes your **short URL** (e.g. `https://your-worker.workers.dev/abc`),
not the final destination. The Worker looks up the destination at redirect time.

To update where a QR code points: click **Edit** on any link and change the destination URL.
All printed/published QR codes continue to work and immediately redirect to the new URL.

---

## Local development

```bash
cd worker && npm run dev
```

Runs at `http://localhost:8787`. Open `frontend/index.html` locally and set the Worker URL to `http://localhost:8787`.

---

## API reference

All `/api/*` routes require `X-API-Key` header.

| Method   | Path                        | Description                     |
|----------|-----------------------------|---------------------------------|
| `GET`    | `/:code`                    | Redirect + track click          |
| `GET`    | `/api/links`                | List all links                  |
| `POST`   | `/api/links`                | Create link `{url, label?, code?}` |
| `PATCH`  | `/api/links/:code`          | Update `{url?, label?}`         |
| `DELETE` | `/api/links/:code`          | Delete link                     |
| `GET`    | `/api/links/:code/stats`    | Click stats                     |
