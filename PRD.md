# Travel Tracker — Product Requirements Document

**Version:** 1.1
**Author:** Saurav
**Last Updated:** 27 March 2026
**Status:** Ready for implementation

---

## 1. Overview

### 1.1 What Is This?

Travel Tracker is a personal web app for logging countries and cities visited, planning future trips, and capturing travel memories through interactive mind maps rather than traditional note-taking. It combines a visual world map, trip workspaces with free-form mind map canvases, and a stats dashboard into a single tool.

### 1.2 Who Is This For?

Primarily a personal tool. Secondary users may include friends or other travellers who want their own account or view shared trip itineraries. This is not a commercial product — no monetisation, no marketing, no scale requirements beyond a handful of users.

### 1.3 Core Problem

Travel memories, itineraries, and plans are scattered across Google Maps timelines, camera rolls, notes apps, WhatsApp messages, and booking confirmation emails. There is no single place that answers: "Where have I been, what did I do there, and where do I want to go next?" — with the ability to capture the non-linear way travel experiences connect to each other.

---

## 2. Tech Stack

| Layer | Tool | Cost | Notes |
|---|---|---|---|
| Frontend | Next.js 16.x (App Router, TypeScript) | Free | Deployed on Vercel free tier |
| Styling | Tailwind CSS | Free | Dark mode from day one |
| Database | Airtable (existing subscription) | Included | Also handles file/image storage via attachment fields |
| Map | Leaflet.js + react-leaflet + OpenStreetMap tiles | Free | No API key required |
| Mind Map | React Flow | Free | Open-source, free for non-commercial use |
| Auth | NextAuth.js (Google provider) | Free | Only needed for multi-user support |
| Hosting | Vercel | Free tier | Auto-deploy from GitHub |
| Dev Tool | Claude Code | Subscription | Primary development tool |
| Version Control | GitHub | Free | Private repo |

**Total additional cost: £0**

---

## 3. Airtable Schema

### 3.1 Tables

#### Trips

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | e.g. "Valencia — Las Fallas 2025" |
| Country | Link to Countries | Can link multiple for multi-country trips |
| Cities | Link to Cities | All cities visited on this trip |
| Start Date | Date | |
| End Date | Date | |
| Trip Type | Single select | Solo, Group, Couple, Family, Work |
| Category | Multiple select | Culture, Adventure, Food, Relaxation, Festival, City Break |
| Status | Single select | Completed, Planned, Wishlist, In Progress |
| Cover Image | Attachment | Hero image for the trip card |
| Summary | Long text | Brief description or highlight |
| Rating | Rating (1-5) | Overall trip rating |
| Budget Spent | Currency (£) | Optional, total spend |
| Nodes | Link to Mind Map Nodes | All nodes belonging to this trip |
| Memories | Link to Memories | Quick-capture memories |
| User | Link to Users | Owner of this trip |
| Created | Created time | Auto |
| Last Modified | Last modified time | Auto |

#### Countries

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | e.g. "Spain" |
| ISO Code | Single line text | 2-letter code (ES) for map colouring via GeoJSON |
| Continent | Single select | Europe, Asia, Africa, North America, South America, Oceania, Antarctica |
| Flag Emoji | Single line text | 🇪🇸 |
| Times Visited | Rollup | Count from linked Trips (status = Completed) |
| First Visited | Rollup | MIN(Start Date) from linked Trips |
| Trips | Link to Trips | |
| Cities | Link to Cities | |

#### Cities

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | e.g. "Valencia" |
| Country | Link to Countries | |
| Latitude | Number | For map pin placement |
| Longitude | Number | For map pin placement |
| Times Visited | Rollup | Count from linked Trips |
| Trips | Link to Trips | |
| Rating | Rating (1-5) | Personal city rating |
| Notes | Long text | General impressions |
| Memories | Link to Memories | |

#### Mind Map Nodes

| Field | Type | Notes |
|---|---|---|
| Title | Single line text | Node label |
| Content | Long text | Detailed note, supports markdown |
| Trip | Link to Trips | Which trip this belongs to |
| Node Type | Single select | Activity, Place, Food, Transport, Accommodation, Note, Day Header, Thought |
| Position X | Number | Canvas X coordinate (React Flow) |
| Position Y | Number | Canvas Y coordinate (React Flow) |
| Width | Number | Optional, for resized nodes |
| Height | Number | Optional, for resized nodes |
| Colour | Single line text | Hex code or preset name for node styling |
| Images | Attachment | Photos attached to this node |
| Links | Long text | JSON array of URLs with labels |
| Day Number | Number | Optional, for itinerary mode ordering |
| Time | Single line text | Optional, e.g. "14:00" for itinerary slots |
| Checklist | Long text | JSON array of {text, checked} items |
| Connections Out | Link to Node Connections | Edges originating from this node |
| Connections In | Link to Node Connections | Edges pointing to this node |
| User | Link to Users | |
| Created | Created time | |

