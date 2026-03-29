export default function MindMapPage() {
  return (
    <div className="h-full flex items-center justify-center bg-[#0a0f14] relative">
      {/* Dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle, #0d9488 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div
        className="relative z-10 pixel-panel px-10 py-8 text-center"
        style={{ maxWidth: 360 }}
      >
        {/* Pixel node-graph icon */}
        <div className="flex items-center justify-center gap-3 mb-6 text-teal-800 text-[10px]" style={{ fontFamily: 'var(--font-pixel)' }}>
          <span className="border border-teal-800 px-2 py-1">A</span>
          <span>──</span>
          <span className="border border-teal-800 px-2 py-1">B</span>
          <span>──</span>
          <span className="border border-teal-800 px-2 py-1">C</span>
        </div>

        <p
          className="text-[10px] text-teal-400 mb-3"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          MIND MAP CANVAS
        </p>
        <p
          className="text-[8px] text-slate-600 mb-4"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          COMING IN F3
        </p>
        <span
          className="text-teal-400 text-[12px]"
          style={{ fontFamily: 'var(--font-pixel)', animation: 'pixel-blink 1s step-end infinite' }}
        >
          █
        </span>
      </div>
    </div>
  )
}
