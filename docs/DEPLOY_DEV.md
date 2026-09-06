# Torus Chess — Dev / Staging Deploy (Vercel + Railway)

Date: 2026-09-06  
Purpose: Get a **private hosted environment** running for internal testing. Not a public production launch guide.

Stack:

| Layer | Platform | Repo path |
|-------|----------|-----------|
| Frontend | [Vercel](https://vercel.com) | `frontend/` |
| Backend API | [Railway](https://railway.app) | `backend/` |
| Database | Railway Postgres plugin | managed |
| Chess engine | Stockfish binary on Railway | `STOCKFISH_PATH` |

---

## 1. What to get (accounts & resources)

Create these before you start clicking “Deploy”:

### Required

1. **GitHub account** with this repo pushed (Vercel and Railway deploy from Git).
2. **Vercel account** (Hobby/free is fine for private preview).
3. **Railway account** (trial/Hobby). You will create:
   - One **Postgres** database service
   - One **web service** for the FastAPI backend
4. **A new `SECRET_KEY`** for this environment (do **not** reuse your laptop `.env` if the URL will be shared):

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

### Strongly recommended for a useful staging env

5. **Resend account** (or any SMTP) — password reset + coach invite emails.
6. **Linux Stockfish binary** available on the Railway service (see §5). Without it, puzzles/hints/bots that call the engine will fail.

### Optional (skip for first deploy)

7. **Stripe test keys** — only if you will test parent payments.
8. **Custom domains** — not required; use `*.vercel.app` and `*.up.railway.app` first.

### Order of operations

```
1. Railway Postgres
2. Railway backend (env + Stockfish + start command)
3. Note the public API URL
4. Vercel frontend (point NEXT_PUBLIC_API_URL at API)
5. Update Railway FRONTEND_URL + CORS_ORIGINS to the Vercel URL
6. Redeploy backend once (so CORS/cookies match)
7. Smoke-test
```

Frontend and backend need each other’s final URLs. Deploy backend first with a temporary `FRONTEND_URL`, then fix after Vercel gives you a URL.

---

## 2. Railway — Postgres

1. New Railway project → **Add Postgres**.
2. Open the Postgres service → **Variables** (or **Connect**).
3. Copy connection fields. Railway often exposes:

   | Railway variable | Map to our app |
   |------------------|----------------|
   | `PGHOST` / host from `DATABASE_URL` | `DB_HOST` |
   | `PGPORT` (usually `5432`) | `DB_PORT` |
   | `PGDATABASE` | `DB_NAME` |
   | `PGUSER` | `DB_USER` |
   | `PGPASSWORD` | `DB_PASSWORD` |

**Important:** this codebase does **not** read `DATABASE_URL` directly. It expects `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (see `backend/database.py`).

On first API boot, SQLAlchemy `create_all` creates tables from models. Startup then runs `validate_required_schema()`. If that fails, apply the matching SQL under `backend/migrations/` against the Railway DB (Railway Postgres → Query / local `psql` with the public URL).

Optional after healthy boot:

```bash
# from your machine, with Railway DB vars in a temporary .env
cd backend
venv\Scripts\activate   # or source venv/bin/activate
python seed_data.py
```

---

## 3. Railway — Backend (FastAPI)

### 3.1 Create the service

1. **Add service** → **GitHub repo**.
2. Set **Root Directory** to `backend`.
3. **Start command** (Railway injects `PORT` — do not hardcode `8000`):

   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

4. Ensure the service is **public** (generate a domain under Settings → Networking).  
   Example: `https://torus-api-production-xxxx.up.railway.app`

### 3.2 Backend environment variables

Set these on the **API** service (not only on Postgres):

| Variable | Example / notes |
|----------|-----------------|
| `ENVIRONMENT` | `staging` |
| `SECRET_KEY` | output of `secrets.token_urlsafe(32)` |
| `DB_HOST` | from Postgres |
| `DB_PORT` | `5432` (or Railway’s port) |
| `DB_NAME` | from Postgres |
| `DB_USER` | from Postgres |
| `DB_PASSWORD` | from Postgres |
| `FRONTEND_URL` | temporary: your eventual Vercel URL, e.g. `https://torus-chess.vercel.app` (no trailing slash) |
| `CORS_ORIGINS` | same as `FRONTEND_URL` (comma-separate if multiple preview URLs) |
| `STOCKFISH_PATH` | e.g. `/app/stockfish/stockfish` (see §5) |

Email (if testing reset/invites):

| Variable | Notes |
|----------|--------|
| `SMTP_HOST` | e.g. `smtp.resend.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | e.g. `resend` |
| `SMTP_PASSWORD` | Resend API key |
| `SMTP_FROM` | e.g. `Torus Chess <onboarding@resend.dev>` for Resend test sender |
| `SMTP_USE_TLS` | `true` |

Stripe (optional):

| Variable | Notes |
|----------|--------|
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | from Stripe webhook endpoint |
| `STRIPE_SUCCESS_URL` | `https://YOUR_VERCEL_URL/parent/payments?success=true` |
| `STRIPE_CANCEL_URL` | `https://YOUR_VERCEL_URL/parent/payments?canceled=true` |

With `ENVIRONMENT=staging` and/or `FRONTEND_URL=https://...`, auth cookies get the **Secure** flag (required for HTTPS).

### 3.3 Health check

After deploy, open:

- `https://YOUR_RAILWAY_API/` → should return JSON welcome payload  
- `https://YOUR_RAILWAY_API/docs` → FastAPI Swagger (useful for debugging)

---

## 4. Vercel — Frontend (Next.js)

### 4.1 Create the project

1. [vercel.com/new](https://vercel.com/new) → import this GitHub repo.
2. **Root Directory** → `frontend` (Important — not the repo root).
3. Framework preset: **Next.js**.
4. Build settings (defaults are usually correct):

   | Setting | Value |
   |---------|--------|
   | Install | `npm install` |
   | Build | `npm run build` |
   | Output | Next.js default |

### 4.2 Frontend environment variables

In Vercel → Project → **Settings → Environment Variables** (Production + Preview):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR_RAILWAY_API` (no trailing slash) |

`NEXT_PUBLIC_*` is baked in at **build** time. After changing it, **Redeploy**.

### 4.3 Note the frontend URL

Example: `https://torus-chess.vercel.app`  
(or a preview URL like `https://torus-chess-git-main-xxxx.vercel.app`)

### 4.4 Sync CORS / cookies on Railway

Go back to Railway API variables and set:

```text
FRONTEND_URL=https://torus-chess.vercel.app
CORS_ORIGINS=https://torus-chess.vercel.app
```

If you use Preview deployments with changing URLs, either:

- test only against the stable Production Vercel URL, or  
- add extra origins: `CORS_ORIGINS=https://a.vercel.app,https://b.vercel.app`

Redeploy the Railway API after changing CORS/`FRONTEND_URL`.

---

## 5. Stockfish on Railway

Bots, hints, and coach analysis need a **Linux** Stockfish binary. Windows `stockfish.exe` will not work on Railway.

### Option A — Dockerfile (most reliable for staging)

Add a `backend/Dockerfile` later if Nixpacks fails. Sketch:

```dockerfile
FROM python:3.12-slim-bookworm
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && curl -L -o /tmp/sf.tar \
    https://github.com/official-stockfish/Stockfish/releases/download/sf_17/stockfish-ubuntu-x86-64-avx2.tar \
  && mkdir -p /app/stockfish && tar -xf /tmp/sf.tar -C /app/stockfish --strip-components=1 \
  && chmod +x /app/stockfish/stockfish \
  && rm -rf /var/lib/apt/lists/* /tmp/sf.tar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV STOCKFISH_PATH=/app/stockfish/stockfish
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
```

(Adjust the Stockfish release URL/binary name to a current official Linux build.)

**Pip note:** the app imports the `stockfish` Python package (`stockfish_service.py` / `hint_service.py`), but it may be missing from `requirements.txt`. Before deploying, add a line such as `stockfish==3.28.0` (or your pinned version) and commit, or Railway installs will fail at import time. The pip package is only a wrapper — you still need the native binary at `STOCKFISH_PATH`.

### Option B — Nixpacks apt package

In Railway service settings / a `nixpacks.toml` at `backend/`:

```toml
[phases.setup]
aptPkgs = ["stockfish"]
```

Then set:

```text
STOCKFISH_PATH=/usr/games/stockfish
```

(path may vary; check with Railway shell: `which stockfish`).

### Verify

After deploy, create a bot game or call a Stockfish-backed endpoint. If the binary path is wrong, logs will show engine start failures.

---

## 6. Smoke-test checklist

Use two browsers or profiles if testing PvP.

1. Open the Vercel URL — landing page loads.
2. Sign up / log in — cookies set; refresh keeps the session.
3. `GET /api/auth/me` via app navigation works (no CORS errors in DevTools).
4. Open a puzzle and solve (or attempt) once.
5. Start **Beat the Bot** and confirm a bot move returns (Stockfish).
6. (If SMTP configured) Forgot password sends mail.
7. (Optional) Parent payment with Stripe test mode.

If login fails with CORS or cookies:

- Confirm `NEXT_PUBLIC_API_URL` is exactly the Railway HTTPS origin.
- Confirm `FRONTEND_URL` / `CORS_ORIGINS` match the Vercel HTTPS origin (scheme + host, no trailing slash).
- Confirm you redeployed both after env changes.
- Confirm `ENVIRONMENT=staging` (or HTTPS `FRONTEND_URL`) so `Secure` cookies are set.

---

## 7. Local vs hosted env cheat sheet

| Concern | Local | Vercel + Railway staging |
|---------|-------|---------------------------|
| Frontend | `http://localhost:3000` | `https://….vercel.app` |
| API | `http://localhost:8000` | `https://….up.railway.app` |
| `ENVIRONMENT` | `development` | `staging` |
| Cookies `Secure` | off (HTTP) | on |
| CORS | localhost defaults | must list Vercel URL |
| Stockfish | Windows `.exe` path | Linux binary path |
| DB | local Postgres | Railway Postgres |

---

## 8. Cost / free-tier notes

- **Vercel Hobby**: fine for private Next.js previews; watch build minutes.
- **Railway**: trial credits then paid usage; sleep/idle policies may apply on cheap plans — first request after idle can be slow.
- Keep staging private (Vercel deployment protection / password, or share URL only with the team).

---

## 9. Out of scope for this guide

- Custom domains and DNS
- Production monitoring / backups / rollback owners
- CI GitHub Actions
- Wiring Great Chess Adventure challenge → live engine games
- Hardening Puzzle Racer for multi-instance Railway replicas (in-memory rooms)

When you are ready for a real academy beta, reuse this setup, switch `ENVIRONMENT=production`, lock CORS to the final domain, enable backups, and run `docs/LAUNCH_CHECKLIST.md`.
