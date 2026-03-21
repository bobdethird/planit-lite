"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/", icon: "home", label: "Home" },
  { href: "/events", icon: "event_note", label: "Events" },
]

export function NavChrome() {
  const pathname = usePathname()

  return (
    <>
      {/* ── Navigation Rail (desktop) ───────────────────────────────────── */}
      <nav className="md-nav-rail hidden md:flex" aria-label="Main navigation">
        <div className="md-nav-rail__logo" aria-hidden>VS</div>

        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`md-nav-rail__item md-state${active ? " md-nav-rail__item--active" : ""}`}
            >
              <div className="md-nav-rail__indicator">
                <span className="material-symbols-rounded" style={{ fontSize: 24 }}>{icon}</span>
              </div>
              <span className="md-nav-rail__label">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom Navigation Bar (mobile) ─────────────────────────────── */}
      <nav className="md-bottom-nav flex md:hidden" aria-label="Main navigation">
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`md-bottom-nav__item md-state${active ? " md-bottom-nav__item--active" : ""}`}
            >
              <div className="md-bottom-nav__indicator">
                <span className="material-symbols-rounded" style={{ fontSize: 24 }}>{icon}</span>
              </div>
              <span className="md-bottom-nav__label">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
