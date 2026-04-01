// components/mindmap/SaveStatus.tsx
'use client'

export type SaveState = 'clean' | 'saving' | 'saved' | 'error'

interface SaveStatusProps {
  state: SaveState
  onRetry?: () => void
}

export default function SaveStatus({ state, onRetry }: SaveStatusProps) {
  if (state === 'clean') return null

  return (
    <div className="absolute top-3 right-3 z-30 pointer-events-none">
      {state === 'saving' && (
        <span
          className="text-[8px] text-slate-400 px-2 py-1 bg-[#0a0f14] border border-slate-700"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          SAVING
          <span style={{ animation: 'pixel-blink 1s step-end infinite' }}> █</span>
        </span>
      )}
      {state === 'saved' && (
        <span
          className="text-[8px] text-teal-400 px-2 py-1 bg-[#0a0f14] border border-teal-800 animate-fade-out"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          SAVED ✓
        </span>
      )}
      {state === 'error' && (
        <button
          className="pointer-events-auto text-[8px] text-red-400 px-2 py-1 bg-[#0a0f14] border border-red-800 hover:bg-red-900/20"
          style={{ fontFamily: 'var(--font-pixel)', boxShadow: '2px 2px 0 #991b1b' }}
          onClick={onRetry}
        >
          SAVE FAILED — CLICK TO RETRY
        </button>
      )}
    </div>
  )
}
