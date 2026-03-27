# Slice 1 — Airtable Integration Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the typed Airtable client, generic CRUD API routes, and image proxy that all subsequent slices depend on.

**Architecture:** A p-queue-rate-limited Airtable client in `/lib/airtable.ts` wraps the Airtable SDK and serialises records to plain objects. Two Next.js route handlers expose CRUD operations and a CDN-URL proxy. TypeScript interfaces in `/lib/types/airtable.ts` type all seven table schemas using Airtable's exact field names. Every subsequent slice reads and writes Airtable exclusively through these layers.

**Tech Stack:** Next.js 16.x route handlers (Node.js runtime), Airtable JS SDK, p-queue@7 (CJS-compatible)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `.env.local` | Create (manually) | Secrets — gitignored, never committed |
| `lib/types/airtable.ts` | Create | TypeScript interfaces for all 7 Airtable tables |
| `lib/airtable.ts` | Create | Airtable SDK client + p-queue rate limiter + serialiser |
| `app/api/airtable/[table]/route.ts` | Create | GET / POST / PATCH / DELETE for any valid table |
| `app/api/images/route.ts` | Create | Image proxy — fetches fresh Airtable signed URL, redirects |

---

## Before You Start

Per project workflow: ask the user whether to work on the current branch (`init/claude_code`) or create a new branch (e.g. `feat/slice-1-airtable`).

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1.1: Install Airtable SDK and rate limiter**

```bash
npm install airtable p-queue@7
```

Expected: `added N packages` with no errors. `p-queue@7` is used because it is CJS-compatible with Next.js without additional transpile config.

- [ ] **Step 1.2: Verify TypeScript build still compiles**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 1.3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install airtable sdk and p-queue"
```

---

### Task 2: Set up environment variables

**Files:**
- Create: `.env.local`

- [ ] **Step 2.1: Create .env.local**

`.env.local` is already listed in `.gitignore`. Create it at the project root:

```
AIRTABLE_API_KEY=your_personal_access_token_here
AIRTABLE_BASE_ID=your_base_id_here
DEFAULT_USER_ID=your_airtable_user_record_id_here
```

Where to find each value:
- **`AIRTABLE_API_KEY`** → airtable.com → Account → Personal access tokens → Create a token with scopes: `data.records:read`, `data.records:write`, `schema.bases:read` on your base.
- **`AIRTABLE_BASE_ID`** → Open your Airtable base → Help → API documentation. The base ID starts with `app` and is in the URL and the docs page header.
- **`DEFAULT_USER_ID`** → After creating a record for yourself in the Users table in Airtable, copy the record ID (starts with `rec`). If you haven't created the Users table yet, set this to a placeholder and come back to it.

Note: `DEFAULT_USER_ID` is used in Slices 2–6 wherever page-level queries need to scope data to the single V1 user. The integration layer itself is generic — later slices pass `filterByFormula=AND({User}="{process.env.DEFAULT_USER_ID}", ...)` to the `listRecords` helper.

- [ ] **Step 2.2: Restart dev server and confirm no env errors**

```bash
npm run dev
```

Expected: server starts on `http://localhost:3000`. No errors about missing environment variables in the terminal.

---

### Task 3: TypeScript types for all Airtable tables

**Files:**
- Create: `lib/types/airtable.ts`

- [ ] **Step 3.1: Create the lib/types directory**

```bash
mkdir -p lib/types
```

- [ ] **Step 3.2: Write the type definitions**

Create `lib/types/airtable.ts`:

```typescript
/**
 * Type definitions for all Airtable tables.
 *
 * Field names match Airtable exactly (including spaces and capitalisation)
 * so these types can be used directly with the SDK's raw FieldSet.
 *
 * IMPORTANT: AirtableAttachment.url is a signed URL that expires in ~2 hours.
 * Never render it directly in a component. Always go via /api/images.
 */

export interface AirtableAttachment {
  id: string
  url: string          // expires — use /api/images proxy, not this directly
  filename: string
  size: number
  type: string
  width?: number
  height?: number
  thumbnails?: {
    small?: { url: string; width: number; height: number }
    large?: { url: string; width: number; height: number }
  }
}

// Union of all valid table names. Must match Airtable base exactly.
export type TableName =
  | 'Trips'
  | 'Countries'
  | 'Cities'
  | 'MindMapNodes'
  | 'NodeConnections'
  | 'Memories'
  | 'Users'

// ─── Enum-like types ─────────────────────────────────────────────────────────

export type TripStatus = 'Completed' | 'Planned' | 'Wishlist' | 'In Progress'
export type TripType = 'Solo' | 'Group' | 'Couple' | 'Family' | 'Work'
export type TripCategory =
  | 'Culture'
  | 'Adventure'
  | 'Food'
  | 'Relaxation'
  | 'Festival'
  | 'City Break'
export type Continent =
  | 'Europe'
  | 'Asia'
  | 'Africa'
  | 'North America'
  | 'South America'
  | 'Oceania'
  | 'Antarctica'
export type NodeType =
  | 'Activity'
  | 'Place'
  | 'Food'
  | 'Transport'
  | 'Accommodation'
  | 'Note'
  | 'Day Header'
  | 'Thought'
export type EdgeStyle = 'Solid' | 'Dashed' | 'Dotted'
export type MemoryTag = 'Food' | 'Funny' | 'Scenic' | 'People' | 'Mishap' | 'Highlight'

// ─── Table field shapes ───────────────────────────────────────────────────────
// These describe the raw fields returned by the Airtable SDK.
// Optional fields may be absent if not set in Airtable.

export interface TripFields {
  Name: string
  Country?: string[]
  Cities?: string[]
  'Start Date'?: string
  'End Date'?: string
  'Trip Type'?: TripType
  Category?: TripCategory[]
  Status: TripStatus
  'Cover Image'?: AirtableAttachment[]
  Summary?: string
  Rating?: number
  'Budget Spent'?: number
  Nodes?: string[]
  Memories?: string[]
  User?: string[]
}

export interface CountryFields {
  Name: string
  'ISO Code': string
  Continent?: Continent
  'Flag Emoji'?: string
  'Times Visited': number
  'First Visited'?: string
  Trips?: string[]
  Cities?: string[]
}

export interface CityFields {
  Name: string
  Country?: string[]
  Latitude?: number
  Longitude?: number
  'Times Visited': number
  Trips?: string[]
  Rating?: number
  Notes?: string
  Memories?: string[]
}

export interface MindMapNodeFields {
  Title: string
  Content?: string
  Trip?: string[]
  'Node Type'?: NodeType
  'Position X'?: number
  'Position Y'?: number
  Width?: number
  Height?: number
  Colour?: string
  Images?: AirtableAttachment[]
  Links?: string       // JSON: Array<{ url: string; label: string }>
  'Day Number'?: number
  Time?: string
  Checklist?: string   // JSON: Array<{ text: string; checked: boolean }>
  'Connections Out'?: string[]
  'Connections In'?: string[]
  User?: string[]
}

export interface NodeConnectionFields {
  'Source Node'?: string[]
  'Target Node'?: string[]
  Trip?: string[]
  Label?: string
  Style?: EdgeStyle
  Colour?: string
}

export interface MemoryFields {
  Text?: string
  Photos?: AirtableAttachment[]
  Trip?: string[]
  City?: string[]
  Date?: string
  Tags?: MemoryTag[]
  User?: string[]
}

export interface UserFields {
  Name?: string
  Email?: string
  'Auth Provider ID'?: string
  'Avatar URL'?: string
  Trips?: string[]
}
```

- [ ] **Step 3.3: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3.4: Commit**

```bash
git add lib/types/airtable.ts
git commit -m "feat: add TypeScript types for all Airtable tables"
```

---

### Task 4: Airtable client with rate limiter

**Files:**
- Create: `lib/airtable.ts`

- [ ] **Step 4.1: Write the Airtable client**

Create `lib/airtable.ts`:

