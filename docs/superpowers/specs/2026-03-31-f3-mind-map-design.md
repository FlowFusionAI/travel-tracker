# F3: Mind Map Canvas — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Approach:** A — React Flow with built-in hooks (`useNodesState` / `useEdgesState`)

---

## 1. Overview

F3 replaces the Mind Map tab placeholder with a fully interactive React Flow canvas. Users can create, connect, edit, and delete nodes representing activities, places, food stops, transport, accommodation, notes, day headers, and thoughts. All changes auto-save to Airtable with a 500ms debounce. The canvas is embedded in the existing trip workspace under the `MIND MAP` tab.

---

## 2. Architecture & File Structure

### 2.1 New Dependency

```
@xyflow/react   (v12 — current package name for React Flow)
```

### 2.2 File Structure

```
app/(dashboard)/trips/[id]/mindmap/
  page.tsx                    → server component: fetches nodes + edges, passes as props

components/mindmap/
  MindMapCanvas.tsx           → main canvas (client, owns useNodesState/useEdgesState)
  NodeEditPanel.tsx           → right sidebar (slides in on node select)
  TypePicker.tsx              → context menu for right-click + "+" button
  EdgePopover.tsx             → popover on edge click (label, style, colour)
  SaveStatus.tsx              → floating save status indicator (top-right)
  nodes/
    ActivityNode.tsx
    PlaceNode.tsx
    FoodNode.tsx
    TransportNode.tsx
    AccommodationNode.tsx
    NoteNode.tsx
    DayHeaderNode.tsx
    ThoughtNode.tsx
    index.ts                  → exports nodeTypes map for React Flow
```

### 2.3 Data Flow

```
page.tsx (server)
  → fetch MindMapNodes filtered by Trip ID (cache: 'no-store')
  → fetch NodeConnections filtered by Trip ID (cache: 'no-store')
  → transform to React Flow Node[] + Edge[]
  → <MindMapCanvas initialNodes={} initialEdges={} tripId={} />

MindMapCanvas (client)
  → useNodesState(initialNodes)
  → useEdgesState(initialEdges)
  → useEffect debounce (500ms) watching nodes + edges
    → diff vs last-saved snapshot
    → batch API calls to /api/airtable/MindMapNodes + /api/airtable/NodeConnections
```

### 2.4 Page Component

`page.tsx` is a server component. Ownership is already verified by `[id]/layout.tsx` — the page only needs the trip ID from params. It:
1. Reads `tripId` from `params`
2. Fetches all `MindMapNodes` where `Trip` contains `tripId` (`cache: 'no-store'`)
3. Fetches all `NodeConnections` where `Trip` contains `tripId` (`cache: 'no-store'`)
4. Transforms records into React Flow `Node[]` and `Edge[]` (mapping Airtable field names to React Flow properties)
5. Renders `<MindMapCanvas tripId={tripId} initialNodes={} initialEdges={} />`

---

## 3. Node Types

All 8 node types are custom React Flow node components. They share a common pixel aesthetic: sharp edges, `pixel-panel` border, no border-radius.

### 3.1 Visual Styles

| Type | Border colour | Icon | Notes |
|---|---|---|---|
| Activity | Blue `#3b82f6` | ⚡ | 200px wide, height auto |
| Place | Green `#22c55e` | 📍 | 200px wide, height auto |
| Food | Orange `#f97316` | 🍴 | 200px wide, height auto |
| Transport | Grey `#6b7280` | ➡ | 200px wide, height auto |
| Accommodation | Purple `#a855f7` | 🛏 | 200px wide, height auto |
| Note | Yellow `#eab308` | 📝 | 200px wide, height auto |
| Day Header | Teal `#2dd4bf` | — | 400px wide, fixed height ~48px, title only, larger bold pixel font |
| Thought | White, dashed border | 💭 | 200px wide, height auto, italic title |

### 3.2 Canvas Node Preview

