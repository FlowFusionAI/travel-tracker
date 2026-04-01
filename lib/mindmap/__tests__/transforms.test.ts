// lib/mindmap/__tests__/transforms.test.ts
import { describe, it, expect } from 'vitest'
import {
  airtableRecordToNode,
  airtableRecordToEdge,
  nodeToAirtableFields,
  edgeToAirtableFields,
  computeNodeDiff,
  computeEdgeDiff,
  buildInitialSnapshot,
} from '../transforms'
import type { MindMapNode, MindMapEdge } from '@/lib/types/mindmap'

// ── airtableRecordToNode ─────────────────────────────────────────────────────

describe('airtableRecordToNode', () => {
  it('maps all fields correctly', () => {
    const record = {
      id: 'recABC',
      title: 'Book hotel',
      'node type': 'accommodation',
      content: '# Notes',
      'position X': 100,
      'position Y': 200,
      'colour/category': '#a855f7',
      Width: 200,
      Height: 80,
      'Day Number': 1,
      Time: '14:00',
      links: '[{"url":"https://example.com","label":"Booking"}]',
      Checklist: '[{"text":"Check in","checked":false}]',
    }

    const node = airtableRecordToNode(record)

    expect(node.id).toBe('recABC')
    expect(node.type).toBe('accommodation')
    expect(node.position).toEqual({ x: 100, y: 200 })
    expect(node.data.airtableId).toBe('recABC')
    expect(node.data.title).toBe('Book hotel')
    expect(node.data.nodeType).toBe('accommodation')
    expect(node.data.content).toBe('# Notes')
    expect(node.data.colour).toBe('#a855f7')
    expect(node.data.links).toEqual([{ url: 'https://example.com', label: 'Booking' }])
    expect(node.data.checklist).toEqual([{ text: 'Check in', checked: false }])
    expect(node.data.dayNumber).toBe(1)
    expect(node.data.time).toBe('14:00')
  })

  it('defaults missing fields gracefully', () => {
    const node = airtableRecordToNode({ id: 'recXYZ', title: 'Simple' })
    expect(node.type).toBe('note')
    expect(node.position).toEqual({ x: 0, y: 0 })
    expect(node.data.links).toEqual([])
    expect(node.data.checklist).toEqual([])
  })

  it('returns empty arrays for invalid JSON in links/checklist', () => {
    const node = airtableRecordToNode({ id: 'recXYZ', title: 'X', links: 'not json', Checklist: 'bad' })
    expect(node.data.links).toEqual([])
    expect(node.data.checklist).toEqual([])
  })
})

// ── airtableRecordToEdge ─────────────────────────────────────────────────────

describe('airtableRecordToEdge', () => {
  it('maps all fields correctly', () => {
    const record = {
      id: 'recEDGE',
      label: 'leads to',
      'source node': ['recA'],
      'target node': ['recB'],
      Style: 'Dashed',
      Colour: '#3b82f6',
    }

    const edge = airtableRecordToEdge(record)

    expect(edge.id).toBe('recEDGE')
    expect(edge.source).toBe('recA')
    expect(edge.target).toBe('recB')
    expect(edge.label).toBe('leads to')
    expect(edge.data?.airtableId).toBe('recEDGE')
    expect(edge.data?.style).toBe('Dashed')
    expect(edge.data?.colour).toBe('#3b82f6')
  })

  it('defaults missing source/target to empty string', () => {
    const edge = airtableRecordToEdge({ id: 'recE', label: '' })
    expect(edge.source).toBe('')
    expect(edge.target).toBe('')
  })
})

// ── nodeToAirtableFields ─────────────────────────────────────────────────────

