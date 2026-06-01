# SilverPay — Railway deploy (full project)

Deploy **3 services** from one GitHub repo:

| Service | Root folder | Public URL example |
|---------|-------------|-------------------|
| **API** | `backend` | `https://silverpay-api.up.railway.app` |
| **User app** | `app` | `https://silverpay-app.up.railway.app` |
| **Admin** | `admin` | `https://silverpay-admin.up.railway.app` |

Database: **MongoDB Atlas** (free M0 works — replica set, transactions OK).

---

## 1. MongoDB Atlas

1. [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → Create cluster (M0).
2. **Database Access** → user + password.
3. **Network Access** → `0.0.0.0/0` (allow Railway).
4. **Connect** → Drivers → copy URI, e.g.  
   `mongodb+srv://USER:PASS@cluster.mongodb.net/silverpay?retryWrites=true&w=majority`

---

## 2. Railway project

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** → select `silverpay` repo.
2. Create **three services** from the same repo (duplicate service or “Add service”):

### ⚠️ `Missing script: "build"` fix

Railway **repo root** par build mat chalao — root `package.json` mein sirf `dev` scripts hain.

Har service ke liye zaroor set karo:

**Settings → Root Directory** = `backend` **ya** `app` **ya** `admin` (service ke hisaab se)

Phir **Redeploy**. Build log mein ~26 packages nahi, backend ~100+, app ~400+ dikhne chahiye.

### Service A — `backend` (API)

- **Settings → Root Directory:** `backend` ← **required**
- **Settings → Networking → Generate Domain** (note URL, e.g. `https://xxx.up.railway.app`)

**Variables:**

```env
NODE_ENV=production
JWT_SECRET=<random 32+ characters>
MONGODB_URI=<Atlas connection string>
CORS_ORIGINS=https://YOUR-APP.up.railway.app,https://YOUR-ADMIN.up.railway.app
ALLOW_ENV_ADMIN_BOOTSTRAP=true
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong password>
ADMIN_NAME=Admin
```

After first login works, set `ALLOW_ENV_ADMIN_BOOTSTRAP=false`.

Optional: **Volume** → Mount path `/app/uploads` (keeps banner/promo images across redeploys).

Health check: `GET /health` → `{ "ok": true }`

---

### Service B — `app` (user PWA)

- **Root Directory:** `app` ← **required**
- **Generate Domain**

**Variables (build-time):**

```env
VITE_API_BASE_URL=https://YOUR-API.up.railway.app
# optional — if APK is hosted on a CDN instead of /silverpay.apk
# VITE_APK_DOWNLOAD_URL=https://cdn.example.com/silverpay.apk
```

Use the **backend** public URL **without** `/api` at the end.

Redeploy app whenever you change this URL.

**Android APK:** Users download from **Profile → Download APK**. After the app is live on HTTPS, generate the package per [APK_BUILD.md](./APK_BUILD.md) and commit `app/public/silverpay.apk` or set `VITE_APK_DOWNLOAD_URL`.

---

### Service C — `admin`

- **Root Directory:** `admin` ← **required**
- **Generate Domain**

**Variables:**

```env
VITE_API_BASE_URL=https://YOUR-API.up.railway.app
```

---

## 3. Wire CORS (important)

On **backend**, `CORS_ORIGINS` must list **exact** app + admin Railway URLs (comma-separated, no spaces), e.g.:

```text
https://silverpay-app-production.up.railway.app,https://silverpay-admin-production.up.railway.app
```

If login/API fails with CORS error, fix this first.

---

## 4. Railway CLI (optional)

```bash
npm i -g @railway/cli
railway login
cd backend && railway link
railway up
```

Repeat linking `app` and `admin` folders as separate services in the dashboard (CLI is easier per-folder).

---

## 5. Seed admin (alternative to bootstrap env)

From your machine (Atlas URI in env):

```bash
cd backend
MONGODB_URI="mongodb+srv://..." JWT_SECRET="..." npm run db:seed
```

---

## 6. Paytm / SMS / rates

Set in **Admin → Settings** after login, or add backend env vars from `backend/.env.example`.

---

## 7. Local vs Railway

| | Local | Railway |
|---|--------|---------|
| API | `localhost:4000` | Public domain |
| Frontends | Vite proxy `/api` | `VITE_API_BASE_URL` → API domain |
| MongoDB | `127.0.0.1` | Atlas |
| Transactions | Optional `MONGODB_DISABLE_TRANSACTIONS=true` | Atlas = OK |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Missing script: "build"` | Set **Root Directory** to `backend` / `app` / `admin`, not empty |
| `@tailwindcss/oxide` / Node 18 | Root Directory sahi ho; Node **20** (`.node-version` in repo). Redeploy |
| `CORS_ORIGINS must be set` | Set `CORS_ORIGINS` on backend |
| `Transaction numbers... replica set` | Use Atlas, not local standalone Mongo |
| App white screen / API 404 | Rebuild app with correct `VITE_API_BASE_URL` |
| Uploads disappear after redeploy | Attach Railway **volume** on backend at `/app/uploads` |
| 502 on API start | Check logs; `JWT_SECRET` length ≥ 32 |

---

## File map

- `backend/railway.toml` — API build/start
- `app/railway.toml` — user app
- `admin/railway.toml` — admin panel
- `app/src/lib/apiBase.ts` — production API URL