#### Node Connections (Edges)

| Field | Type | Notes |
|---|---|---|
| Source Node | Link to Mind Map Nodes | Where the edge starts |
| Target Node | Link to Mind Map Nodes | Where the edge ends |
| Trip | Link to Trips | Redundant but useful for filtering |
| Label | Single line text | Optional edge label, e.g. "then walked to" |
| Style | Single select | Solid, Dashed, Dotted |
| Colour | Single line text | Hex code |

#### Memories

| Field | Type | Notes |
|---|---|---|
| Text | Long text | Quick memory note |
| Photos | Attachment | One or more images |
| Trip | Link to Trips | |
| City | Link to Cities | |
| Date | Date | When this happened |
| Tags | Multiple select | Food, Funny, Scenic, People, Mishap, Highlight |
| User | Link to Users | |
| Created | Created time | |

#### Users

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | |
| Email | Email | Matches NextAuth provider email |
| Auth Provider ID | Single line text | Google sub ID |
| Avatar URL | URL | From Google profile |
| Joined | Created time | |
| Trips | Link to Trips | |

### 3.2 Schema Notes

- All Airtable API calls are routed through Next.js API routes — the Airtable API key is never exposed client-side.
- **Attachment URL expiry:** Airtable CDN URLs for attachments are signed and expire after ~2 hours. Components must never render Airtable attachment URLs directly. Instead, all image `src` attributes point to `/api/images?recordId=xxx&table=yyy&field=zzz`. This proxy fetches a fresh signed URL from Airtable server-side on each request. This applies to mind map node images, memory photos, and trip cover images.
- Rate limit: Airtable allows 5 requests/second. Implement request queuing using `p-queue` (`intervalCap: 5, interval: 1000`) in `/lib/airtable.ts`. All Airtable SDK calls are wrapped in `queue.add(...)`. Pair with frontend caching (ISR / SWR) to reduce call volume.
- **Next.js 16.x caching:** Unlike Next.js 13/14, fetch calls do not cache by default. Always pass explicit `{ next: { revalidate: 3600 } }` for country/city data and `{ cache: 'no-store' }` for trip data that must be fresh.
- Mind Map Nodes and Node Connections are separate tables because React Flow needs discrete node and edge data structures. Storing edges as a JSON array inside nodes would make querying and updating significantly harder.

### 3.3 Environment Variables

All secrets live in `.env.local` (gitignored). Never commit values to the repo.

| Variable | Required in | Notes |
|---|---|---|
| `AIRTABLE_API_KEY` | V1 | Personal access token from airtable.com/account |
| `AIRTABLE_BASE_ID` | V1 | Found in the Airtable API docs for your base |
| `DEFAULT_USER_ID` | V1 only | Airtable record ID for the single V1 user; removed when V2 auth ships |
| `NEXTAUTH_SECRET` | V2 | Random 32-char string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | V2 | App URL e.g. `https://travel.vercel.app` |
| `GOOGLE_CLIENT_ID` | V2 | From Google Cloud Console OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | V2 | From Google Cloud Console OAuth credentials |

---

## 4. Features — Prioritised

### 4.1 V1 — Core (MVP)

These features ship first. The app is usable after V1.

#### F1: Interactive World Map (Home Page)

- Full-screen Leaflet map with OpenStreetMap tiles
- Countries coloured by visit status:
  - **Visited** — solid fill (e.g. teal)
  - **Planned** — striped/hatched fill
  - **Wishlist** — dotted outline
- City pins placed at coordinates from Cities table
- Pin colour matches trip status
- Click a country → sidebar or modal showing: country name, flag, times visited, list of trips linked to it
- Click a city pin → popup with city name, rating, linked trips
- GeoJSON layer for country boundaries — use **Natural Earth 50m Admin 0 Countries** (`ne_50m_admin_0_countries.geojson`, ~3.8MB), stored in `/public/data/countries.geojson`, lazy-loaded via dynamic import in the Leaflet layer
- Zoom controls, current location button
- Mobile: full-screen map with bottom sheet for details

