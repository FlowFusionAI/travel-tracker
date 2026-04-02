// components/mindmap/TypePicker.tsx
'use client'
import { useEffect, useRef } from 'react'
import type { NodeType } from '@/lib/types/airtable'

const NODE_OPTIONS: { type: NodeType; label: string; icon: string; color: string }[] = [
  { type: 'activity',      label: 'Activity',      icon: '⚡', color: '#3b82f6' },
  { type: 'place',         label: 'Place',         icon: '📍', color: '#22c55e' },
  { type: 'food',          label: 'Food',          icon: '🍴', color: '#f97316' },
  { type: 'transport',     label: 'Transport',     icon: '➡', color: '#6b7280' },
  { type: 'accommodation', label: 'Accommodation', icon: '🛏', color: '#a855f7' },
  { type: 'note',          label: 'Note',          icon: '📝', color: '#eab308' },
  { type: 'day-header',    label: 'Day Header',    icon: '📅', color: '#2dd4bf' },
  { type: 'thought',       label: 'Thought',       icon: '💭', color: '#e2e8f0' },
]

interface TypePickerProps {
  x: number
  y: number
  onSelect: (type: NodeType) => void
  onClose: () => void
}

export default function TypePicker({ x, y, onSelect, onClose }: TypePickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-[#0a0f14] border-2 border-teal-800"
      style={{
        left: x,
        top: y,
        boxShadow: '4px 4px 0 #0d9488',
        minWidth: 160,
      }}
    >
      <div
        className="text-[8px] text-teal-600 px-2 py-1 border-b border-teal-900"
        style={{ fontFamily: 'var(--font-pixel)' }}
      >
        ADD NODE
      </div>
      {NODE_OPTIONS.map(opt => (
        <button
          key={opt.type}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-teal-900/30 transition-colors"
          onMouseDown={e => {
            e.stopPropagation()
            onSelect(opt.type)
          }}
        >
          <span className="text-sm w-5 text-center">{opt.icon}</span>
          <span className="text-[10px] text-slate-300">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
