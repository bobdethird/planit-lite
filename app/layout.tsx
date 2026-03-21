import { Roboto, Geist_Mono } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { NavChrome } from "@/components/NavChrome"

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: { default: "VibeSync", template: "%s · VibeSync" },
  description: "Drop a reel. Gemini reads the vibe, plans the event, your group votes on iMessage, and everyone's calendar gets booked.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${roboto.variable} ${fontMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "Roboto, sans-serif" }}>
        <ThemeProvider>
          {/* Navigation Rail — desktop only */}
          <NavChrome />

          {/* Content — offset right on desktop, pad bottom on mobile */}
          <div className="md-layout-rail hidden md:block" aria-hidden />
          <div className="md:ml-20 md-layout-bottom-pad md:pb-0">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