describe('nodeToAirtableFields', () => {
  it('serialises links and checklist as JSON strings', () => {
    const node: MindMapNode = {
      id: 'recABC',
      type: 'activity',
      position: { x: 50, y: 75 },
      data: {
        airtableId: 'recABC',
        title: 'Hike',
        nodeType: 'activity',
        links: [{ url: 'https://trail.com', label: 'Trail map' }],
        checklist: [{ text: 'Bring water', checked: true }],
      },
    }

    const fields = nodeToAirtableFields(node)

    expect(fields.title).toBe('Hike')
    expect(fields['node type']).toBe('activity')
    expect(fields['position X']).toBe(50)
    expect(fields['position Y']).toBe(75)
    expect(fields.links).toBe('[{"url":"https://trail.com","label":"Trail map"}]')
    expect(fields.Checklist).toBe('[{"text":"Bring water","checked":true}]')
  })
})

// ── edgeToAirtableFields ─────────────────────────────────────────────────────

describe('edgeToAirtableFields', () => {
  it('sets source node, target node, and trip as linked record arrays', () => {
    const edge: MindMapEdge = {
      id: 'recE',
      source: 'recA',
      target: 'recB',
      label: 'next',
      data: { airtableId: 'recE', style: 'Solid', colour: '#2dd4bf' },
    }

    const fields = edgeToAirtableFields(edge, 'recTRIP1')

    expect(fields['source node']).toEqual(['recA'])
    expect(fields['target node']).toEqual(['recB'])
    expect(fields.trip).toEqual(['recTRIP1'])
    expect(fields.label).toBe('next')
    expect(fields.Style).toBe('Solid')
    expect(fields.Colour).toBe('#2dd4bf')
  })
})

// ── computeNodeDiff ──────────────────────────────────────────────────────────

describe('computeNodeDiff', () => {
  const makeNode = (id: string, title: string, x = 0): MindMapNode => ({
    id,
    type: 'note',
    position: { x, y: 0 },
    data: { airtableId: id.startsWith('tmp_') ? undefined : id, title, nodeType: 'note' },
  })

  it('identifies new nodes (no airtableId)', () => {
    const saved = buildInitialSnapshot([makeNode('rec1', 'A')], [])
    const current = [makeNode('rec1', 'A'), { ...makeNode('tmp_new', 'B'), data: { ...makeNode('tmp_new', 'B').data, airtableId: undefined } }]
    const diff = computeNodeDiff(saved, current)
    expect(diff.created).toHaveLength(1)
    expect(diff.created[0].id).toBe('tmp_new')
    expect(diff.updated).toHaveLength(0)
    expect(diff.deleted).toHaveLength(0)
  })

  it('identifies updated nodes (position changed)', () => {
    const saved = buildInitialSnapshot([makeNode('rec1', 'A', 0)], [])
    const current = [makeNode('rec1', 'A', 99)]
    const diff = computeNodeDiff(saved, current)
    expect(diff.updated).toHaveLength(1)
    expect(diff.created).toHaveLength(0)
    expect(diff.deleted).toHaveLength(0)
  })

  it('identifies deleted nodes', () => {
    const saved = buildInitialSnapshot([makeNode('rec1', 'A'), makeNode('rec2', 'B')], [])
    const current = [makeNode('rec1', 'A')]
    const diff = computeNodeDiff(saved, current)
    expect(diff.deleted).toEqual(['rec2'])
  })
})

// ── computeEdgeDiff ──────────────────────────────────────────────────────────

describe('computeEdgeDiff', () => {
  const makeEdge = (id: string, label = ''): MindMapEdge => ({
    id,
    source: 'recA',
    target: 'recB',
    label,
    data: { airtableId: id.startsWith('tmp_') ? undefined : id },
  })

  it('identifies new, updated, and deleted edges', () => {
    const saved = buildInitialSnapshot([], [makeEdge('recE1', 'old')])
    const current = [makeEdge('recE1', 'new'), { ...makeEdge('tmp_e2'), data: { airtableId: undefined } }]
    const diff = computeEdgeDiff(saved, current)
    expect(diff.created).toHaveLength(1)
    expect(diff.updated).toHaveLength(1)
    expect(diff.deleted).toHaveLength(0)
  })
})