#### F2: Trip Workspaces

- Trip list page showing cards (cover image, name, dates, country flag, status badge)
- Filter by: status, country, year, trip type, category
- Sort by: date, rating, recently modified
- Create new trip → form with fields matching Trips table
- Trip detail page with tabbed sections:
  - **Mind Map** (default tab)
  - **Itinerary** (structured view)
  - **Memories** (feed view)
  - **Info** (trip metadata, edit fields)

#### F3: Mind Map Canvas

- React Flow canvas embedded in trip workspace
- Node types with distinct visual styles:
  - **Activity** — blue, rounded
  - **Place** — green, with map pin icon
  - **Food** — orange, with fork icon
  - **Transport** — grey, with arrow icon
  - **Accommodation** — purple, with bed icon
  - **Note** — yellow, sticky-note style
  - **Day Header** — large, bold, spans width
  - **Thought** — dotted border, italic text
- Add nodes: click canvas to add, or use a floating toolbar
- Edit nodes: click to open side panel with title, content (markdown), images, links, checklist
- Connect nodes: drag from handle to handle (React Flow default behaviour)
- Move and resize nodes freely
- Auto-save: debounced writes to Airtable (500ms after last change)
- Save status indicator (persistent, top-right of canvas):
  - "Saving…" — during debounce window and while write is in-flight
  - "Saved" — after successful write (fades after 2s)
  - "Save failed — click to retry" — on write error, with manual retry
- Node images are displayed via the `/api/images` proxy (never direct Airtable CDN URLs)
- Minimap in corner for navigation on large canvases
- Zoom and pan controls

#### F4: Airtable Integration Layer

- Typed Airtable client wrapper (`/lib/airtable.ts`) with `p-queue` rate limiter (5 req/s)
- Generic API routes: `/api/airtable/[table]` supporting GET, POST, PATCH, DELETE
- Image proxy route: `/api/images?recordId=xxx&table=yyy&field=zzz` — fetches fresh signed URL from Airtable and redirects; no Airtable CDN URLs reach the client directly
- Error handling with user-friendly messages
- Type definitions matching all table schemas
- Server-side data fetching with ISR where appropriate: `revalidate: 3600` for country/city data; `cache: 'no-store'` for trip data

**V1 access control:** In V1 (before NextAuth ships), all Airtable queries filter by `DEFAULT_USER_ID` env var. Enable **Vercel Password Protection** on the deployment to prevent public access. This is one toggle in the Vercel project dashboard — no code required.

#### F5: Basic Stats Dashboard

- Countries visited count + percentage of world (193 UN countries)
- Continent breakdown (visited X of 7)
- Cities visited count
- Total trips count
- Trip timeline (chronological vertical list with year markers)
- Trips by year bar chart
- Most visited country
- Visual world map (smaller version) showing coverage

### 4.2 V2 — Enhanced

These features are built after V1 is stable and usable.

#### F6: Itinerary Mode

- Day-by-day column layout within a trip workspace
- Each day is a vertical lane
- Drag mind map nodes into time slots within a day
- Nodes in itinerary mode show: time, title, location, duration
- Auto-pin itinerary locations to the trip's map view
- Print-friendly / export view for offline use

#### F7: Quick Memory Capture

- Floating "+" button on any trip page
- Opens a minimal form: text, photo upload, city selector, date, tags
- Memories appear in a chronological feed within the trip
- Also accessible from the main memories tab (across all trips)
- Instagram-story-like presentation option (photo + overlay text)

#### F8: Authentication & Multi-User

- NextAuth.js with Google as the primary provider
- All data scoped to the authenticated user
- User record created in Airtable Users table on first login
- Session-based auth with JWT
- Protected routes redirect to login

#### F9: Trip Sharing

- Generate a shareable link for any trip (read-only)
- Shared view shows: mind map (view only), itinerary, memories, trip info
- No login required to view a shared trip
- Share link can be revoked by the owner
- Optional: collaborative editing for planned trips (two users can edit the same workspace)

#### F10: Packing Lists

- Template-based packing lists stored per trip
- Default templates: Weekend City Break, Week Beach Holiday, Adventure Trip, Business Trip
- Checklist with categories (Clothes, Toiletries, Tech, Documents, Misc)
- Duplicate from template, then customise per trip
- Check items off as you pack

