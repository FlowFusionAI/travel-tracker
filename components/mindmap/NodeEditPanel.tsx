// components/mindmap/NodeEditPanel.tsx
'use client'
import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import type { NodeType } from '@/lib/types/airtable'
import type { MindMapNodeData, MindMapNode, LinkItem, ChecklistItem } from '@/lib/types/mindmap'

const NODE_META: Record<NodeType, { icon: string; label: string; color: string }> = {
  activity:      { icon: '⚡', label: 'Activity',      color: '#3b82f6' },
  place:         { icon: '📍', label: 'Place',         color: '#22c55e' },
  food:          { icon: '🍴', label: 'Food',          color: '#f97316' },
  transport:     { icon: '➡', label: 'Transport',     color: '#6b7280' },
  accommodation: { icon: '🛏', label: 'Accommodation', color: '#a855f7' },
  note:          { icon: '📝', label: 'Note',          color: '#eab308' },
  'day-header':  { icon: '📅', label: 'Day Header',    color: '#2dd4bf' },
  thought:       { icon: '💭', label: 'Thought',       color: '#e2e8f0' },
}

interface NodeEditPanelProps {
  node: MindMapNode
  onUpdate: (nodeId: string, data: Partial<MindMapNodeData>) => void
  onDelete: (nodeId: string) => void
  onClose: () => void
  tripId: string
}

