# Authentication & Authorization — Cookie-Based Session Auth

**Summary:** This document describes the current (recommended) authentication and authorization flow: **Cookie-Based Session Auth** using HttpOnly cookies, short-lived access tokens, refresh tokens, and server-validated session via `GET /api/auth/me`. It is intended for both **functional** (product, QA) and **technical** (developers, DevOps) readers.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication Flow (Functional)](#2-authentication-flow-functional)
3. [Authentication Flow (Technical)](#3-authentication-flow-technical)
4. [Authorization (Roles & Protection)](#4-authorization-roles--protection)
5. [API Reference](#5-api-reference)
6. [Security Properties](#6-security-properties)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Overview

| Audience   | What you get |
|-----------|----------------|
| **Functional** | How login, logout, session restore, and “who can do what” work from a user/product perspective. |
| **Technical**  | How tokens, cookies, and endpoints work; where to look in the codebase. |

**Current system name:** **Cookie-Based Session Auth**

- **Token storage:** Access and refresh tokens are stored in **HttpOnly cookies** (not in JavaScript/localStorage).
- **Session restore:** The app calls **GET /api/auth/me** with cookies; the server returns the current user. No token is read or stored in the frontend.
- **Token lifetime:** Access token: **15 minutes**. Refresh token: **7 days**. On 401, the frontend calls **POST /api/auth/refresh** once to get a new access token, then retries the request.

---

## 2. Authentication Flow (Functional)

### 2.1 Login

1. User enters email and password on the login page and submits.
2. The app sends these to the backend. If they are correct:
   - The backend sets two **secure cookies** (access token, refresh token) in the browser.
   - The backend returns the **user** (name, level, XP, etc.) in the response body.
3. The app shows the user as “logged in” and typically redirects to the dashboard.
4. **The app never sees or stores the tokens**; only the browser holds them and sends them automatically on later requests.

### 2.2 Staying Logged In (Session Restore)

1. When the user opens the app (or a protected page), the app calls **“get current user”** (GET /api/auth/me) with the same cookies.
2. If the cookies are valid, the server returns the current user and the app shows the user as logged in.
3. If there is no valid cookie (e.g. first visit or after logout), the server returns “unauthorized” and the app shows the user as not logged in; protected routes redirect to login.

### 2.3 When the Access Token Expires (15 Minutes)

1. Any API request that returns “unauthorized” (401) triggers an automatic **refresh** in the background.
2. The app calls the **refresh** endpoint with the refresh cookie. If it is still valid:
   - The server sets a **new access token** cookie.
   - The app retries the original request; the user does not see an error.
3. If the refresh fails (e.g. refresh token expired or missing), the app clears the session and redirects to the login page.

### 2.4 Logout

1. User clicks **Logout**.
2. The app calls the backend **logout** endpoint. The backend clears the auth cookies in the browser.
3. The app clears the in-memory user and redirects to the login page.

---

## 3. Authentication Flow (Technical)

### 3.1 Backend: Cookies and Tokens

| Item | Purpose |
|------|--------|
| **access_token** cookie | JWT, short-lived (15 min). Used for **GET /api/auth/me** and all protected API calls. |
| **refresh_token** cookie | JWT, long-lived (7 days). Used only by **POST /api/auth/refresh** to issue a new **access_token**. |
| **Cookie attributes** | `HttpOnly`, `Path=/`, `SameSite=Lax`. `Secure` should be used in production (HTTPS). |

- **Login** (`POST /api/auth/login`) and **signup** (`POST /api/auth/signup`): On success, the response **sets** both cookies and returns **{ user }** in the body (no token in the body).
- **Refresh** (`POST /api/auth/refresh`): Reads **refresh_token** from the cookie; on success, sets a new **access_token** cookie and returns **{ user }**.
- **Logout** (`POST /api/auth/logout`): Clears **access_token** and **refresh_token** cookies (e.g. `Max-Age=0`).

Protected routes read the token from the **Cookie** header first; they can optionally support the **Authorization: Bearer &lt;token&gt;** header for non-browser clients.

### 3.2 Frontend: No Token in JavaScript

- All API requests use **credentials: 'include'** (or `withCredentials: true`) so the browser sends the cookies.
- The frontend **never** reads or stores the access or refresh token (no localStorage, no state).
- **Auth state** is:
  - Set on **login/signup** from the response **user**.
  - Restored by calling **GET /api/auth/me** (e.g. on app load or when entering a protected area); the result is stored in memory (e.g. Zustand) as **user** and **isAuthenticated**.
- **401 handling:**  
  - If the failing request is **GET /api/auth/me** (session check), the error is not treated as “redirect to login”; the app just marks the user as not authenticated.  
  - For any other 401, the client tries **POST /api/auth/refresh** once; on success it retries the original request; on failure it redirects to login.

### 3.3 Sequence Diagrams (Technical)

**Login**

```
Browser                    Frontend                     Backend
   |                           |                            |
   |  POST /api/auth/login     |                            |
   |  (email, password)        | --------------------------> |
   |                           |                            | validate credentials
   |                           |                            | create access_token (15m)
   |                           |                            | create refresh_token (7d)
   |                           |  Set-Cookie: access_token   |
   |                           |  Set-Cookie: refresh_token  |
   |                           |  { user }                   |
   |  <------------------------ | <------------------------- |
   |  store user in memory     |                            |
   |  redirect to /dashboard   |                            |
```

**Session restore (e.g. reload)**

```
Browser                    Frontend                     Backend
   |                           |                            |
   |  GET /api/auth/me         |                            |
   |  Cookie: access_token     | --------------------------> |
   |                           |                            | validate JWT, load user
   |                           |  { user }                  |
   |  <------------------------ | <------------------------- |
   |  set user, isAuthenticated |                            |
```

**401 → refresh → retry**

```
Browser                    Frontend                     Backend
   |                           |                            |
   |  GET /api/puzzles         | --------------------------> |
   |  Cookie: access_token     |                            | 401 (expired)
   |  <------------------------ | <------------------------- |
   |                           |                            |
   |  POST /api/auth/refresh   |                            |
   |  Cookie: refresh_token    | --------------------------> |
   |                           |                            | new Set-Cookie: access_token
   |                           |  { user }                  |
   |  <------------------------ | <------------------------- |
   |  GET /api/puzzles (retry) | --------------------------> |
   |  Cookie: access_token     |                            | 200
   |  <------------------------ | <------------------------- |
```

---

## 4. Authorization (Roles & Protection)

### 4.1 Backend

- **Protected routes:** Require a valid **access token** (from cookie or `Authorization: Bearer`). The backend decodes the JWT, reads **user_id** (`sub`), and loads the user.
- **Coach/Admin only:** Endpoints under `/api/coach/*` use a **require_coach** dependency: after resolving the user, they check `user.role` is **coach** or **admin**; otherwise they return **403 Forbidden**.

### 4.2 Frontend

- **Protected pages** (e.g. `/dashboard`, `/puzzles`, `/coach/*`): On load they call **loadSession()** (which calls **GET /api/auth/me**). If the user is not authenticated after that, they redirect to **/login**.
- **Coach pages:** Additionally check **user.role === 'coach' || user.role === 'admin'** and may redirect non-coaches.

---

## 5. API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Body: form `username` (email), `password`. Sets access + refresh cookies; returns `{ user }`. |
| POST | `/api/auth/signup` | No | Body: JSON user fields + password. Sets access + refresh cookies; returns `{ user }`. |
| GET | `/api/auth/me` | Yes (cookie or Bearer) | Returns current user. Used for session restore. |
| POST | `/api/auth/refresh` | Refresh cookie | Sets new access_token cookie; returns `{ user }`. |
| POST | `/api/auth/logout` | No | Clears access and refresh cookies. |

All authenticated requests must send cookies (same origin or with CORS credentials) or, if supported, `Authorization: Bearer <access_token>`.

---

## 6. Security Properties

- **XSS:** Tokens are in HttpOnly cookies, so JavaScript cannot read them; XSS cannot steal the token.
- **Session validity:** Auth state is derived from **GET /api/auth/me** (and refresh on 401), so the UI reflects server-side validity.
- **Short-lived access token:** Limits exposure if a token is ever leaked; refresh is used to get a new access token without re-entering the password.
- **Logout:** Backend clears cookies, so the session is invalidated in the browser.

---

## 7. Troubleshooting

| Symptom | What to check |
|--------|----------------|
| “Not logged in” after reload | Frontend must call **GET /api/auth/me** with credentials (e.g. on app load). Ensure **withCredentials: true** and same-origin or correct CORS + credentials. |
| 401 on every request | Cookies may not be set or sent. Ensure backend and frontend use the same **host** in development (e.g. both **localhost**), and that **Set-Cookie** is present in login/refresh responses. |
| Redirect to login immediately after login | Check that cookie domain/path and **SameSite** allow the frontend origin to send cookies to the API. |
| Refresh fails, then redirect | Refresh token may be expired (7 days) or missing. User must log in again. |

---

## Document Info

- **Last updated:** February 2025  
- **App:** Prodigy Pawns (Next.js + FastAPI)  
- **Scope:** Cookie-Based Session Auth — current authentication and authorization flow for functional and technical users.