Each node (except Day Header) shows:
- **Type icon** (left) + **title** (right of icon)
- **Preview hint** — the first of these that is set:
  1. First line of content (truncated to ~40 chars)
  2. Checklist progress badge (`3/5 ✓`)
  3. Tiny image thumbnail (via `/api/images` proxy)
- **`+` button** — teal circle at the bottom-centre; visible on hover (always visible on touch)

### 3.3 Handle Placement

Each node has:
- **Source handle**: right side
- **Target handle**: left side
- **`+` button**: bottom-centre (custom element, triggers TypePicker → auto-connect flow, not a React Flow handle)

Day Header nodes: handles at horizontal midpoints (left/right centre) due to wider width.

---

## 4. Canvas Interactions

| Interaction | Result |
|---|---|
| Right-click blank canvas | `TypePicker` context menu at cursor position |
| Pick type (right-click) | Node created at cursor, selected, `NodeEditPanel` opens |
| Click `+` on a node | `TypePicker` appears near the `+` button |
| Pick type (from `+`) | New node created 250px to the right of source (same vertical position); edge auto-created connecting source → new |
| Click a node | Node selected → `NodeEditPanel` slides in from right |
| Click blank canvas | Deselects node → `NodeEditPanel` slides out |
| Press Escape | Deselects node → `NodeEditPanel` slides out |
| Drag a node | Moves freely on canvas |
| Drag handle → handle | Creates an edge (React Flow default) |
| Click an edge | `EdgePopover` appears mid-edge |
| Select edge + Backspace/Delete | Deletes edge |

### 4.1 TypePicker

A small pixel-panel grid of 8 node type options (icon + label). Appears at cursor position. Dismissed by clicking outside or pressing Escape.

---

## 5. Node Edit Panel

A right sidebar (~360px wide) that slides in from the right (`translateX` + `opacity` CSS transition, ~200ms) when a node is selected. Slides out on deselect.

### 5.1 Panel Layout

```
┌─────────────────────────────────────┐
│ [type icon] [Type badge]   [✕ close]│  pixel header, border-bottom
│ [colour dot] [type name]            │
├─────────────────────────────────────┤
│ TITLE                               │
│ [____________________________]      │  plain text input
├─────────────────────────────────────┤
│ CONTENT              [✏ EDIT]       │
│ ┌──────────────────────────────┐   │  rendered markdown (default)
│ │  rendered markdown preview   │   │
│ └──────────────────────────────┘   │
│  → slide-open split pane on EDIT    │
├─────────────────────────────────────┤
│ IMAGES                              │
│ [thumb] [thumb] [+ add]            │  thumbnails via /api/images
├─────────────────────────────────────┤
│ LINKS                               │
│ [label — url]  [✕]                 │
│ [+ add link]                       │
├─────────────────────────────────────┤
│ CHECKLIST                           │
│ ☑ Pack passport      [✕]           │
│ ☐ Book taxi          [✕]           │
│ [+ add item]                       │
├─────────────────────────────────────┤
│ [🗑 DELETE NODE]   red, bottom      │
└─────────────────────────────────────┘
```

### 5.2 Content / Markdown Editor

- **Default state:** rendered markdown in a styled box
- **`✏ EDIT` button:** split pane slides open (`max-height` animation): left = raw textarea, right = live preview
- **`✓ DONE` button** (replaces EDIT when open): collapses split pane back to preview-only
- Stored as raw markdown string in Airtable `Content` field

### 5.3 Images

- Upload: `browser-image-compression` → `POST /api/airtable/upload` → stored in `Images` attachment field on the node record
- Display: `/api/images?recordId=&table=MindMapNodes&field=Images` proxy
- Remove: PATCH to clear the attachment

### 5.4 Links

Stored as JSON in Airtable `Links` field: `Array<{ url: string; label: string }>`. Edited as a list with add/remove rows in the panel.

### 5.5 Checklist

Stored as JSON in Airtable `Checklist` field: `Array<{ text: string; checked: boolean }>`. Rendered as interactive checkboxes in the panel. Check/uncheck triggers auto-save.