```typescript
import Airtable from 'airtable'
import PQueue from 'p-queue'
import type { TableName } from './types/airtable'

if (!process.env.AIRTABLE_API_KEY) {
  throw new Error('AIRTABLE_API_KEY is not set in .env.local')
}
if (!process.env.AIRTABLE_BASE_ID) {
  throw new Error('AIRTABLE_BASE_ID is not set in .env.local')
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
)

// 5 requests per second — Airtable's documented rate limit
const queue = new PQueue({ intervalCap: 5, interval: 1000 })

// Convert an Airtable SDK record object to a plain serialisable object.
// The SDK returns class instances; JSON.stringify won't include methods.
function serialise(record: {
  id: string
  fields: Record<string, unknown>
}): Record<string, unknown> {
  return { id: record.id, ...record.fields }
}

/**
 * Fetch all records from a table, optionally filtered.
 * filterByFormula follows Airtable formula syntax, e.g.
 *   AND({Status}="Completed", {User}="recXXXXXXXXXXXXXX")
 */
export async function listRecords(
  tableName: TableName,
  filterByFormula?: string
): Promise<Record<string, unknown>[]> {
  const records = await queue.add(() =>
    base(tableName)
      .select({ ...(filterByFormula ? { filterByFormula } : {}) })
      .all()
  )
  return (records ?? []).map(serialise)
}

/**
 * Fetch a single record by its Airtable record ID (starts with "rec").
 */
export async function getRecord(
  tableName: TableName,
  recordId: string
): Promise<Record<string, unknown>> {
  const record = await queue.add(() => base(tableName).find(recordId))
  if (!record) {
    throw new Error(`Record ${recordId} not found in ${tableName}`)
  }
  return serialise(record as { id: string; fields: Record<string, unknown> })
}

/**
 * Create a new record. Returns the created record with its generated ID.
 */
export async function createRecord(
  tableName: TableName,
  fields: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const record = await queue.add(() =>
    base(tableName).create(fields as Airtable.FieldSet)
  )
  if (!record) throw new Error('createRecord returned no record')
  return serialise(record as { id: string; fields: Record<string, unknown> })
}

/**
 * Update fields on an existing record. Uses Airtable's PATCH semantics:
 * only the supplied fields are changed; others are left as-is.
 */
export async function updateRecord(
  tableName: TableName,
  recordId: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const record = await queue.add(() =>
    base(tableName).update(recordId, fields as Airtable.FieldSet)
  )
  if (!record) throw new Error('updateRecord returned no record')
  return serialise(record as { id: string; fields: Record<string, unknown> })
}

/**
 * Delete a record permanently. Returns { id, deleted: true }.
 */
export async function deleteRecord(
  tableName: TableName,
  recordId: string
): Promise<{ id: string; deleted: true }> {
  await queue.add(() => base(tableName).destroy(recordId))
  return { id: recordId, deleted: true }
}
```

- [ ] **Step 4.2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no output. If you see `Cannot find module 'p-queue'`, run `npm install p-queue@7` again.

- [ ] **Step 4.3: Commit**

```bash
git add lib/airtable.ts
git commit -m "feat: add Airtable client with p-queue rate limiter"
```

---

### Task 5: Generic CRUD API route

**Files:**
- Create: `app/api/airtable/[table]/route.ts`

- [ ] **Step 5.1: Create the directory**

On Windows with bash, the square brackets need quoting:

```bash
mkdir -p "app/api/airtable/[table]"
```

- [ ] **Step 5.2: Write the route handler**

