// components/mindmap/MindMapCanvas.tsx
'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodesChange,
  type OnEdgesChange,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { nodeTypes } from './nodes'
import TypePicker from './TypePicker'
import NodeEditPanel from './NodeEditPanel'
import EdgePopover from './EdgePopover'
import SaveStatus, { type SaveState } from './SaveStatus'
import {
  nodeToAirtableFields,
  edgeToAirtableFields,
  computeNodeDiff,
  computeEdgeDiff,
  buildInitialSnapshot,
} from '@/lib/mindmap/transforms'
import type { MindMapNode, MindMapEdge, MindMapNodeData, EdgeData, SavedSnapshot } from '@/lib/types/mindmap'
import type { NodeType } from '@/lib/types/airtable'

interface MindMapCanvasProps {
  tripId: string
  initialNodes: MindMapNode[]
  initialEdges: MindMapEdge[]
}

type TypePickerState = {
  x: number       // canvas-relative pixel position for the picker UI
  y: number
  flowX: number   // flow coordinate for new node placement
  flowY: number
  sourceNodeId?: string  // set when opened via "+" button
}

type EdgePopoverState = {
  x: number
  y: number
  edgeId: string
}

export default function MindMapCanvas({ tripId, initialNodes, initialEdges }: MindMapCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<MindMapNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<MindMapEdge>(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [typePicker, setTypePicker] = useState<TypePickerState | null>(null)
  const [edgePopover, setEdgePopover] = useState<EdgePopoverState | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('clean')

  const snapshotRef = useRef<SavedSnapshot>(buildInitialSnapshot(initialNodes, initialEdges))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reactFlowRef = useRef<HTMLDivElement>(null)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)
  const doSaveCallbackRef = useRef<() => void>(() => {})
  // Prevent saves during React Flow's initial mount/fitView stabilisation
  const readyToSaveRef = useRef(false)
  // Refs always holding latest nodes/edges so doSave can read them without
  // going through setNodes(cb), which React Strict Mode calls twice.
  const nodesRef = useRef<MindMapNode[]>(initialNodes)
  const edgesRef = useRef<MindMapEdge[]>(initialEdges)

  // ── Auto-save ──────────────────────────────────────────────────────────────
  // IMPORTANT: performSave must be declared before doSave (closure ordering).

  const performSave = useCallback(async (currentNodes: MindMapNode[], currentEdges: MindMapEdge[]) => {
    try {
      const nodeDiff = computeNodeDiff(snapshotRef.current, currentNodes)
      const edgeDiff = computeEdgeDiff(snapshotRef.current, currentEdges)

      // Skip if nothing changed
      if (!nodeDiff.created.length && !nodeDiff.updated.length && !nodeDiff.deleted.length &&
          !edgeDiff.created.length && !edgeDiff.updated.length && !edgeDiff.deleted.length) {
        setSaveState('clean')
        return
      }

      console.log('[MindMap] save diff:', {
        nodes: { created: nodeDiff.created.map(n => n.id), updated: nodeDiff.updated.map(n => n.data.airtableId), deleted: nodeDiff.deleted },
        edges: { created: edgeDiff.created.map(e => e.id), updated: edgeDiff.updated.map(e => e.data?.airtableId), deleted: edgeDiff.deleted },
      })

      // Track new airtable IDs for temp node replacement
      const idMap = new Map<string, string>() // tempId → airtableId

      // 1. Create new nodes
      for (const node of nodeDiff.created) {
        const fields = { ...nodeToAirtableFields(node), trip: [tripId] }
        const res = await fetch('/api/airtable/Mind%20Map%20Nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
        if (!res.ok) {
          const body = await res.text()
          console.error('[MindMap] create node failed:', res.status, body, { nodeId: node.id, fields: Object.keys(fields) })
          throw new Error(`Failed to create node: ${res.status} — ${body}`)
        }
        const record = await res.json()
        idMap.set(node.id, record.id)
        snapshotRef.current.nodes.set(record.id, JSON.stringify({ pos: { x: node.position.x, y: node.position.y }, data: { ...node.data, airtableId: record.id } }))
      }

      // 2. Replace temp IDs in canvas
      if (idMap.size > 0) {
        setNodes(nds => nds.map(n => {
          if (!idMap.has(n.id)) return n
          const realId = idMap.get(n.id)!
          return { ...n, id: realId, data: { ...n.data, airtableId: realId } }
        }))
        setEdges(eds => eds.map(e => ({
          ...e,
          source: idMap.get(e.source) ?? e.source,
          target: idMap.get(e.target) ?? e.target,
        })))
      }

      // 3. Update changed nodes
      for (const node of nodeDiff.updated) {
        const res = await fetch('/api/airtable/Mind%20Map%20Nodes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: node.data.airtableId, ...nodeToAirtableFields(node) }),
        })
        if (!res.ok) {
          const body = await res.text()
          console.error('[MindMap] update node failed:', res.status, body, { airtableId: node.data.airtableId })
          throw new Error(`Failed to update node: ${res.status} — ${body}`)
        }
        snapshotRef.current.nodes.set(node.data.airtableId!, JSON.stringify({ pos: node.position, data: node.data }))
      }

      // 4. Delete removed nodes
      for (const id of nodeDiff.deleted) {
        await fetch(`/api/airtable/Mind%20Map%20Nodes?id=${id}`, { method: 'DELETE' })
        snapshotRef.current.nodes.delete(id)
      }

      // Resolve temp source/target in edges now that idMap is populated
      const resolvedEdges = currentEdges.map(e => ({
        ...e,
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
      }))

      // 5. Create new edges (after nodes resolved)
      for (const edge of edgeDiff.created) {
        const resolved = resolvedEdges.find(e => e.id === edge.id) ?? edge
        if (!resolved.source || !resolved.target) continue
        const fields = edgeToAirtableFields(resolved, tripId)
        const res = await fetch('/api/airtable/Node%20Connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
        if (!res.ok) {
          const body = await res.text()
          console.error('[MindMap] create edge failed:', res.status, body, { edgeId: edge.id, source: resolved.source, target: resolved.target })
          throw new Error(`Failed to create edge: ${res.status} — ${body}`)
        }
        const record = await res.json()
        snapshotRef.current.edges.set(record.id, JSON.stringify({ source: resolved.source, target: resolved.target, label: resolved.label, data: { ...resolved.data, airtableId: record.id } }))
        // Update edge with real airtable ID
        setEdges(eds => eds.map(e => e.id === edge.id ? { ...e, data: { ...e.data, airtableId: record.id } } : e))
      }

      // 6. Update changed edges
      for (const edge of edgeDiff.updated) {
        const res = await fetch('/api/airtable/Node%20Connections', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: edge.data!.airtableId, label: edge.label ?? null, Style: edge.data?.style ?? null, Colour: edge.data?.colour ?? null }),
        })
        if (!res.ok) {
          const body = await res.text()
          console.error('[MindMap] update edge failed:', res.status, body, { airtableId: edge.data?.airtableId })
          throw new Error(`Failed to update edge: ${res.status} — ${body}`)
        }
        snapshotRef.current.edges.set(edge.data!.airtableId!, JSON.stringify({ source: edge.source, target: edge.target, label: edge.label, data: edge.data }))
      }

      // 7. Delete removed edges
      for (const id of edgeDiff.deleted) {
        await fetch(`/api/airtable/Node%20Connections?id=${id}`, { method: 'DELETE' })
        snapshotRef.current.edges.delete(id)
      }

      setSaveState('saved')
      setTimeout(() => setSaveState('clean'), 2000)
    } catch (err) {
      console.error('[MindMap] performSave failed:', err)
      setSaveState('error')
    } finally {
      savingRef.current = false
      if (pendingRef.current) {
        pendingRef.current = false
        debounceRef.current = setTimeout(() => doSaveCallbackRef.current(), 100)
      }
    }
  }, [tripId, setNodes, setEdges])

  const doSave = useCallback(() => {
    if (savingRef.current) {
      pendingRef.current = true
      return
    }
    // Read from refs — always current, and avoids setNodes(cb) which React
    // Strict Mode calls twice (causing duplicate API calls).
    savingRef.current = true
    performSave(nodesRef.current, edgesRef.current)
  }, [performSave])

  const triggerSave = useCallback((reason?: string) => {
    if (!readyToSaveRef.current) return
    console.log('[MindMap] triggerSave:', reason ?? 'unknown')
    setSaveState('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(doSave, 500)
  }, [doSave])

  // Keep doSaveCallbackRef current so the pending-save re-trigger always calls
  // the latest version of doSave (avoids stale closure in the finally block).
  useEffect(() => {
    doSaveCallbackRef.current = doSave
  }, [doSave])

  // Block saves during React Flow's initial mount/fitView cycle (fires position
  // changes with dragging=false that look "meaningful" but aren't user actions).
  useEffect(() => {
    const t = setTimeout(() => { readyToSaveRef.current = true }, 800)
    return () => clearTimeout(t)
  }, [])

  // Keep refs in sync with state so doSave can read current nodes/edges
  // without using setNodes(cb), which React Strict Mode calls twice.
  useLayoutEffect(() => { nodesRef.current = nodes }, [nodes])
  useLayoutEffect(() => { edgesRef.current = edges }, [edges])

  // ── Node creation via TypePicker ───────────────────────────────────────────

  const createNode = useCallback((type: NodeType, flowX: number, flowY: number, sourceNodeId?: string) => {
    const id = `tmp_${crypto.randomUUID()}`
    const newNode: MindMapNode = {
      id,
      type,
      position: { x: flowX, y: flowY },
      data: { title: '', nodeType: type, links: [], checklist: [] },
    }
    setNodes(nds => [...nds, newNode])
    if (sourceNodeId) {
      const newEdge: MindMapEdge = {
        id: `tmp_${crypto.randomUUID()}`,
        source: sourceNodeId,
        target: id,
        data: {},
        markerEnd: { type: MarkerType.ArrowClosed, color: '#2dd4bf' },
      }
      setEdges(eds => [...eds, newEdge])
    }
    setSelectedNodeId(id)
    triggerSave('createNode')
  }, [setNodes, setEdges, triggerSave])

  // ── Right-click on canvas ──────────────────────────────────────────────────

  const onPaneContextMenu = useCallback((e: MouseEvent | React.MouseEvent) => {
    e.preventDefault()
    const bounds = reactFlowRef.current?.getBoundingClientRect()
    if (!bounds) return
    setTypePicker({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
      flowX: e.clientX - bounds.left,
      flowY: e.clientY - bounds.top,
    })
  }, [])

  // ── "+" button on node ─────────────────────────────────────────────────────

  const onNodeClick: NodeMouseHandler<MindMapNode> = useCallback((e, node) => {
    const plusBtn = (e.target as HTMLElement).closest('[data-plus-button="true"]')
    if (plusBtn) {
      e.stopPropagation()
      const bounds = reactFlowRef.current?.getBoundingClientRect()
      if (!bounds) return
      setTypePicker({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
        flowX: node.position.x + 250,
        flowY: node.position.y,
        sourceNodeId: node.id,
      })
      return
    }
    setSelectedNodeId(node.id)
  }, [])

  // ── Edge click ─────────────────────────────────────────────────────────────

  const onEdgeClick: EdgeMouseHandler<MindMapEdge> = useCallback((e, edge) => {
    const bounds = reactFlowRef.current?.getBoundingClientRect()
    if (!bounds) return
    setEdgePopover({ x: e.clientX - bounds.left, y: e.clientY - bounds.top, edgeId: edge.id })
  }, [])

  // ── Pane click (deselect) ──────────────────────────────────────────────────

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setTypePicker(null)
    setEdgePopover(null)
  }, [])

  // ── Connect via drag ───────────────────────────────────────────────────────

  const onConnect = useCallback((params: Connection) => {
    const newEdge: MindMapEdge = {
      ...params,
      id: `tmp_${crypto.randomUUID()}`,
      data: {},
      markerEnd: { type: MarkerType.ArrowClosed, color: '#2dd4bf' },
    }
    setEdges(eds => addEdge(newEdge, eds))
    triggerSave('onConnect')
  }, [setEdges, triggerSave])

  // ── Changes with auto-save ─────────────────────────────────────────────────

  const handleNodesChange: OnNodesChange<MindMapNode> = useCallback((changes) => {
    onNodesChange(changes)
    const meaningful = changes.some(c => {
      if (c.type === 'select' || c.type === 'dimensions') return false
      // Skip in-flight drag position updates — onNodeDragStop fires when drag ends
      if (c.type === 'position' && 'dragging' in c && c.dragging) return false
      return true
    })
    if (meaningful) triggerSave('nodesChange')
  }, [onNodesChange, triggerSave])

  const handleEdgesChange: OnEdgesChange<MindMapEdge> = useCallback((changes) => {
    onEdgesChange(changes)
    const meaningful = changes.some(c => c.type !== 'select')
    if (meaningful) triggerSave('edgesChange')
  }, [onEdgesChange, triggerSave])

  // ── Node data update (from panel) ──────────────────────────────────────────

  const onUpdateNodeData = useCallback((nodeId: string, partial: Partial<MindMapNodeData>) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...partial } } : n))
    triggerSave('updateNodeData')
  }, [setNodes, triggerSave])

  // ── Edge update (from popover) ─────────────────────────────────────────────

  const onUpdateEdge = useCallback((edgeId: string, label: string, data: EdgeData) => {
    setEdges(eds => eds.map(e => e.id === edgeId ? { ...e, label, data } : e))
    triggerSave('updateEdge')
  }, [setEdges, triggerSave])

  // ── Node drag end ──────────────────────────────────────────────────────────

  const onNodeDragStop = useCallback(() => {
    triggerSave('dragStop')
  }, [triggerSave])

  // ── Delete node ────────────────────────────────────────────────────────────

  const onDeleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId))
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
    triggerSave('deleteNode')
  }, [setNodes, setEdges, triggerSave])

  // ── Delete edge ────────────────────────────────────────────────────────────

  const onDeleteEdge = useCallback((edgeId: string) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId))
    triggerSave('deleteEdge')
  }, [setEdges, triggerSave])

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) ?? null : null

  return (
    <div className="relative flex h-full w-full" ref={reactFlowRef}>
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onPaneContextMenu={onPaneContextMenu}
          onNodeDragStop={onNodeDragStop}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
          className="bg-[#0a0f14]"
          defaultEdgeOptions={{
            style: { stroke: '#2dd4bf', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#2dd4bf' },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#0d9488"
            style={{ opacity: 0.2 }}
          />
          <MiniMap
            style={{ background: '#0a0f14', border: '1px solid #0d9488' }}
            nodeColor={n => {
              const colorMap: Record<string, string> = {
                activity: '#3b82f6', place: '#22c55e', food: '#f97316',
                transport: '#6b7280', accommodation: '#a855f7',
                note: '#eab308', 'day-header': '#2dd4bf', thought: '#e2e8f0',
              }
              return colorMap[n.type ?? 'note'] ?? '#6b7280'
            }}
          />
          <Controls className="[&>button]:bg-[#0a0f14] [&>button]:border-slate-700 [&>button]:text-slate-300" />
        </ReactFlow>

        <SaveStatus state={saveState} onRetry={doSave} />

        {typePicker && (
          <TypePicker
            x={typePicker.x}
            y={typePicker.y}
            onSelect={type => {
              createNode(type, typePicker.flowX, typePicker.flowY, typePicker.sourceNodeId)
              setTypePicker(null)
            }}
            onClose={() => setTypePicker(null)}
          />
        )}

        {edgePopover && (() => {
          const edge = edges.find(e => e.id === edgePopover.edgeId)
          if (!edge) return null
          return (
            <EdgePopover
              x={edgePopover.x}
              y={edgePopover.y}
              edgeId={edge.id}
              initialData={edge.data ?? {}}
              initialLabel={(edge.label as string) ?? ''}
              onUpdate={onUpdateEdge}
              onDelete={onDeleteEdge}
              onClose={() => setEdgePopover(null)}
            />
          )
        })()}
      </div>

      {/* Edit panel */}
      <div
        className="flex-shrink-0 transition-all duration-200 overflow-hidden"
        style={{ width: selectedNode ? 360 : 0 }}
      >
        {selectedNode && (
          <NodeEditPanel
            node={selectedNode}
            onUpdate={onUpdateNodeData}
            onDelete={onDeleteNode}
            onClose={() => setSelectedNodeId(null)}
            tripId={tripId}
          />
        )}
      </div>
    </div>
  )
}