### 4.3 V3 — Nice to Have

Lower priority. Build if motivated.

#### F11: Advanced Stats

- Travel heatmap (months/years you travel most)
- Average trip length
- Budget tracking across trips with currency conversion
- "Travel personality" fun profile based on trip types and categories
- Year-in-review summary generator

#### F12: Location Auto-Complete

- When adding a city or place node, suggest from a geocoding API
- Auto-fill coordinates, country linking
- Use OpenStreetMap Nominatim (free, no API key)

#### F13: Import / Export

- Import trips from Google Maps Timeline (KML/JSON)
- Export trip as PDF (printable summary with map, itinerary, photos)
- Export all data as JSON backup

#### F14: PWA Support

- Installable on mobile as a Progressive Web App
- Offline access to cached trip data
- Add memories while offline, sync when back online

#### F15: AI Trip Suggestions

- Use Claude API to suggest itinerary improvements
- "What else is near this place?"
- "Suggest a day plan for [city] based on my interests"
- Only viable if API costs are negligible or via Claude Code subscription

---

## 5. Application Architecture

### 5.1 Route Structure

```
/app
├── (public)
│   ├── /                        → Landing page (if logged out) or redirect to /map
│   ├── /shared/[shareId]        → Public shared trip view (V2 — route scaffolded in V1, feature ships in Slice 7)
│   └── /login                   → NextAuth sign-in page (V2)
│
├── (dashboard)                  → Protected layout (auth required)
│   ├── /map                     → Interactive world map (home)
│   ├── /trips                   → Trip list with filters
│   ├── /trips/new               → Create new trip
│   ├── /trips/[tripId]          → Trip workspace
│   │   ├── /mindmap             → Mind map canvas (default)
│   │   ├── /itinerary           → Day-by-day itinerary view
│   │   ├── /memories            → Memory feed for this trip
│   │   └── /info                → Trip metadata and settings
│   ├── /stats                   → Travel statistics dashboard
│   ├── /memories                → All memories across trips
│   └── /settings                → User preferences
│
├── /api
│   ├── /auth/[...nextauth]      → NextAuth endpoints
│   ├── /airtable/[table]        → Generic Airtable CRUD proxy
│   ├── /airtable/upload         → Image upload to Airtable
│   ├── /images                  → Image proxy (fetches fresh Airtable signed URLs server-side)
│   └── /share/[tripId]          → Generate/manage share links (V2)
```

### 5.2 Key Components

```
/components
├── map/
│   ├── WorldMap.tsx              → Main Leaflet map with GeoJSON layer
│   ├── CountryLayer.tsx          → Country fill colours by status
│   ├── CityMarkers.tsx           → Pin layer for cities
│   ├── MapSidebar.tsx            → Country/city detail panel
│   └── MapControls.tsx           → Zoom, location, filter toggles
│
├── mindmap/
│   ├── MindMapCanvas.tsx         → React Flow wrapper
│   ├── nodes/
│   │   ├── ActivityNode.tsx
│   │   ├── PlaceNode.tsx
│   │   ├── FoodNode.tsx
│   │   ├── NoteNode.tsx
│   │   ├── DayHeaderNode.tsx
│   │   └── ...
│   ├── NodeEditor.tsx            → Side panel for editing node content
│   ├── NodeToolbar.tsx           → Floating add-node toolbar
│   └── EdgeLabel.tsx             → Custom edge label renderer
│
├── trips/
│   ├── TripCard.tsx              → Card for trip list
│   ├── TripForm.tsx              → Create/edit trip form
│   ├── TripTabs.tsx              → Tab navigation within workspace
│   └── TripFilters.tsx           → Filter bar for trip list
│
├── memories/
│   ├── MemoryFeed.tsx            → Chronological memory list
│   ├── MemoryCard.tsx            → Single memory display
│   └── MemoryQuickAdd.tsx        → Floating quick-add form
│
├── stats/
│   ├── StatsGrid.tsx             → Stat cards layout
│   ├── CountryCounter.tsx        → X/193 countries display
│   ├── TripTimeline.tsx          → Vertical chronological timeline
│   └── YearChart.tsx             → Trips per year bar chart
│
└── ui/
    ├── Layout.tsx                → Dashboard shell (nav, sidebar)
    ├── Navbar.tsx
    ├── ThemeToggle.tsx           → Dark/light mode switch
    ├── LoadingState.tsx
    └── EmptyState.tsx
```

