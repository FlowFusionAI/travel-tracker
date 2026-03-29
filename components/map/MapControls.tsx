'use client'

import { useMap } from 'react-leaflet'

export default function MapControls() {
  const map = useMap()

  function zoomIn() {
    map.zoomIn()
  }

  function zoomOut() {
    map.zoomOut()
  }

  function locateMe() {
    map.locate({ setView: true, maxZoom: 6 })
    // Silently ignore location errors (browser may deny permission)
    map.once('locationerror', () => {})
  }

  return (
    <div className="absolute bottom-8 right-4 z-[1000] flex flex-col gap-1.5">
      <PixelBtn onClick={zoomIn} title="Zoom in">+</PixelBtn>
      <PixelBtn onClick={zoomOut} title="Zoom out">−</PixelBtn>
      <div className="h-px bg-teal-900 my-0.5" />
      <PixelBtn onClick={locateMe} title="My location">⊕</PixelBtn>
    </div>
  )
}

function PixelBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="
        w-9 h-9 flex items-center justify-center text-base
        bg-slate-950/90 text-teal-500
        border border-teal-800 hover:border-teal-400
        hover:bg-teal-950/80 hover:text-teal-200
        active:translate-x-[2px] active:translate-y-[2px]
        transition-all duration-100
      "
      style={{ boxShadow: '2px 2px 0 0 #0D9488' }}
    >
      {children}
    </button>
  )
}
