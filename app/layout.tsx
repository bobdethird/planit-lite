import type { Metadata, Viewport } from "next"
import "./globals.css"
import { NavChrome } from "@/components/NavChrome"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
}

export const metadata: Metadata = {
  title: { default: "PlanIt", template: "%s · PlanIt" },
  description:
    "Drop a reel. AI analyzes the vibe, plans the event, texts your group via POKE iMessage, and books everyone's Google Calendar.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PlanIt",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <div className="mx-auto max-w-[430px] overflow-x-hidden pb-24">{children}</div>
        <NavChrome />
      </body>
    </html>
  )
}