Create `app/api/airtable/[table]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
} from '@/lib/airtable'
import type { TableName } from '@/lib/types/airtable'

const VALID_TABLES: readonly TableName[] = [
  'Trips',
  'Countries',
  'Cities',
  'MindMapNodes',
  'NodeConnections',
  'Memories',
  'Users',
]

function isValidTable(name: string): name is TableName {
  return (VALID_TABLES as readonly string[]).includes(name)
}

// In Next.js 15+, route segment params are a Promise.
type RouteParams = { params: Promise<{ table: string }> }

// GET /api/airtable/[table]
//   ?id=recXXX                  → fetch single record
//   ?filterByFormula=...         → fetch all matching records (Airtable formula syntax)
//   (no params)                  → fetch all records in table
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { table } = await params
  if (!isValidTable(table)) {
    return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const record = await getRecord(table, id)
      return NextResponse.json(record)
    }

    const filterByFormula = searchParams.get('filterByFormula') ?? undefined
    const records = await listRecords(table, filterByFormula)
    return NextResponse.json(records)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/airtable/[table]
//   body: { ...fields }          → creates a new record, returns it with its ID
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { table } = await params
  if (!isValidTable(table)) {
    return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })
  }

  try {
    const fields = await req.json()
    const record = await createRecord(table, fields)
    return NextResponse.json(record, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/airtable/[table]
//   body: { id: "recXXX", ...fields }   → updates named fields, returns updated record
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { table } = await params
  if (!isValidTable(table)) {
    return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { id, ...fields } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Request body must include "id" (string)' },
        { status: 400 }
      )
    }
    const record = await updateRecord(table, id, fields)
    return NextResponse.json(record)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/airtable/[table]?id=recXXX
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { table } = await params
  if (!isValidTable(table)) {
    return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Query param "id" is required' },
        { status: 400 }
      )
    }
    const result = await deleteRecord(table, id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 5.3: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5.4: Commit**

```bash
git add "app/api/airtable/[table]/route.ts"
git commit -m "feat: add generic Airtable CRUD proxy route"
```

---

### Task 6: Image proxy route

**Files:**
- Create: `app/api/images/route.ts`

- [ ] **Step 6.1: Create the directory**

```bash
mkdir -p app/api/images
```

- [ ] **Step 6.2: Write the image proxy**

Create `app/api/images/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getRecord } from '@/lib/airtable'
import type { AirtableAttachment, TableName } from '@/lib/types/airtable'

const VALID_TABLES: readonly TableName[] = [
  'Trips',
  'Countries',
  'Cities',
  'MindMapNodes',
  'NodeConnections',
  'Memories',
  'Users',
]