### 5.3 Data Flow

```
User Action → Client Component → API Route (/api/airtable/[table])
                                      ↓
                              Airtable Client (/lib/airtable.ts)
                                      ↓
                              Airtable API (airtable.com)
                                      ↓
                              Response → Client State Update → UI Re-render
```

For read-heavy pages (map, stats), use Next.js Server Components with ISR to reduce Airtable API calls. For interactive pages (mind map), use client-side state with optimistic updates and debounced writes.

---

## 6. Design Principles

### 6.1 Visual Style

- Clean, minimal UI — content (maps, photos, mind maps) is the focus, not chrome
- Dark mode as the default, with light mode toggle
- Rounded corners, subtle shadows, no harsh borders
- Map-centric: the map is always one click away
- Colour palette tied to travel/geography — muted teals, warm ambers, soft greens
- Node colours on the mind map are distinct but not garish
- Typography: one sans-serif font (Inter or similar), clear hierarchy

### 6.2 Interaction Patterns

- Direct manipulation on the mind map (drag, drop, connect, resize)
- Inline editing where possible (click text to edit, no modal for simple changes)
- Auto-save everywhere — no "save" buttons
- Contextual actions (right-click or hover menus on nodes, pins, cards)
- Progressive disclosure: show summary first, expand for detail
- Mobile: swipe gestures for trip navigation, bottom sheets instead of sidebars

### 6.3 Performance

- Lazy-load map tiles and GeoJSON (Natural Earth 50m, ~3.8MB, loaded via dynamic import)
- Virtualise long lists (trip list, memory feed)
- Compress images on upload using `browser-image-compression`: max 1024px on longest edge, max 300KB, JPEG output — applied before any Airtable upload
- Debounce all Airtable writes (500ms minimum)
- Cache country and city data aggressively (changes infrequently) — `revalidate: 3600` on server components

---

## 7. Development Plan

### Phase 1: Foundation (Slices 1-2)