### 5.6 State Model

The panel is stateless — it receives the selected node's `data` object and calls an `onUpdate(nodeId, data)` callback which updates the node in `useNodesState`, triggering the debounce auto-save.

---

## 6. Auto-Save & Persistence

### 6.1 Debounce Strategy

- Any change to nodes or edges marks the canvas as "dirty" and resets a 500ms debounce timer
- On timer fire, a diff is computed against the last-saved snapshot
- Only changed/new/deleted records are synced — no full re-write on every save

### 6.2 Diff Types & API Calls

| Change | API call |
|---|---|
| Node created | `POST /api/airtable/MindMapNodes` |
| Node updated | `PATCH /api/airtable/MindMapNodes` |
| Node deleted | `DELETE /api/airtable/MindMapNodes` |
| Edge created | `POST /api/airtable/NodeConnections` |
| Edge updated | `PATCH /api/airtable/NodeConnections` |
| Edge deleted | `DELETE /api/airtable/NodeConnections` |

All calls go through the existing p-queue rate limiter in `/lib/airtable.ts` (5 req/s).

### 6.3 Temporary IDs

New nodes are assigned a temporary `tmp_<uuid>` ID before the POST returns. The canvas swaps the temp ID for the real Airtable record ID on POST success. Edges referencing a temp node ID are queued until that node's POST resolves.

### 6.4 Save Status Indicator (`SaveStatus.tsx`)

Floating top-right of the canvas:

| State | Display |
|---|---|
| Clean | Hidden |
| Debounce window or write in-flight | `SAVING…` with blinking pixel cursor |
| All writes resolved | `SAVED ✓` (fades after 2s) |
| Any write errored | `SAVE FAILED — CLICK TO RETRY` (red, clickable, retries full diff) |

---

## 7. Edge Editing

### 7.1 Default Appearance

Solid teal line (`#2dd4bf`), 2px stroke, small directional arrow at target end.

### 7.2 EdgePopover

Clicking an edge opens a compact pixel-panel popover mid-edge:

```
┌─────────────────────────────────┐
│  LABEL  [________________]      │  text input; renders along edge midpoint if set
├─────────────────────────────────┤
│  STYLE  [● Solid] [-- Dashed] [·· Dotted]
├─────────────────────────────────┤
│  COLOUR  [○][○][○][○][○]        │  5 presets: teal / blue / amber / red / white
├─────────────────────────────────┤
│  [🗑 DELETE]                    │
└─────────────────────────────────┘
```

- Dismissed on click-outside or Escape
- Changes are optimistic (immediate canvas update) and saved via the same debounce

### 7.3 Edge Deletion

Via the `DELETE` button in EdgePopover, or by selecting the edge and pressing `Backspace` / `Delete`.

---

## 8. Canvas Controls

Provided by `@xyflow/react` built-ins:
- **MiniMap** — bottom-left corner, node colours reflected
- **Controls** — zoom in/out/fit, bottom-left above minimap
- **Background** — dot-grid pattern (`#0d9488` dots, 24px spacing) matching the existing placeholder

---

## 9. Design System Notes

All components follow the JRPG pixel aesthetic:
- `pixel-panel` CSS class for borders/shadows
- `Press Start 2P` (`var(--font-pixel)`) for headings and labels — used sparingly
- Teal `#2dd4bf` primary accent; node type colours as accents per type
- No border-radius; 2px pixel box-shadows
- Pixel-push click effect: `translateY(2px)` + shadow shrinks on interactive elements
- Dark background `#0a0f14`, dark panel background `#0a0f14` with `#0d1420` sections

---

## 10. Out of Scope for F3

- Undo / redo
- Node resize handles (nodes have a fixed default size; position is free)
- Copy / paste nodes
- Multi-select
- Keyboard shortcuts beyond Backspace/Delete for edge deletion and Escape to deselect
- Itinerary drag-from-canvas (F6 feature)