# F2: Trip Workspaces — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Approach:** B — Full F2 as specced (trip list + workspace shell + create/edit form + cover image upload)

---

## 1. Overview

F2 adds two main experiences to the app:

1. **Trip List** (`/trips`) — a browsable magazine-style grid of all the user's trips with filtering and sorting
2. **Trip Workspace** (`/trips/[id]`) — a tabbed workspace for an individual trip, with a hero header and four tabs (Mind Map placeholder, Itinerary placeholder, Memories placeholder, Info/edit)

It also introduces the create/edit trip form (all PRD fields) and a cover image upload pipeline.

---

## 2. Architecture

### 2.1 New Routes

```
/app/(dashboard)/trips/
  page.tsx                        → Trip list (server component)
  new/
    page.tsx                      → Create trip form (client)
  [id]/
    page.tsx                      → Redirects to /trips/[id]/mindmap
    layout.tsx                    → WorkspaceShell (hero strip + tab bar)
    mindmap/
      page.tsx                    → Placeholder canvas (pixel art empty state)
    itinerary/
      page.tsx                    → Empty state placeholder
    memories/
      page.tsx                    → Empty state placeholder
    info/
      page.tsx                    → Full trip edit form
```

### 2.2 New API Route

```
/app/api/airtable/upload/route.ts
```

Accepts `multipart/form-data` with fields:
- `file` — the image binary
- `recordId` — Airtable record ID to attach to
- `table` — table name (e.g. `Trips`)
- `field` — field name (e.g. `Cover Image`)

Calls the Airtable Attachments API to upload the file to the specified record/field. Returns `{ url }` of the new attachment (proxied via `/api/images`).

### 2.3 New Components

```
/components/trips/
  TripCard.tsx           → Featured and small card variants
  TripGrid.tsx           → Magazine layout, client-side filter/sort logic
  TripFilters.tsx        → Filter chips + sort dropdown
  TripForm.tsx           → Shared create/edit form (all PRD fields)
  CoverImageUpload.tsx   → File picker, compression, upload, preview
  WorkspaceShell.tsx     → Hero strip + tab bar (used in [id]/layout.tsx)
```

### 2.4 Layout Strategy

The existing `(dashboard)/layout.tsx` wraps all pages in `h-screen w-screen overflow-hidden`. This is correct for the map. Trip pages that need to scroll (list page, Info tab) use `h-full overflow-y-auto` on their inner container — scrolling is scoped within the bounded area. No changes to the dashboard layout are needed.

---

## 3. Trip List Page (`/trips`)

### 3.1 Data Fetching

Server component. Fetches in parallel:
- All trips for `session.user.id` — `cache: 'no-store'`
- All countries — `{ next: { revalidate: 3600 } }` (for country filter dropdown)

Passes both to `<TripGrid>` as props.

### 3.2 Magazine Layout (`TripGrid`)

Client component. Holds filter/sort state locally.

**Default sort:** Start Date descending.

**Layout rule:**
- First trip in the sorted+filtered result → **featured card** (full width, tall)
- Remaining trips → **small cards** in a 2-column grid

**Empty state:** When no trips match filters (or no trips exist): pixel-art panel reading `NO TRIPS YET` with a `+ ADD YOUR FIRST TRIP →` button linking to `/trips/new`.

### 3.3 TripCard

**Featured variant:**
- Full width, ~220px cover image height (via `/api/images?recordId=&table=Trips&field=Cover Image`, or a teal/dark gradient placeholder if no image)
- Overlaid bottom gradient bar: trip name (pixel font), flag emoji + country name, date range, status badge, star rating
- Click → navigates to `/trips/[id]/mindmap`
- Hover: pixel-push effect (translateY 2px, shadow shrinks)
- Border: teal `pixel-panel` style; hover brightens border

**Small variant:**
- ~120px cover image
- Below image: trip name, flag + country, date range, status badge
- Same hover/click behaviour

