// components/mindmap/nodes/DayHeaderNode.tsx
'use client'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { MindMapNodeData } from '@/lib/types/mindmap'

export default function DayHeaderNode({ data, selected }: NodeProps<MindMapNodeData>) {
  return (
    <div
      className="relative bg-[#0a0f14]"
      style={{
        width: 400,
        height: 48,
        border: `2px solid ${selected ? '#2dd4bf' : '#2dd4bf'}`,
        boxShadow: selected ? '4px 4px 0 #2dd4bf' : '3px 3px 0 #2dd4bf44',
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-teal-500 !border-teal-600 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-teal-500 !border-teal-600 !w-2 !h-2" />

      <div className="flex items-center justify-center h-full px-4">
        <span
          className="text-[11px] text-teal-400 tracking-widest"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          {data.title || 'DAY'}
        </span>
      </div>
    </div>
  )
}