export default function NodeEditPanel({ node, onUpdate, onDelete, onClose, tripId }: NodeEditPanelProps) {
  const { data } = node
  const meta = NODE_META[data.nodeType] ?? NODE_META.note
  const [editingContent, setEditingContent] = useState(false)
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newCheckItem, setNewCheckItem] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function update(partial: Partial<MindMapNodeData>) {
    onUpdate(node.id, partial)
  }

  // ── Checklist ──────────────────────────────────────────────────────────────

  function toggleCheck(i: number) {
    const updated = (data.checklist ?? []).map((item, idx) =>
      idx === i ? { ...item, checked: !item.checked } : item
    )
    update({ checklist: updated })
  }

  function addCheckItem() {
    if (!newCheckItem.trim()) return
    update({ checklist: [...(data.checklist ?? []), { text: newCheckItem.trim(), checked: false }] })
    setNewCheckItem('')
  }

  function removeCheckItem(i: number) {
    update({ checklist: (data.checklist ?? []).filter((_, idx) => idx !== i) })
  }

  // ── Links ──────────────────────────────────────────────────────────────────

  function addLink() {
    if (!newLinkUrl.trim()) return
    const link: LinkItem = { url: newLinkUrl.trim(), label: newLinkLabel.trim() || newLinkUrl.trim() }
    update({ links: [...(data.links ?? []), link] })
    setNewLinkUrl('')
    setNewLinkLabel('')
  }

  function removeLink(i: number) {
    update({ links: (data.links ?? []).filter((_, idx) => idx !== i) })
  }

  // ── Image upload ───────────────────────────────────────────────────────────

  async function handleImageFile(file: File) {
    if (!node.data.airtableId) return  // can't upload to unsaved node
    setUploadingImage(true)
    try {
      const { default: imageCompression } = await import('browser-image-compression')
      const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1024, useWebWorker: true })
      const formData = new FormData()
      formData.append('file', compressed)
      const res = await fetch(
        `/api/airtable/upload?recordId=${node.data.airtableId}&table=Mind%20Map%20Nodes&field=images`,
        { method: 'POST', body: formData }
      )
      if (!res.ok) throw new Error('Upload failed')
      // Images are read via /api/images on next load — trigger refetch by re-selecting node
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <div
      className="h-full flex flex-col bg-[#0a0f14] border-l-2 border-slate-800 overflow-y-auto"
      style={{ width: 360, minWidth: 360 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b-2 flex-shrink-0"
        style={{ borderColor: meta.color }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{meta.icon}</span>
          <span
            className="text-[8px]"
            style={{ fontFamily: 'var(--font-pixel)', color: meta.color }}
          >
            {meta.label.toUpperCase()}
          </span>
        </div>
        <button
          className="text-slate-500 hover:text-white text-lg leading-none"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="px-3 py-3 border-b border-slate-800">
          <p className="text-[7px] text-slate-500 mb-1" style={{ fontFamily: 'var(--font-pixel)' }}>TITLE</p>
          <input
            className="w-full bg-[#0d1420] border border-slate-700 text-sm text-white px-2 py-1.5 outline-none focus:border-teal-600"
            value={data.title}
            onChange={e => update({ title: e.target.value })}
            placeholder="Node title..."
          />
        </div>

        {/* Content / Markdown */}
        <div className="px-3 py-3 border-b border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[7px] text-slate-500" style={{ fontFamily: 'var(--font-pixel)' }}>CONTENT</p>
            <button
              className="text-[7px] px-2 py-0.5 border border-teal-800 text-teal-400 hover:bg-teal-900/30"
              style={{ fontFamily: 'var(--font-pixel)' }}
              onClick={() => setEditingContent(v => !v)}
            >
              {editingContent ? '✓ DONE' : '✏ EDIT'}
            </button>
          </div>

          {/* Preview always visible */}
          <div className="prose prose-invert prose-sm max-w-none text-slate-300 text-xs min-h-[40px] bg-[#0d1420] border border-slate-800 px-2 py-1.5">
            {data.content
              ? <ReactMarkdown>{data.content}</ReactMarkdown>
              : <span className="text-slate-600 italic text-xs">No content yet.</span>
            }
          </div>

          {/* Editor slides open */}
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: editingContent ? 300 : 0 }}
          >
            <div className="flex gap-1 mt-1" style={{ height: 200 }}>
              <textarea
                className="flex-1 bg-[#0d1420] border border-slate-700 text-xs text-white p-2 resize-none outline-none focus:border-teal-600 font-mono"
                value={data.content ?? ''}
                onChange={e => update({ content: e.target.value })}
                placeholder="Markdown here..."
              />
              <div className="flex-1 bg-[#060a0e] border border-slate-800 p-2 overflow-y-auto prose prose-invert prose-xs max-w-none text-xs">
                <ReactMarkdown>{data.content ?? ''}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="px-3 py-3 border-b border-slate-800">
          <p className="text-[7px] text-slate-500 mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>IMAGES</p>
          <div className="flex flex-wrap gap-2">
            {(data.images ?? []).map(img => (
              <div key={img.id} className="relative w-14 h-14 border border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/images?recordId=${node.data.airtableId}&table=Mind%20Map%20Nodes&field=images`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            <button
              className="w-14 h-14 border border-dashed border-slate-700 text-slate-500 hover:border-teal-600 hover:text-teal-400 flex items-center justify-center text-xl"
              disabled={uploadingImage || !node.data.airtableId}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingImage ? '…' : '+'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])}
            />
          </div>
          {!node.data.airtableId && (
            <p className="text-[8px] text-slate-600 mt-1">Save node before adding images.</p>
          )}
        </div>

        {/* Links */}
        <div className="px-3 py-3 border-b border-slate-800">
          <p className="text-[7px] text-slate-500 mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>LINKS</p>
          {(data.links ?? []).map((link, i) => (
            <div key={i} className="flex items-center gap-1 mb-1">
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-[10px] text-teal-400 truncate hover:underline">
                {link.label}
              </a>
              <button className="text-slate-600 hover:text-red-400 text-xs" onClick={() => removeLink(i)}>✕</button>
            </div>
          ))}
          <div className="flex gap-1 mt-1">
            <input
              className="flex-1 bg-[#0d1420] border border-slate-700 text-xs text-white px-1.5 py-1 outline-none focus:border-teal-600"
              placeholder="https://..."
              value={newLinkUrl}
              onChange={e => setNewLinkUrl(e.target.value)}
            />
            <input
              className="w-20 bg-[#0d1420] border border-slate-700 text-xs text-white px-1.5 py-1 outline-none focus:border-teal-600"
              placeholder="label"
              value={newLinkLabel}
              onChange={e => setNewLinkLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLink()}
            />
            <button
              className="text-[8px] px-2 border border-teal-800 text-teal-400 hover:bg-teal-900/30"
              onClick={addLink}
            >
              +
            </button>
          </div>
        </div>

        {/* Checklist */}
        <div className="px-3 py-3 border-b border-slate-800">
          <p className="text-[7px] text-slate-500 mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>CHECKLIST</p>
          {(data.checklist ?? []).map((item, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleCheck(i)}
                className="accent-teal-500 w-3 h-3"
              />
              <span className={`flex-1 text-xs ${item.checked ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                {item.text}
              </span>
              <button className="text-slate-600 hover:text-red-400 text-xs" onClick={() => removeCheckItem(i)}>✕</button>
            </div>
          ))}
          <div className="flex gap-1 mt-1">
            <input
              className="flex-1 bg-[#0d1420] border border-slate-700 text-xs text-white px-1.5 py-1 outline-none focus:border-teal-600"
              placeholder="Add item..."
              value={newCheckItem}
              onChange={e => setNewCheckItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCheckItem()}
            />
            <button
              className="text-[8px] px-2 border border-teal-800 text-teal-400 hover:bg-teal-900/30"
              onClick={addCheckItem}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Delete */}
      <div className="px-3 py-3 flex-shrink-0 border-t border-slate-800">
        <button
          className="w-full text-[8px] text-red-400 border border-red-900 py-2 hover:bg-red-900/20"
          style={{ fontFamily: 'var(--font-pixel)' }}
          onClick={() => { onDelete(node.id); onClose() }}
        >
          🗑 DELETE NODE
        </button>
      </div>
    </div>
  )
}
