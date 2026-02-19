# Authentication & Authorization Documentation

**Summary:** Documents the legacy Client-Held JWT (localStorage) authentication flow and recommended Cookie-Based Session Auth improvements.

This document describes the **current** authentication and authorization flows in the Prodigy Pawns application (Next.js frontend + FastAPI backend) and **suggested improvements** based on security best practices.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current Authentication Flow](#2-current-authentication-flow)
3. [Current Authorization Flow](#3-current-authorization-flow)
4. [Current Implementation Reference](#4-current-implementation-reference)
5. [Security Considerations (Current)](#5-security-considerations-current)
6. [Suggested Improvements](#6-suggested-improvements)
7. [Comparison Summary](#7-comparison-summary)

---

## 1. Overview

| Layer        | Technology / Approach                    |
|-------------|-------------------------------------------|
| Frontend    | Next.js (App Router), Zustand, Axios      |
| Backend     | FastAPI, JWT, OAuth2PasswordBearer        |
| Token       | JWT (HS256), long-lived (7 days)          |
| Token storage (current) | `localStorage` (token + user object) |
| Auth state  | Zustand store + `loadFromStorage()`       |

---

## 2. Current Authentication Flow

### 2.1 Login

```
┌─────────────┐     POST /api/auth/login (email, password)      ┌─────────────┐
│   Browser   │ ──────────────────────────────────────────────► │   FastAPI   │
│  (Next.js)  │                                                  │   Backend   │
└─────────────┘                                                  └──────┬──────┘
       ▲                                                                 │
       │                                                                 │ Validate credentials
       │                                                                 │ Create JWT (sub=user_id, exp=7d)
       │                                                                 ▼
       │  JSON: { access_token, token_type: "bearer", user }     ┌─────────────┐
       │ ◄─────────────────────────────────────────────────────── │   Backend   │
       │                                                           └─────────────┘
       │
       │  Frontend: authAPI.login() → login(user, access_token)
       │  Store: localStorage.setItem('token', token)
       │         localStorage.setItem('user', JSON.stringify(user))
       │  Zustand: set({ user, token, isAuthenticated: true })
       │  Redirect: router.push('/dashboard')
       ▼
┌─────────────┐
│   Browser   │
└─────────────┘
```

**Steps:**

1. User submits email and password on `/login`.
2. Frontend calls `authAPI.login(email, password)` → `POST /api/auth/login` with form body `username` (email) and `password`.
3. Backend authenticates via `authenticate_user()` (email lookup + bcrypt password verify), then creates JWT with `create_access_token(data={"sub": user.id})` (expiry: 7 days).
4. Backend returns JSON: `{ access_token, token_type: "bearer", user }` (no cookie).
5. Frontend stores `access_token` and `user` in **localStorage** and updates Zustand (`login(user, token)`).
6. User is redirected to `/dashboard`.

### 2.2 Signup

- Same as login: backend returns `access_token` and `user` in JSON; frontend stores both in localStorage and Zustand.

### 2.3 Restoring Session (App Load / Navigation)

```
┌─────────────┐
│   Browser   │  User visits /dashboard (or /puzzles, etc.)
└──────┬──────┘
       │
       │  Page useEffect: useAuthStore.getState().loadFromStorage()
       │  loadFromStorage():
       │    token = localStorage.getItem('token')
       │    user  = JSON.parse(localStorage.getItem('user'))
       │    if (token && user) set({ user, token, isAuthenticated: true })
       │  No server call to validate token.
       ▼
  Auth state restored from localStorage only.
```

- **No server validation** on load: if `token` and `user` exist in localStorage, the app treats the user as logged in.
- Token expiry is only enforced when a request returns **401** (then the interceptor clears storage and redirects to `/login`).

### 2.4 Sending the Token on API Requests

- Axios request interceptor (`frontend/lib/api.ts`) reads `localStorage.getItem('token')` and sets `Authorization: Bearer <token>` on every request.
- Backend uses `OAuth2PasswordBearer(tokenUrl="/api/auth/login")`, which reads the token from the **Authorization** header only (not from cookies).

### 2.5 Logout

- Frontend: `logout()` in store removes `token` and `user` from localStorage and clears Zustand state; user is redirected to `/login`.
- Backend: no dedicated logout endpoint; token remains valid until it expires (no server-side revocation).

### 2.6 401 Handling

- Axios response interceptor: on **401**, clears `token` and `user` from localStorage and redirects to `/login` via `window.location.href = '/login'`.

---

## 3. Current Authorization Flow

### 3.1 Backend: Protected Endpoints

| Mechanism | Description |
|-----------|-------------|
| **Token extraction** | `OAuth2PasswordBearer` → token from `Authorization: Bearer <token>`. |
| **Validation** | `get_current_user(token)` in `auth.py`: JWT decode with `SECRET_KEY`, read `sub` (user_id), return `user_id: int`. |
| **Usage** | Endpoints that need "logged-in user" use `user_id: int = Depends(get_current_user)`. |

**Protected routes (require valid JWT):**

- `GET /api/auth/me` — current user info
- `GET/PUT /api/users/me`, `GET /api/users/me/stats`
- Puzzle attempts, leaderboard submission, achievements, daily challenge, etc.
- All `/api/coach/*` routes (see below)

**Public routes (no JWT):**

- `POST /api/auth/login`
- `POST /api/auth/signup`
- Some read-only routes (e.g. public puzzle list, leaderboard GET) if not explicitly protected

### 3.2 Backend: Role-Based Access (Coach / Admin)

| Component | Location | Behavior |
|-----------|----------|----------|
| **require_coach** | `backend/coach_endpoints.py` | `user_id = Depends(get_current_user)`, then load user from DB; if `user.role` not in `["coach", "admin"]` → **403 Forbidden**. |
| **Usage** | All coach router endpoints | `user: User = Depends(require_coach)` so only coaches/admins can access. |

Coach endpoints (all require coach or admin role): create/update/delete puzzles, revalidate, coach stats, etc.

### 3.3 Frontend: Route Protection

| Route | Protection |
|-------|-------------|
| `/dashboard` | `useEffect`: if `!isAuthenticated` (after `loadFromStorage()`), `router.push('/login')`. |
| `/puzzles`, `/puzzles/[id]` | Same: `loadFromStorage()` then redirect to `/login` if not authenticated. |
| `/coach/*` | Coach page(s) typically check `user?.role === 'coach' \|\| user?.role === 'admin'` and may redirect. |
| `/login`, `/signup` | No auth required; navbar hides on these paths. |

- "Authenticated" is determined only by Zustand state, which is populated from **localStorage** (or from login/signup response), not from a fresh `/api/auth/me` call on load.

---

## 4. Current Implementation Reference

| Concern | Location | Notes |
|---------|----------|--------|
| Token creation | `backend/auth.py` | `create_access_token(data={"sub": user.id})`, expiry 7 days. |
| Token acceptance | `backend/auth.py` | `OAuth2PasswordBearer` → reads `Authorization: Bearer`. |
| Login / signup | `backend/main.py` | `/api/auth/login`, `/api/auth/signup` return JSON with `access_token` and `user`. |
| Current user | `backend/main.py` | `GET /api/auth/me` uses `get_current_user` → returns user from DB. |
| Coach-only | `backend/coach_endpoints.py` | `require_coach()` enforces role. |
| Auth store | `frontend/lib/store.ts` | Zustand: `login()`, `logout()`, `loadFromStorage()`; localStorage for token + user. |
| API client | `frontend/lib/api.ts` | Axios: request interceptor adds Bearer token from localStorage; response interceptor on 401 clears storage and redirects to `/login`. |
| Login UI | `frontend/app/login/page.tsx` | Calls `authAPI.login()` then `login(response.user, response.access_token)`. |
| Protected pages | e.g. `frontend/app/dashboard/page.tsx`, `app/puzzles/page.tsx` | Call `loadFromStorage()` then redirect if `!isAuthenticated`. |

---

## 5. Security Considerations (Current)

| Risk | Description |
|------|-------------|
| **XSS** | Token and user are in localStorage; any script on the page can read them and exfiltrate the token. |
| **No token validation on load** | Session is restored from localStorage only; expired or revoked tokens are only detected when an API returns 401. |
| **Long-lived token** | 7-day expiry means a stolen token is useful for a long time. |
| **Stale user data** | User object in localStorage can be out of date (e.g. role, level, XP). |
| **No server logout** | Logout is client-only; token remains valid until expiry. |

---

## 6. Suggested Improvements

### 6.1 Use HttpOnly Cookies for the Token

**Current:** Token in localStorage; frontend sends `Authorization: Bearer <token>`.

**Suggested:**

- **Backend:** On login (and signup), set an **HttpOnly** cookie with the JWT instead of (or in addition to) returning it in the JSON body:
  - Example: `Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900`
- **Frontend:** Do **not** read or store the token in JavaScript. Send all API requests with `credentials: 'include'` so the browser sends the cookie automatically.
- **Backend:** For protected routes, read the token from the **cookie** first (e.g. `request.cookies.get("access_token")`), and optionally fall back to `Authorization: Bearer` for non-browser clients.

**Benefit:** Token is not accessible to JavaScript, so XSS cannot steal it.

### 6.2 Short-Lived Access Token + Refresh Token

**Current:** Single JWT with 7-day expiry.

**Suggested:**

- **Access token:** Short-lived (e.g. 15–30 minutes), stored in HttpOnly cookie only.
- **Refresh token:** Long-lived (e.g. 7 days), stored in a second HttpOnly cookie or in the database (with a random id in a cookie).
- **Flow:** On 401, frontend calls a dedicated **refresh** endpoint (e.g. `POST /api/auth/refresh`); backend validates refresh token and sets a new access-token cookie. If refresh fails, frontend clears state and redirects to login.

**Benefit:** Limits exposure of a stolen token; refresh can be rotated or revoked server-side.

### 6.3 Derive Auth State from the Server (e.g. GET /api/auth/me)

**Current:** `loadFromStorage()` restores `user` and `isAuthenticated` from localStorage; no server check.

**Suggested:**

- On app load (or when entering a protected area), call **GET /api/auth/me** with `credentials: 'include'`.
  - **200:** Use response to set `user` and `isAuthenticated` in Zustand (in memory only).
  - **401:** Try refresh; if that fails, set unauthenticated and redirect to login.
- Do **not** store the full user object in localStorage; keep it only in memory and re-fetch after login or refresh.

**Benefit:** Auth state reflects server-side validity; user data is always up to date; no sensitive user data in localStorage.

### 6.4 Frontend: Credentials and No Token in JS

**Current:** Axios interceptor reads token from localStorage and sets `Authorization: Bearer <token>`.

**Suggested:**

- Use `credentials: 'include'` (or Axios `withCredentials: true`) for all requests to the backend.
- Remove the request interceptor that sets the Authorization header for cookie-based auth (or keep it only for non-browser clients if backend supports both).
- Remove `loadFromStorage()` that reads token/user from localStorage; replace with a "session check" that calls `/api/auth/me` (and refresh on 401).

### 6.5 Backend: Logout Endpoint

**Current:** No backend logout; client clears localStorage only.

**Suggested:**

- Add **POST /api/auth/logout** (or GET) that clears the auth cookie(s) (e.g. `Set-Cookie: access_token=; ... Max-Age=0`).
- Frontend calls this on logout, then clears Zustand and redirects to login.

**Benefit:** Cookie is removed in the browser; consistent logout behavior.

### 6.6 401 Handling: Optional Refresh Then Redirect

**Current:** Any 401 → clear localStorage and redirect to login.

**Suggested:**

- On 401 from an API call: try **refresh** once (e.g. call refresh endpoint with credentials).
  - If refresh succeeds: retry the original request or re-fetch `/me`.
  - If refresh fails or returns 401: call logout endpoint (clear cookie), clear Zustand, redirect to login.

### 6.7 Cookie Security Flags (Production)

- **HttpOnly:** Prevent JavaScript access.
- **Secure:** Send only over HTTPS (use in production).
- **SameSite=Strict** (or **Lax**): Reduce CSRF and cross-site misuse.
- **Path:** Restrict to API path if appropriate (e.g. `/api`).

### 6.8 Optional: Refresh Token Rotation

- Store refresh tokens in the database; on each refresh, issue a new refresh token and invalidate the old one.
- Reduces impact of a stolen refresh token.

---

## 7. Comparison Summary

| Aspect | Current | Suggested |
|--------|--------|-----------|
| **Token storage** | localStorage | HttpOnly cookie (not readable by JS) |
| **User storage** | localStorage (full user object) | Not in storage; in-memory only, from `/api/auth/me` |
| **Token sent to API** | `Authorization: Bearer <token>` (set by JS) | Cookie sent automatically with `credentials: 'include'` |
| **Session restore** | `loadFromStorage()` (no server check) | Call `GET /api/auth/me` with credentials; 401 → refresh or login |
| **Token lifetime** | 7 days | Access: 15–30 min; refresh: 7 days (or similar) |
| **Refresh flow** | None; 401 → redirect to login | 401 → call refresh → retry or redirect |
| **Logout** | Client clears localStorage | Backend clears auth cookie; client clears state |
| **XSS impact** | Token and user readable by any script | Token not readable; user only in memory |

---

## Document Info

- **Last updated:** February 2025  
- **App:** Prodigy Pawns (Next.js + FastAPI)  
- **Scope:** Authentication and authorization flows; suggested improvements for production security.