**Slice 1 — Airtable Integration Layer**
- Build `/lib/airtable.ts` typed client with `p-queue` rate limiter
- Build `/api/airtable/[table]` CRUD routes
- Build `/api/images` proxy route for Airtable attachment URLs
- Type definitions for all tables
- Set up `.env.local` with `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `DEFAULT_USER_ID`
- Test with seed data (Valencia trip)
- **Acceptance:** Can fetch, create, update, delete records in all tables. Image proxy returns a valid image from a Valencia node's Airtable attachment.

**Slice 2 — World Map**
- Leaflet map with OpenStreetMap tiles
- GeoJSON country boundaries with status-based colouring
- City pins from Cities table
- Click interactions (country sidebar, city popup)
- Responsive layout
- **Acceptance:** Map renders full-screen, visited countries are coloured, city pins show with popups, works on mobile.

### Phase 2: Core Experience (Slices 3-4)

**Slice 3 — Trip List & Workspace Shell**
- Trip list page with cards, filters, sort
- Create trip form
- Trip detail page with tab navigation
- Trip info/edit tab
- **Acceptance:** Can view all trips, create a new trip, navigate between tabs.

**Slice 4 — Mind Map Canvas**
- React Flow integration
- All node types with distinct styles
- Add, edit, delete, connect nodes
- Node editor side panel (text, images, links, checklist)
- Auto-save with debounced Airtable writes
- Minimap and controls
- **Acceptance:** Can build a full mind map for a trip, save and reload it, attach images and links to nodes.

### Phase 3: Polish & Features (Slices 5-7)

**Slice 5 — Stats Dashboard**
- Country count and world percentage
- Continent breakdown
- Trip timeline
- Year chart
- Most visited country
- **Acceptance:** Dashboard shows accurate aggregated data from Airtable.

**Slice 6 — Memory Capture**
- Quick-add floating button
- Memory form (text, photo, city, date, tags)
- Memory feed within trips and globally
- **Acceptance:** Can add a memory with a photo, see it in the trip feed and global feed.

**Slice 7 — Auth & Sharing**
- NextAuth with Google
- User scoping on all queries
- Share link generation for trips
- Read-only shared trip view
- **Acceptance:** Two different Google accounts see only their own data. Shared link works without login.

### Phase 4: Enhanced (Slices 8-9)

**Slice 8 — Itinerary Mode**
- Day column layout
- Drag nodes into time slots
- Itinerary locations auto-pinned to map
- **Acceptance:** Can plan a multi-day trip with timed activities per day.

**Slice 9 — Packing Lists & Extras**
- Template packing lists
- Dark/light mode polish
- Mobile interaction refinements
- PWA manifest (installable)
- **Acceptance:** Can create and check off a packing list. App installable on phone.

---

## 8. Claude Code Workflow

### 8.1 CLAUDE.md

The project root contains a `CLAUDE.md` file that Claude Code reads automatically. It contains the tech stack, Airtable config (base ID, table names), route structure, component locations, and coding conventions. Update this file as the project evolves.

### 8.2 MCP Servers

Configure in Claude Code settings:
- **Airtable MCP** — lets Claude Code inspect schema, read records, and validate queries against live data
- **Documentation MCP** (Context7 or similar) — up-to-date docs for React Flow, Leaflet, NextAuth

### 8.3 Session Pattern

Each development session follows this structure:

1. **State the slice and acceptance criteria** — "We're building Slice 4. Acceptance: can build a full mind map for a trip, save and reload it."
2. **Build incrementally** — work through the slice in logical order (data layer → components → page → integration)
3. **Test against real data** — use the Valencia seed data in Airtable; the acceptance criteria in Section 7 serve as the manual test checklist
4. **Review** — "Review Slice 4 code for TypeScript errors, missing error handling, and mobile responsiveness"
5. **Compact** — run `/compact` before starting the next slice
6. **Start new session for new slices** — don't chain everything in one conversation

**Testing strategy:** No automated tests in V1. Each slice is validated manually against the Valencia seed data before being considered complete. Playwright E2E tests can be added in V3 if motivated.

### 8.4 Key Commands

- `/init` — generate initial CLAUDE.md
- `/compact` — compress context between slices
- `claude --resume` — continue from last session
- Use `--verbose` during Airtable integration to inspect API calls

---

## 9. Constraints & Risks

| Risk | Mitigation |
|---|---|
| Airtable 5 req/s rate limit | `p-queue` rate limiter in `/lib/airtable.ts`, aggressive caching, ISR |
| Airtable attachment URLs expire (~2h) | Image proxy route `/api/images` fetches fresh signed URLs server-side; never use CDN URLs client-side |
| Airtable attachment storage limit | `browser-image-compression` before upload (max 300KB), monitor usage |
| V1 app publicly accessible before auth | Enable Vercel Password Protection (dashboard toggle); scope all queries to `DEFAULT_USER_ID` env var |
| React Flow performance with large mind maps | Virtualise nodes outside viewport, limit visible connections |
| GeoJSON file size (country boundaries) | Natural Earth 50m (~3.8MB), lazy-loaded, stored in `/public/data/` |
| Vercel free tier limits (100GB bandwidth) | Image optimisation, CDN caching |
| Mind map auto-save conflicts | Debounce writes, last-write-wins (single user per trip in V1); save status indicator shows failure |
| Mobile mind map UX | Touch-optimised controls, larger hit targets, consider simplified mobile view |

---

## 10. Seed Data

Populate Airtable with one completed trip before starting development:

**Trip:** Valencia — Las Fallas 2025
**Country:** Spain (ES, Europe)
**City:** Valencia (39.4699, -0.3763)
**Status:** Completed
**Type:** Solo
**Category:** Culture, Festival, City Break
**Dates:** 11-14 March 2025

**Sample Nodes:**
- Day Header: "Day 1 — Arrival & Ruzafa"
- Accommodation: "Colo Colo Hostel — Ruzafa/L'Eixample"
- Activity: "Mascleta — Plaza del Ayuntamiento"
- Place: "La Lonja de la Seda"
- Note: "Metro driver strike — switched to taxi for airport"
- Activity: "Fireworks — Turia Gardens bridges"
- Thought: "No alcohol, no seafood — still ate incredibly well"

This seed data validates the full pipeline from Airtable to UI before any feature is built beyond the integration layer.

---

## 11. Success Criteria

The project is "done" when:

1. Every country and city visited is logged and visible on the map
2. Each trip has a mind map that captures the experience non-linearly
3. Quick memories can be added in under 30 seconds
4. Stats dashboard accurately reflects all travel history
5. A friend can view a shared trip link without logging in
6. The app works well on mobile (used while travelling)
7. Adding a new trip takes less than 2 minutes
8. The whole thing runs at zero additional cost