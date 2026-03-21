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
      className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-[#E7E5E4] bg-white/80 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active =
          pathname === href || (href !== "/" && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
              active ? "text-[#1C1917]" : "text-[#A8A29E]"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[11px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
