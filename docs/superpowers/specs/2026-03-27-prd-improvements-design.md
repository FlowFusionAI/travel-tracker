# PRD Improvements — Design Document

**Date:** 2026-03-27
**Status:** Approved
**Scope:** Pre-implementation review of PRD.md before Slice 1 begins

---

## Summary

Ten gaps were identified in the PRD during a pre-implementation review. All are addressed below with explicit decisions. Changes are applied directly to PRD.md and CLAUDE.md.

---

## Decisions Made

### 1. Airtable Attachment URL Expiry (Critical)

**Problem:** Airtable CDN URLs for attachments are signed and expire after ~2 hours. Storing or rendering them directly will cause broken images.

**Decision:** Add a Next.js image proxy route `/api/images` that fetches a fresh signed URL from Airtable on every request. All image `src` attributes in components point to this proxy, never directly to Airtable CDN URLs.

Implementation note for Slice 4 (Mind Map) and Slice 6 (Memories): image upload returns an Airtable record ID + field name. The component constructs `/api/images?recordId=xxx&field=Images` and the proxy fetches the current signed URL server-side before redirecting.

---

### 2. V1 Authentication Gap

**Problem:** Auth is deferred to V2, but a Vercel-deployed app is publicly accessible. Airtable queries need a user scope even in V1.

**Decision:** Use **Vercel Password Protection** (one toggle in the Vercel dashboard) for V1. No code changes required. Additionally, a `DEFAULT_USER_ID` env var will be used in Slice 1 to scope all Airtable queries, making the V2 auth migration a find-and-replace rather than an architectural change.

---

### 3. Next.js Version

**Problem:** PRD says "Next.js 14+" but installed version is 16.x with React 19.

**Decision:** Update all references to "Next.js 16.x". Note that Next.js 15+ changed caching defaults (opt-in rather than opt-out). The `revalidate: 3600` pattern still works but `fetch` calls no longer cache by default — explicit `{ next: { revalidate: 3600 } }` options are required.

---

### 4. Environment Variables

**Problem:** No env vars documented anywhere. CLAUDE.md has `[your base ID]` placeholder.

**Decision:** Document all required env vars in both PRD.md (new Section 3.3) and CLAUDE.md. Actual values stored in `.env.local` (gitignored). CLAUDE.md references env var names, not values.

Required vars:
```
AIRTABLE_API_KEY          # Airtable personal access token
AIRTABLE_BASE_ID          # Target base ID
DEFAULT_USER_ID           # Airtable record ID for V1 single user (removed in V2)
NEXTAUTH_SECRET           # (V2) Random secret for NextAuth
NEXTAUTH_URL              # (V2) App URL e.g. https://travel.vercel.app
GOOGLE_CLIENT_ID          # (V2) Google OAuth client
GOOGLE_CLIENT_SECRET      # (V2) Google OAuth secret
```

---

### 5. GeoJSON Dataset

**Problem:** PRD says "Natural Earth" without specifying resolution or hosting strategy.

**Decision:** Use **Natural Earth 50m Admin 0 Countries** (`ne_50m_admin_0_countries.geojson`). Provides good balance of detail (~3.8MB) without being too heavy. File is downloaded once and stored in `/public/data/countries.geojson` (bundled, no external CDN dependency). Lazy-loaded via dynamic import in the Leaflet layer.

---

### 6. Mind Map Save State UX

**Problem:** Auto-save with debounced writes gives no feedback on failure (rate limit hit, network drop).

**Decision:** Add a persistent save status indicator to the mind map canvas:
- "Saving..." — during debounce window and while write is in-flight
- "Saved" — after successful write (fade out after 2s)
- "Save failed — click to retry" — on write error, with manual retry button

This is a UI requirement added to F3 in the PRD.

---

### 7. Image Compression

**Problem:** PRD says "compress images on upload" but specifies no method.

**Decision:** Use the `browser-image-compression` npm package. Target: max 1024px on longest edge, max 300KB, JPEG output. Apply before any Airtable upload in both the mind map node editor and the memory quick-add form.

---

### 8. Request Queue Implementation

**Problem:** PRD says "implement request queuing" but leaves implementation undefined.

**Decision:** Use the `p-queue` npm package in `/lib/airtable.ts`:
```ts
import PQueue from 'p-queue';
const queue = new PQueue({ intervalCap: 5, interval: 1000 });
```
All Airtable SDK calls are wrapped in `queue.add(() => ...)`. This is specified in F4.

---

### 9. `/shared/[shareId]` Route in V1

**Problem:** Route structure diagram shows the shared trip route under "public" routes in V1, but F9 (Sharing) is a V2 feature.

**Decision:** Keep the route in the architecture diagram but annotate it as "(V2)". The route is scaffolded with a placeholder in V1 to keep the architecture clean, but the feature is not implemented until Slice 7.

---

### 10. Testing Strategy

**Problem:** PRD is completely silent on testing.

**Decision:** No automated tests in V1. Each slice is validated manually against the Valencia seed data before being considered complete. Acceptance criteria in Section 7 serve as the test checklist. Automated testing (Playwright E2E) added in V3 if/when motivated.

---

## Files Changed

- `PRD.md` — 10 targeted improvements applied
- `CLAUDE.md` — Version number, env vars section, image proxy route added