/**
 * GET /api/images?recordId=recXXX&table=Trips&field=Cover+Image&index=0
 *
 * Fetches the Airtable record fresh (getting a new signed URL), then
 * 302-redirects to it. Cache-Control: no-store prevents the browser or
 * any CDN from caching the redirect — a fresh URL is fetched every time.
 *
 * Components must always use this proxy as their image src, never the raw
 * Airtable CDN URL (which expires in ~2 hours).
 *
 * Parameters:
 *   recordId  — Airtable record ID (starts with "rec")
 *   table     — one of the valid TableName values
 *   field     — exact Airtable field name, e.g. "Cover Image", "Images", "Photos"
 *   index     — (optional, default 0) which attachment in the array to return
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const recordId = searchParams.get('recordId')
  const table = searchParams.get('table') as TableName | null
  const field = searchParams.get('field')
  const indexParam = searchParams.get('index')
  const index = indexParam !== null ? parseInt(indexParam, 10) : 0

  if (!recordId || !table || !field) {
    return NextResponse.json(
      { error: 'recordId, table, and field are required query params' },
      { status: 400 }
    )
  }

  if (!(VALID_TABLES as readonly string[]).includes(table)) {
    return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })
  }

  try {
    const record = await getRecord(table, recordId)
    const attachments = record[field] as AirtableAttachment[] | undefined

    if (!attachments || attachments.length === 0) {
      return NextResponse.json(
        { error: `No attachments found in field "${field}" on record ${recordId}` },
        { status: 404 }
      )
    }

    const attachment = attachments[index] ?? attachments[0]
    const response = NextResponse.redirect(attachment.url)
    // Must not cache: the Location URL expires in ~2h.
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 6.3: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6.4: Commit**

```bash
git add app/api/images/route.ts
git commit -m "feat: add image proxy route for Airtable attachment URLs"
```

---

### Task 7: End-to-end manual verification against Valencia seed data

Prereqs before running these steps:
- `.env.local` has real values (not placeholders)
- The Valencia trip and associated seed data exists in Airtable (see PRD §10)
- Dev server is running: `npm run dev`

- [ ] **Step 7.1: List all Countries**

```bash
curl -s "http://localhost:3000/api/airtable/Countries" | python -m json.tool
```

Expected: a JSON array containing at least one record where `Name` is `"Spain"` and `ISO Code` is `"ES"`. If you see `AIRTABLE_API_KEY is not set`, check `.env.local` and restart the dev server.

- [ ] **Step 7.2: List all Cities**

```bash
curl -s "http://localhost:3000/api/airtable/Cities" | python -m json.tool
```

Expected: an array containing Valencia with `Latitude: 39.4699` and `Longitude: -0.3763`.

- [ ] **Step 7.3: List all Trips**

```bash
curl -s "http://localhost:3000/api/airtable/Trips" | python -m json.tool
```

Expected: array with the Valencia — Las Fallas 2025 trip. Copy its record ID (the `id` field, starts with `rec`) for the next steps.

- [ ] **Step 7.4: Get a single Trip by ID**

```bash
curl -s "http://localhost:3000/api/airtable/Trips?id=PASTE_TRIP_RECORD_ID" | python -m json.tool
```

Expected: the single trip object with all its fields.

- [ ] **Step 7.5: Test filterByFormula**

```bash
curl -s "http://localhost:3000/api/airtable/Trips?filterByFormula=%7BStatus%7D%3D%22Completed%22" | python -m json.tool
```

(The formula `{Status}="Completed"` URL-encoded is `%7BStatus%7D%3D%22Completed%22`.)

Expected: same array as 7.3 since the Valencia trip is Completed.

- [ ] **Step 7.6: Test POST — create a temporary record**

```bash
curl -s -X POST "http://localhost:3000/api/airtable/Countries" \
  -H "Content-Type: application/json" \
  -d '{"Name":"Test Country","ISO Code":"TC","Times Visited":0}' | python -m json.tool
```

Expected: the created record with an `id` starting with `rec`. Copy that ID.

- [ ] **Step 7.7: Test PATCH — update the temporary record**

```bash
curl -s -X PATCH "http://localhost:3000/api/airtable/Countries" \
  -H "Content-Type: application/json" \
  -d '{"id":"PASTE_RECORD_ID","Times Visited":1}' | python -m json.tool
```

Expected: the record with `"Times Visited": 1`.

- [ ] **Step 7.8: Test DELETE — remove the temporary record**

```bash
curl -s -X DELETE "http://localhost:3000/api/airtable/Countries?id=PASTE_RECORD_ID" | python -m json.tool
```

Expected: `{"id":"recXXX","deleted":true}`. Confirm the record is gone in Airtable.

- [ ] **Step 7.9: Test image proxy**

From step 7.4, if the trip has a `Cover Image` array, the first attachment's record ID is the trip's own ID:

```bash
curl -v "http://localhost:3000/api/images?recordId=PASTE_TRIP_RECORD_ID&table=Trips&field=Cover+Image" 2>&1 | grep -E "< HTTP|< Location|< Cache-Control"
```

Expected output includes:
```
< HTTP/1.1 302 Found
< Location: https://...airtable.com/...  (a long signed URL)
< Cache-Control: no-store
```

If the Valencia trip has no Cover Image, test with a MindMapNode record (field `Images`) instead.

- [ ] **Step 7.10: Test 400 on invalid table**

```bash
curl -s "http://localhost:3000/api/airtable/NotATable"
```

Expected: `{"error":"Unknown table: NotATable"}` with HTTP 400.

- [ ] **Step 7.11: Final commit**

```bash
git add .
git commit -m "feat: complete slice 1 - Airtable integration layer

All tables readable, CRUD verified, image proxy working.
Acceptance criteria from PRD §7 Slice 1 met."
```

---

## Acceptance Criteria (from PRD)

- [ ] Can fetch records from all 7 tables via `/api/airtable/[table]`
- [ ] Can create, update, and delete records via POST / PATCH / DELETE
- [ ] Image proxy at `/api/images` returns a valid 302 redirect to an Airtable attachment
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] `.env.local` is in place with real values (not committed to git)

---

## Notes for the Next Slice

Slice 2 (World Map) will need:
- `listRecords('Countries')` to colour countries by visit status
- `listRecords('Cities')` for map pin coordinates
- The Natural Earth 50m GeoJSON file downloaded to `/public/data/countries.geojson`
- `npm install leaflet react-leaflet @types/leaflet`
