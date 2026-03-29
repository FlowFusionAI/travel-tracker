'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/map', label: 'MAP' },
  { href: '/trips', label: 'TRIPS' },
  { href: '/stats', label: 'STATS' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0A0F14]">
      {/* Floating pixel nav pill — absolute over the map */}
      <nav className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-0 pixel-panel">
        {/* Logo */}
        <span
          className="px-3 py-2 text-[9px] text-teal-400 border-r border-teal-900 hidden sm:block select-none"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          TRAVEL<span className="text-teal-800">_</span>LOG
        </span>

        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </nav>

      {/* Full-viewport content */}
      {children}
    </div>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`
        px-4 py-2 text-[9px] transition-colors border-r border-teal-900 last:border-r-0
        ${isActive
          ? 'bg-teal-900/60 text-teal-300'
          : 'text-slate-400 hover:text-teal-300 hover:bg-teal-950/50'
        }
      `}
      style={{ fontFamily: 'var(--font-pixel)' }}
    >
      {isActive ? '▶ ' : ''}{label}
    </Link>
  )
}
