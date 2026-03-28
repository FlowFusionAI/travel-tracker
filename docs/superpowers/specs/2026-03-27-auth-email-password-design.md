# Auth — Email/Password Design

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Replaces Slice 7 (F8) Google OAuth plan with email/password auth using NextAuth v5

---

## Summary

Slice 7 originally planned NextAuth.js with Google OAuth. This document replaces that design with email/password authentication using NextAuth v5 (Credentials provider). Key changes: open signup, forgot-password flow via n8n webhook, no external OAuth setup required.

---

## Decisions

### Auth Library

**NextAuth v5 (Auth.js)** with Credentials provider. Handles sessions, CSRF protection, and middleware-based route guarding automatically. No external OAuth service required.

### Registration

Open signup — anyone with the URL can create an account. No invite system. Each user only sees their own data (all Airtable queries scoped to the authenticated user's record ID).

### Password Storage

bcrypt hash (cost factor 12) stored in a `Password Hash` field on the Airtable Users table. Plaintext passwords are never stored or logged.

### Forgot Password

Time-limited JWT reset token (15 min expiry) generated server-side, embedded in a reset link, and delivered via n8n webhook. The app never sends email directly — it calls the n8n webhook with the reset link and n8n handles delivery. The JWT is self-contained (no database storage needed for tokens).

---

## Architecture

### Files

| File | Responsibility |
|---|---|
| `auth.ts` | NextAuth v5 config — credentials provider, session shape, callbacks |
| `middleware.ts` | Route protection — redirects unauthenticated requests to `/login` |
| `lib/auth-helpers.ts` | bcrypt hash/verify, JWT sign/verify for reset tokens |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth catch-all handler |
| `app/api/auth/signup/route.ts` | Custom signup endpoint |
| `app/api/auth/forgot-password/route.ts` | Generate reset token, call n8n |
| `app/api/auth/reset-password/route.ts` | Verify reset token, update password hash |
| `app/(public)/login/page.tsx` | Login form |
| `app/(public)/signup/page.tsx` | Signup form |
| `app/(public)/forgot-password/page.tsx` | Forgot password form |
| `app/(public)/reset-password/page.tsx` | Reset password form (reads token from URL) |

### Route Protection

`middleware.ts` runs on every request. Protected pattern: `/(dashboard)/:path*`.

Public routes (no auth required):
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/shared/:shareId` (V2 trip sharing)
- `/api/auth/:path*`

---

## Data Flow

### Signup

1. User submits name, email, password, confirm password on `/signup`
2. `POST /api/auth/signup`:
   - Validate: email format, password ≥ 8 chars, passwords match
   - Check Airtable Users table for existing record with same email
   - If duplicate: return 409 "Email already in use"
   - bcrypt hash password (cost factor 12)
   - Create Users record in Airtable with Name, Email, Password Hash
   - Call `signIn('credentials', { email, password })` to auto-login
3. Redirect to `/map`

### Login

1. User submits email + password on `/login`
2. NextAuth credentials provider:
   - Fetch user from Airtable by email (`filterByFormula`)
   - `bcrypt.compare(password, user['Password Hash'])`
   - On match: return user object `{ id, email, name }`
   - On no match: return `null` (NextAuth shows generic error)
3. NextAuth sets encrypted session cookie
4. Redirect to `/map`
5. Error message: "Invalid email or password" (same message for both wrong email and wrong password — no enumeration)

### Forgot Password

1. User submits email on `/forgot-password`
2. `POST /api/auth/forgot-password`:
   - Always return 200 (never reveal if email exists)
   - Look up user in Airtable by email
   - If found: sign JWT `{ email, purpose: 'password_reset' }` with `RESET_TOKEN_SECRET`, 15 min expiry
   - Call `N8N_WEBHOOK_URL` via `fetch` POST with body: `{ email, name, resetLink: APP_URL + '/reset-password?token=' + token }`
3. Page shows: "If that email is registered, a reset link has been sent"

### Reset Password

1. User opens reset link `/reset-password?token=xxx`, enters new password
2. `POST /api/auth/reset-password`:
   - Verify JWT signature with `RESET_TOKEN_SECRET`
   - Check expiry (reject if expired)
   - Check `purpose === 'password_reset'`
   - Extract email, fetch user from Airtable
   - bcrypt hash new password (cost factor 12)
   - Update Airtable Users record `Password Hash` field
3. Redirect to `/login` with query param `?reset=success`
4. `/login` page shows toast: "Password updated — please sign in"

---

## Airtable Users Table Changes

| Field | Action | Notes |
|---|---|---|
| `Auth Provider ID` | **Remove** | Was Google OAuth sub ID — no longer needed |
| `Avatar URL` | **Remove** | Was Google profile photo — no longer needed |
| `Password Hash` | **Add** | Single line text — bcrypt hash, cost factor 12 |

Fields retained: `Name`, `Email`, `Joined`, `Trips`

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `AUTH_SECRET` | Slice 7 | Replaces `NEXTAUTH_SECRET`. Random 32-char string (`openssl rand -base64 32`) |
| `RESET_TOKEN_SECRET` | Slice 7 | Separate secret for signing JWT reset tokens |
| `N8N_WEBHOOK_URL` | Slice 7 | n8n webhook endpoint that receives `{ email, name, resetLink }` and sends the email |
| `APP_URL` | Slice 7 | Full app URL e.g. `https://travel.vercel.app` — used to construct reset links |

The `DEFAULT_USER_ID` env var (V1 shortcut) is **removed** when Slice 7 ships. All Airtable queries switch from filtering by `DEFAULT_USER_ID` to filtering by the authenticated user's Airtable record ID from the NextAuth session.

---

## Session Shape

```typescript
interface Session {
  user: {
    id: string    // Airtable Users record ID (rec...)
    email: string
    name: string
  }
}
```

The `id` is the Airtable record ID. It replaces `DEFAULT_USER_ID` in all query filters after Slice 7 ships.

---

## Error Handling

| Scenario | Response |
|---|---|
| Email already registered (signup) | 409 — "Email already in use" shown inline |
| Passwords don't match (signup) | Client-side validation — "Passwords don't match" |
| Password too short (signup) | Client-side validation — "Password must be at least 8 characters" |
| Wrong email or password (login) | NextAuth generic error — "Invalid email or password" |
| Reset token expired | 400 — "This reset link has expired. Please request a new one." |
| Reset token invalid/tampered | 400 — "Invalid reset link." |
| n8n webhook unreachable | Log server-side, still return 200 to user (silent failure — user retries) |

---

## PRD Changes Required

- F8 (Authentication): Replace "NextAuth.js with Google as the primary provider" with email/password + NextAuth v5 Credentials provider
- Section 3.1 Users table: Remove `Auth Provider ID` and `Avatar URL`, add `Password Hash`
- Section 3.3 Env vars: Replace `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` with `RESET_TOKEN_SECRET`, `N8N_WEBHOOK_URL`, `APP_URL`; rename `NEXTAUTH_SECRET` → `AUTH_SECRET`
- Section 5.1 Routes: Add `/signup` to public routes