**Status badge colours** (consistent with existing `CountrySidebar`):
- Completed → teal
- Planned → amber
- In Progress → blue
- Wishlist → violet

### 3.4 Filters (`TripFilters`)

Filter chips row above the grid:

| Filter | UI | Values |
|---|---|---|
| Status | Chip group | All / Completed / Planned / In Progress / Wishlist |
| Country | Dropdown | Derived from fetched countries list |
| Year | Dropdown | Derived from trip start dates |
| Trip Type | Dropdown | Solo / Group / Couple / Family / Work |
| Category | Multi-select dropdown | Culture / Adventure / Food / Relaxation / Festival / City Break |

Sort dropdown (right side): Date ↓ (default), Date ↑, Rating ↓, Recently Modified.

All filtering and sorting is client-side — no Airtable round-trips on filter change. Appropriate for a personal collection (~50 trips max).

Active filters are highlighted teal. A `CLEAR` button appears when any non-default filter is active.

**`+ NEW TRIP` button:** top-right of the filter row, links to `/trips/new`.

---

## 4. Trip Workspace (`/trips/[id]`)

### 4.1 Default Redirect

`/trips/[id]/page.tsx` calls `redirect('/trips/' + id + '/mindmap')`.

### 4.2 WorkspaceShell (`[id]/layout.tsx`)

Server component: fetches the trip by ID (`cache: 'no-store'`). If not found or not owned by the session user, 404.

Renders `<WorkspaceShell trip={trip}>` (client component for active-tab detection).

**Hero strip (~60px tall):**
- Background: blurred cover image as CSS `background-image` if present; dark gradient (`#0d1420 → #0a0f14`) if no image
- Left: `← TRIPS` back link (navigates to `/trips`), trip name in pixel font, flag emoji + country, date range, status badge, star rating
- Right: `EDIT` button → links to `/trips/[id]/info` (no separate edit route; Info tab is the edit surface)

**Tab bar (below hero):**
- Tabs: `MIND MAP` | `ITINERARY` | `MEMORIES` | `INFO`
- Each tab is a `<Link>` to its sub-route
- Active tab: teal text + 2px teal underline border (matching the map nav pill style)
- Pixel font, same sizing as nav pill

**Content area:**
- `{children}` in a `flex-1 overflow-hidden` container
- Each tab page manages its own scroll/overflow

### 4.3 Tab Pages

**MIND MAP (`/mindmap`):**
Pixel-art placeholder. Dark background with a subtle dot-grid pattern. Centred content:
```
[ pixel icon of a node graph ]
MIND MAP CANVAS
COMING IN F3
█  ← blinking cursor
```
Teal border pixel-panel. No interactive elements.

**ITINERARY (`/itinerary`):**
Simple empty state: `ITINERARY MODE` heading, `FEATURE COMING SOON` subtext. Amber pixel-panel styling.

**MEMORIES (`/memories`):**
Simple empty state: `MEMORIES` heading, `FEATURE COMING SOON` subtext. Violet pixel-panel styling.

**INFO (`/info`):**
Renders `<TripForm>` pre-populated with the trip's current field values. Save calls PATCH on `/api/airtable/Trips`. Shows a `SAVED ✓` flash on success; `SAVE FAILED` with a retry button on error.

---

## 5. Trip Form (`TripForm`)

Shared between `/trips/new` (create) and `/trips/[id]/info` (edit).

### 5.1 Fields

| Field | Input type | Required | Notes |
|---|---|---|---|
| Name | Text input | Yes | |
| Status | Select chips | Yes | Completed / Planned / In Progress / Wishlist |
| Start Date | Date input | No | |
| End Date | Date input | No | |
| Trip Type | Select chips | No | Solo / Group / Couple / Family / Work |
| Category | Multi-select chips | No | Culture / Adventure / Food / Relaxation / Festival / City Break |
| Country | Multi-select dropdown | No | Fetched from Countries table |
| Cities | Multi-select dropdown | No | Filtered to cities linked to selected countries |
| Summary | Textarea | No | |
| Rating | Star picker (1–5) | No | Click to set; click active star to clear |
| Budget Spent | Number input | No | Prefixed with £ |
| Cover Image | CoverImageUpload | No | See Section 6 |

