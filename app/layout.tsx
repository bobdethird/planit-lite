import type { Metadata, Viewport } from "next"
import { Source_Serif_4, DM_Sans } from "next/font/google"
import "./globals.css"
import { NavChrome } from "@/components/NavChrome"

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  /* Keeps the layout viewport stable when the mobile browser chrome shows/hides (Safari). */
  interactiveWidget: "overlays-content",
  themeColor: "#FAF9F6",
}

export const metadata: Metadata = {
  title: { default: "PlanIt", template: "%s · PlanIt" },
  description:
    "Drop a reel. AI analyzes the vibe, plans the event, texts your group via POKE iMessage, and books everyone's Google Calendar.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-512.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PlanIt",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSerif.variable} ${dmSans.variable}`}>
      <body className="overflow-x-hidden">
        <div className="mx-auto max-w-[430px] overflow-x-hidden">{children}</div>
        <NavChrome />
      </body>
    </html>
  )
}
