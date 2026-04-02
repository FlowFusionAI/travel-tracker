// components/mindmap/EdgePopover.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import type { EdgeStyle } from '@/lib/types/airtable'
import type { EdgeData } from '@/lib/types/mindmap'

const STYLE_OPTIONS: EdgeStyle[] = ['Solid', 'Dashed', 'Dotted']
const COLOUR_OPTIONS = [
  { label: 'Teal',  value: '#2dd4bf' },
  { label: 'Blue',  value: '#3b82f6' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Red',   value: '#ef4444' },
  { label: 'White', value: '#e2e8f0' },
]

interface EdgePopoverProps {
  x: number
  y: number
  edgeId: string
  initialData: EdgeData
  initialLabel: string
  onUpdate: (edgeId: string, label: string, data: EdgeData) => void
  onDelete: (edgeId: string) => void
  onClose: () => void
}

export default function EdgePopover({
  x, y, edgeId, initialData, initialLabel, onUpdate, onDelete, onClose,
}: EdgePopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState(initialLabel)
  const [style, setStyle] = useState<EdgeStyle>(initialData.style ?? 'Solid')
  const [colour, setColour] = useState(initialData.colour ?? '#2dd4bf')

  // Propagate changes immediately (optimistic)
  useEffect(() => {
    onUpdate(edgeId, label, { ...initialData, style, colour })
  }, [label, style, colour]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
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
      className="absolute z-50 bg-[#0a0f14] border-2 border-slate-700"
      style={{ left: x, top: y, width: 200, boxShadow: '4px 4px 0 #1e293b' }}
    >
      {/* Label */}
      <div className="p-2 border-b border-slate-800">
        <p className="text-[7px] text-slate-500 mb-1" style={{ fontFamily: 'var(--font-pixel)' }}>LABEL</p>
        <input
          className="w-full bg-[#0d1420] border border-slate-700 text-xs text-white px-2 py-1 outline-none focus:border-teal-600"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="optional label..."
        />
      </div>

      {/* Style */}
      <div className="p-2 border-b border-slate-800">
        <p className="text-[7px] text-slate-500 mb-1" style={{ fontFamily: 'var(--font-pixel)' }}>STYLE</p>
        <div className="flex gap-1">
          {STYLE_OPTIONS.map(s => (
            <button
              key={s}
              className={`flex-1 text-[8px] py-1 border transition-colors ${
                style === s
                  ? 'border-teal-500 text-teal-400 bg-teal-900/30'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
              onClick={() => setStyle(s)}
            >
              {s.slice(0, 4)}
            </button>
          ))}
        </div>
      </div>

      {/* Colour */}
      <div className="p-2 border-b border-slate-800">
        <p className="text-[7px] text-slate-500 mb-1" style={{ fontFamily: 'var(--font-pixel)' }}>COLOUR</p>
        <div className="flex gap-2">
          {COLOUR_OPTIONS.map(c => (
            <button
              key={c.value}
              className="w-5 h-5 border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c.value,
                borderColor: colour === c.value ? '#2dd4bf' : 'transparent',
              }}
              title={c.label}
              onClick={() => setColour(c.value)}
            />
          ))}
        </div>
      </div>

      {/* Delete */}
      <div className="p-2">
        <button
          className="w-full text-[8px] text-red-400 border border-red-900 py-1 hover:bg-red-900/20"
          style={{ fontFamily: 'var(--font-pixel)' }}
          onClick={() => { onDelete(edgeId); onClose() }}
        >
          🗑 DELETE
        </button>
      </div>
    </div>
  )
}
