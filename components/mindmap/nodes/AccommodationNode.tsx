// components/mindmap/nodes/AccommodationNode.tsx
'use client'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { MindMapNodeData } from '@/lib/types/mindmap'

export default function AccommodationNode({ data, selected }: NodeProps<MindMapNodeData>) {
  const borderColor = '#a855f7'
  const preview = getPreview(data)

  return (
    <div
      className="group relative bg-[#0a0f14] text-white"
      style={{
        width: 200,
        border: `2px solid ${selected ? '#2dd4bf' : borderColor}`,
        boxShadow: selected
          ? `4px 4px 0 #2dd4bf`
          : `3px 3px 0 ${borderColor}44`,
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !border-slate-600 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-slate-500 !border-slate-600 !w-2 !h-2" />

      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[#a855f7]/30">
        <span className="text-sm">🛏</span>
        <span
          className="text-[9px] text-[#a855f7] truncate"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          ACCOMMODATION
        </span>
      </div>

      <div className="px-2 py-1.5">
        <p className="text-xs text-white font-medium truncate leading-tight">
          {data.title || '(untitled)'}
        </p>
        {preview && (
          <p className="text-[10px] text-slate-500 truncate mt-0.5">{preview}</p>
        )}
      </div>

      <button
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 nodrag nopan"
        style={{ lineHeight: 1 }}
        onMouseDown={e => e.stopPropagation()}
        data-plus-button="true"
      >
        +
      </button>
    </div>
  )
}

function getPreview(data: MindMapNodeData): string | null {
  if (data.content) return data.content.split('\n')[0].replace(/^#+\s*/, '').slice(0, 40)
  if (data.checklist?.length) {
    const done = data.checklist.filter(i => i.checked).length
    return `${done}/${data.checklist.length} ✓`
  }
  return null
}
