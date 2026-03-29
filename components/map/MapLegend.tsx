'use client'

const LEGEND_ITEMS = [
  {
    label: 'VISITED',
    bgColor: '#0F766E',
    borderColor: '#0D9488',
    dashed: false,
  },
  {
    label: 'PLANNED',
    bgColor: '#78350F',
    borderColor: '#D97706',
    dashed: false,
    stripe: true,
  },
  {
    label: 'WISHLIST',
    bgColor: 'transparent',
    borderColor: '#7C3AED',
    dashed: true,
  },
]

export default function MapLegend() {
  return (
    <div
      className="absolute bottom-8 left-4 z-[1000] px-3 py-2.5 pixel-panel"
      role="note"
      aria-label="Map legend"
    >
      <p
        className="text-[7px] text-slate-600 mb-2"
        style={{ fontFamily: 'var(--font-pixel)' }}
      >
        LEGEND
      </p>
      <ul className="space-y-2">
        {LEGEND_ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            {/* Colour swatch */}
            <div
              className="w-3.5 h-3.5 shrink-0 relative overflow-hidden"
              style={{
                background: item.bgColor,
                border: `2px ${item.dashed ? 'dashed' : 'solid'} ${item.borderColor}`,
                // Stripe overlay for planned
                backgroundImage: item.stripe
                  ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(217,119,6,0.5) 2px, rgba(217,119,6,0.5) 4px)'
                  : undefined,
              }}
            />
            <span
              className="text-[8px] text-slate-400"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
