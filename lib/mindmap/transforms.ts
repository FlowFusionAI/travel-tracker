// lib/mindmap/transforms.ts
import type { MindMapNode, MindMapEdge, MindMapNodeData, EdgeData, SavedSnapshot, LinkItem, ChecklistItem } from '@/lib/types/mindmap'
import type { NodeType, EdgeStyle } from '@/lib/types/airtable'

// ── Airtable → React Flow ────────────────────────────────────────────────────

function parseJsonField<T>(raw: unknown, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

export function airtableRecordToNode(record: Record<string, unknown>): MindMapNode {
  const nodeType = (record['node type'] as NodeType | undefined) ?? 'note'
  return {
    id: record.id as string,
    type: nodeType,
    position: {
      x: (record['position X'] as number | undefined) ?? 0,
      y: (record['position Y'] as number | undefined) ?? 0,
    },
    data: {
      airtableId: record.id as string,
      title: (record.title as string | undefined) ?? '',
      nodeType,
      content: record.content as string | undefined,
      colour: record['colour/category'] as string | undefined,
      images: record.images as MindMapNodeData['images'],
      links: parseJsonField<LinkItem[]>(record.links, []),
      checklist: parseJsonField<ChecklistItem[]>(record.Checklist, []),
      dayNumber: record['Day Number'] as number | undefined,
      time: record.Time as string | undefined,
    },
  }
}

export function airtableRecordToEdge(record: Record<string, unknown>): MindMapEdge {
  const sourceArr = record['source node'] as string[] | undefined
  const targetArr = record['target node'] as string[] | undefined
  return {
    id: record.id as string,
    source: sourceArr?.[0] ?? '',
    target: targetArr?.[0] ?? '',
    label: (record.label as string | undefined) || undefined,
    data: {
      airtableId: record.id as string,
      style: record.Style as EdgeStyle | undefined,
      colour: record.Colour as string | undefined,
    },
  }
}

// ── React Flow → Airtable ────────────────────────────────────────────────────

export function nodeToAirtableFields(node: MindMapNode): Record<string, unknown> {
  return {
    title: node.data.title,
    'node type': node.data.nodeType,
    content: node.data.content ?? null,
    'position X': node.position.x,
    'position Y': node.position.y,
    'colour/category': node.data.colour ?? null,
    links: node.data.links?.length ? JSON.stringify(node.data.links) : null,
    Checklist: node.data.checklist?.length ? JSON.stringify(node.data.checklist) : null,
    'Day Number': node.data.dayNumber ?? null,
    Time: node.data.time ?? null,
    Width: (node.data as Record<string, unknown>).width ?? null,
    Height: (node.data as Record<string, unknown>).height ?? null,
  }
}

export function edgeToAirtableFields(edge: MindMapEdge, tripId: string): Record<string, unknown> {
  return {
    label: (edge.label as string | undefined) ?? null,
    'source node': [edge.source],
    'target node': [edge.target],
    trip: [tripId],
    Style: edge.data?.style ?? null,
    Colour: edge.data?.colour ?? null,
  }
}

// ── Snapshot + diff ──────────────────────────────────────────────────────────

function snapshotNode(node: MindMapNode): string {
  return JSON.stringify({ pos: node.position, data: node.data })
}

function snapshotEdge(edge: MindMapEdge): string {
  return JSON.stringify({ source: edge.source, target: edge.target, label: edge.label, data: edge.data })
}

export function buildInitialSnapshot(nodes: MindMapNode[], edges: MindMapEdge[]): SavedSnapshot {
  return {
    nodes: new Map(
      nodes
        .filter(n => n.data.airtableId)
        .map(n => [n.data.airtableId!, snapshotNode(n)])
    ),
    edges: new Map(
      edges
        .filter(e => e.data?.airtableId)
        .map(e => [e.data!.airtableId!, snapshotEdge(e)])
    ),
  }
}

export type NodeDiff = { created: MindMapNode[]; updated: MindMapNode[]; deleted: string[] }
export type EdgeDiff = { created: MindMapEdge[]; updated: MindMapEdge[]; deleted: string[] }

export function computeNodeDiff(snapshot: SavedSnapshot, current: MindMapNode[]): NodeDiff {
  const created: MindMapNode[] = []
  const updated: MindMapNode[] = []
  const deleted: string[] = []

  const seenIds = new Set<string>()

  for (const node of current) {
    if (!node.data.airtableId) {
      created.push(node)
    } else {
      seenIds.add(node.data.airtableId)
      const prev = snapshot.nodes.get(node.data.airtableId)
      if (prev === undefined || prev !== snapshotNode(node)) {
        updated.push(node)
      }
    }
  }

  for (const id of snapshot.nodes.keys()) {
    if (!seenIds.has(id)) deleted.push(id)
  }

  return { created, updated, deleted }
}

export function computeEdgeDiff(snapshot: SavedSnapshot, current: MindMapEdge[]): EdgeDiff {
  const created: MindMapEdge[] = []
  const updated: MindMapEdge[] = []
  const deleted: string[] = []

  const seenIds = new Set<string>()

  for (const edge of current) {
    if (!edge.data?.airtableId) {
      created.push(edge)
    } else {
      seenIds.add(edge.data.airtableId)
      const prev = snapshot.edges.get(edge.data.airtableId)
      if (prev === undefined || prev !== snapshotEdge(edge)) {
        updated.push(edge)
      }
    }
  }

  for (const id of snapshot.edges.keys()) {
    if (!seenIds.has(id)) deleted.push(id)
  }

  return { created, updated, deleted }
}
