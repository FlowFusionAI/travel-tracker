// lib/types/mindmap.ts
import type { Node, Edge } from '@xyflow/react'
import type { NodeType, EdgeStyle, AirtableAttachment } from '@/lib/types/airtable'

export interface LinkItem {
  url: string
  label: string
}

export interface ChecklistItem {
  text: string
  checked: boolean
}

// Data payload stored in each React Flow node.
// Must extend Record<string, unknown> — required by @xyflow/react v12.
export interface MindMapNodeData extends Record<string, unknown> {
  airtableId?: string        // undefined for new unsaved nodes
  title: string
  nodeType: NodeType
  content?: string
  colour?: string
  images?: AirtableAttachment[]
  links?: LinkItem[]
  checklist?: ChecklistItem[]
  dayNumber?: number
  time?: string
}

// Data payload stored in each React Flow edge.
export interface EdgeData extends Record<string, unknown> {
  airtableId?: string
  style?: EdgeStyle
  colour?: string
}

export type MindMapNode = Node<MindMapNodeData>
export type MindMapEdge = Edge<EdgeData>

// Snapshot of last-saved state, used to compute diffs before API calls.
export interface SavedSnapshot {
  nodes: Map<string, string>  // airtableId → JSON.stringify({ position, data })
  edges: Map<string, string>  // airtableId → JSON.stringify({ source, target, label, data })
}