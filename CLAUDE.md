# Travel Tracker

## Stack
- Next.js 16.x (App Router, TypeScript) — note: Next.js 15+ requires explicit cache options on fetch calls
- Airtable (database + file storage)
- Leaflet.js + react-leaflet (map)
- React Flow (mind map canvas)
- Tailwind CSS (styling)
- NextAuth.js (auth, Google provider) — V2 only

## Airtable Config
- Base ID: `AIRTABLE_BASE_ID` env var (set in `.env.local`)
- Tables: Trips, Countries, Cities, MindMapNodes, NodeConnections, Memories, Users
- API calls go through /api/ routes, never client-side
- Rate limit: 5 req/s — all calls go through `p-queue` in `/lib/airtable.ts`
- Cache responses where possible: `{ next: { revalidate: 3600 } }` for country/city data; `{ cache: 'no-store' }` for trip data
- **Attachment URLs expire (~2h)** — never use Airtable CDN URLs in components; always use the `/api/images` proxy instead

## Environment Variables
```
AIRTABLE_API_KEY          # Airtable personal access token
AIRTABLE_BASE_ID          # Target Airtable base ID
DEFAULT_USER_ID           # V1 only: Airtable record ID for single user; replaced by session in V2
NEXTAUTH_SECRET           # V2: random 32-char secret
NEXTAUTH_URL              # V2: app URL e.g. https://travel.vercel.app
GOOGLE_CLIENT_ID          # V2: Google OAuth
GOOGLE_CLIENT_SECRET      # V2: Google OAuth
```

## Architecture
- /app/(dashboard)/map — main world map view
- /app/(dashboard)/trips/[id] — trip workspace with mind map
- /app/(dashboard)/stats — travel statistics
- /app/api/airtable/[table] — generic Airtable CRUD proxy
- /app/api/images — image proxy (fetches fresh Airtable signed URLs server-side)
- /app/api/airtable/upload — image upload to Airtable
- /lib/airtable.ts — Airtable client wrapper with p-queue rate limiter
- /components/map/ — Leaflet map components
- /components/mindmap/ — React Flow canvas components
- /public/data/countries.geojson — Natural Earth 50m country boundaries (~3.8MB)

## Conventions
- Use server components by default, client components only when needed
- All Airtable reads go through server components or API routes
- Airtable writes go through API routes (POST/PATCH/DELETE)
- Use Tailwind only, no CSS modules
- Mobile-responsive, dark mode support from day one
- Images always rendered via `/api/images` proxy, never direct Airtable CDN URLs
- Compress images before upload: `browser-image-compression`, max 1024px, max 300KB

## V1 Access Control
- No auth in V1. Use Vercel Password Protection (dashboard toggle) to prevent public access.
- All Airtable queries filter by `DEFAULT_USER_ID` env var (swapped for session user ID in V2).

## Workflow
- Every new task you get you will need to ask the user if they want to implement in the same branch or create a new branch
- After finishing the task, ask the user if they want to open a PR on github. if yes, push the changes and open a PR.
- You can and should use subagents when you think it is best to do so.