### 5.2 Behaviour

- Submit button disabled until Name + Status are filled
- **Create flow** (`/trips/new`): POST to `/api/airtable/Trips` with `User` set to `session.user.id`. On success, redirect to `/trips/[id]/mindmap`.
- **Edit flow** (`/trips/[id]/info`): PATCH to `/api/airtable/Trips` with the record ID. On success, show inline `SAVED ✓` flash (fades after 2s). No redirect.
- Country → Cities dependency: all cities are pre-fetched once at form mount (`revalidate: 3600`). When Country selection changes, the Cities dropdown filters client-side to only show cities whose `Country` linked record ID matches one of the selected countries. If no countries are selected, all cities are shown.

---

## 6. Cover Image Upload (`CoverImageUpload`)

### 6.1 Component

- Drag-and-drop zone + click-to-browse file input (`accept="image/*"`)
- On file selected:
  1. Compress via `browser-image-compression`: max 1024px longest edge, max 300KB, JPEG output
  2. Show local preview (object URL) immediately
  3. POST compressed file to `/api/airtable/upload?recordId=&table=Trips&field=Cover Image` as `multipart/form-data`
  4. On success: replace preview src with `/api/images?recordId=&table=Trips&field=Cover Image` (proxied)
  5. On error: show error message + retry button
- If a cover image already exists (edit mode): show current image via `/api/images` proxy with an `✕` remove button (sets field to empty via PATCH)
- Upload state: shows a loading indicator over the preview during upload

### 6.2 `/api/airtable/upload` Route

- Parses `multipart/form-data` using the Web Streams API (no extra dependency; Next.js 16 supports `request.formData()`)
- Reads `recordId`, `table`, `field` from query params
- Sends a PATCH to the Airtable REST API with `{ fields: { [field]: [{ url: <data URI or upload URL> }] } }`
- Uses Airtable's Content Upload API: `POST https://content.airtable.com/v0/{baseId}/{recordId}/{fieldId}/uploadAttachment` with the file buffer as the request body and appropriate `Content-Type` header. This is the correct binary upload path — the standard REST API only accepts public URLs, not binary or data URIs.
- Returns `{ success: true }` or `{ error: string }`

---

## 7. Data Flow Summary

```
/trips (server)
  → fetch Trips (no-store) + Countries (revalidate:3600)
  → <TripGrid trips={} countries={} />  [client]
    → filter/sort in-browser
    → <TripCard> × N

/trips/new (client form)
  → POST /api/airtable/Trips → redirect /trips/[id]/mindmap

/trips/[id]/layout (server)
  → fetch Trip by ID
  → <WorkspaceShell trip={}>
    → hero strip + tab bar
    → {children}

/trips/[id]/info (client form, pre-populated)
  → PATCH /api/airtable/Trips

cover image upload
  → browser-image-compression
  → POST /api/airtable/upload
  → Airtable Attachments API
```

---

## 8. Design System Notes

All new components follow the existing JRPG pixel aesthetic:
- `pixel-panel` CSS class for card borders/shadows
- `Press Start 2P` font (`var(--font-pixel)`) for headings, labels, badges — sparingly
- Teal (`#0d9488`) as primary accent; amber for Planned; violet for Wishlist; blue for In Progress
- No border-radius; 2px pixel box-shadows
- Pixel-push click effect: `translateY(2px)` + shadow shrinks
- Dark background `#0a0f14`, slate tones for secondary text

---

## 9. Out of Scope for F2

- F3 Mind Map canvas (React Flow) — the Mind Map tab is a placeholder only
- Memories feed — Memories tab is a placeholder only
- Itinerary mode — Itinerary tab is a placeholder only
- Trip sharing (F9)
- Deleting trips (can be added later; delete via Airtable directly for now)