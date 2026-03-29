"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/events", icon: CalendarDays, label: "Events" },
]

export function NavChrome() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-[#FAF9F6] [transform:translateZ(0)] [backface-visibility:hidden]"
      style={{
        borderTop: "1px solid rgba(0,0,0,0.06)",
        /* Home-indicator band only; tab row sits directly above it (no extra flex gap). */
        paddingBottom: "var(--planit-sab)",
      }}
      aria-label="Main navigation"
    >
      <div className="flex h-[var(--planit-nav-tab-height)] min-h-[44px] w-full flex-row items-stretch">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-full min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-[#E8713A]" : "text-[#888]"
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
